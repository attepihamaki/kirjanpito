import Papa from "papaparse"

import {
  DEFAULT_CATEGORY_FOR_ACCOUNT,
  DEFAULT_EN_NAMES,
  FORMER_ACCOUNTS,
  FORMER_NAMES,
  ALL_LINES,
  LINE_BY_KEY,
  categoryName,
  type AccountLine,
} from "@/lib/domain/accounts"
import {
  CSV_HEADER,
  columnName,
  csvHeaderLine,
  type CsvColumn,
} from "@/lib/domain/csv-header"
import { isShare } from "@/lib/domain/calc"
import { isPeriod } from "@/lib/domain/accrual"
import { parseCsvDate, yearOf } from "@/lib/domain/dates"
import { canBeEuPurchase, isEuSaleKind } from "@/lib/domain/accounts"
import { canBeUnpaid } from "@/lib/domain/open-items"
import { billIban, billReference } from "@/lib/domain/bill-payment"
import { uid } from "@/lib/domain/id"
import {
  formatAmountForCsv,
  isVatRate,
  parseAmount,
  parseRate,
} from "@/lib/domain/money"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import {
  parseReversalKey,
  reversalKey,
  reversalLoops,
} from "@/lib/domain/reversal"
import { isVoucherNumber } from "@/lib/domain/voucher"
import {
  attachmentKey,
  buildReceiptPaths,
  isReceiptPath,
} from "@/lib/domain/receipt-path"
import {
  type AmountMode,
  type Category,
  type CategoryMap,
  type Entry,
  type EntryType,
  type EuPurchase,
  type Lang,
} from "@/lib/domain/types"

/**
 * The column names live in `csv-header.ts`, which has no dependencies, so the
 * landing page and the import command can name them without pulling papaparse
 * into their bundles. This module is the only place the *values* appear.
 */
export { CSV_HEADER, csvHeaderLine }

const REQUIRED = ["date", "type", "amount"] as const

const KNOWN_COLUMNS: ReadonlySet<string> = new Set(CSV_HEADER)

/*
 * The words in a cell follow the book's export language (§7.1), so each map
 * below writes one language and reads both: a file in either language has to
 * open the same way. The number formats never follow the language — the
 * decimal comma, the ";" delimiter and the ISO date are what let the file
 * open in a European Excel, and they are the same in both.
 */

/** Entry type ⇄ the `type` column. */
const TYPE_TO_CSV: Readonly<Record<Lang, Record<EntryType, string>>> = {
  fi: { income: "tulo", expense: "kulu" },
  en: { income: "income", expense: "expense" },
}
/*
 * The readers below take a word straight from the file, so they are Maps: on a
 * plain object, "constructor" would find a prototype property and pass as a value.
 */
const TYPE_FROM_CSV: ReadonlyMap<string, EntryType> = new Map([
  ["tulo", "income"],
  ["kulu", "expense"],
  ["income", "income"],
  ["expense", "expense"],
])

/** An EU purchase ⇄ the `eu_purchase` column. */
const EU_PURCHASE_TO_CSV: Readonly<Record<Lang, Record<EuPurchase, string>>> = {
  fi: {
    goods: "tavara",
    services: "palvelu",
    import: "tuonti",
    reverse: "käänteinen",
  },
  en: {
    goods: "goods",
    services: "services",
    import: "import",
    reverse: "reverse",
  },
}
const EU_PURCHASE_FROM_CSV: ReadonlyMap<string, EuPurchase> = new Map([
  ["tavara", "goods"],
  ["palvelu", "services"],
  ["tuonti", "import"],
  ["käänteinen", "reverse"],
  ["goods", "goods"],
  ["services", "services"],
  ["import", "import"],
  ["reverse", "reverse"],
])

/** The `cash` column's value on an entry paid in cash. Read case-insensitively. */
const CASH_TO_CSV: Readonly<Record<Lang, string>> = { fi: "kyllä", en: "yes" }
const CASH_VALUES: readonly string[] = ["kyllä", "yes", "käteinen", "cash", "x"]

/** The `paid` column's value for an entry still open. */
const PAID_OPEN: Readonly<Record<Lang, string>> = { fi: "avoin", en: "open" }
const PAID_OPEN_VALUES: readonly string[] = ["avoin", "open"]

/**
 * Amount mode ⇄ the `mode` column.
 *
 * Reading has to name every word that means net, because anything it does not
 * recognise is read as gross: a net row misread as gross keeps its number and
 * changes what the number means, which no later check would catch. "veroton"
 * is accepted but never written.
 */
const MODE_TO_CSV: Readonly<Record<Lang, Record<AmountMode, string>>> = {
  fi: { gross: "brutto", net: "netto" },
  en: { gross: "gross", net: "net" },
}
const NET_VALUES: readonly string[] = ["netto", "veroton", "net"]

/* -------------------------------------------------------------------------
 * Serialize
 * ---------------------------------------------------------------------- */

/**
 * A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return
 * is read by Excel as a formula, and a formula can open links or pull in
 * other files. The export puts an apostrophe in front of such a cell, and the
 * import takes exactly one off again. A value that already starts with
 * apostrophes before one of those characters gets one more, so every value
 * survives the round trip unchanged.
 *
 * The same goes for such a character after a comma or a tab. An Excel whose list
 * separator is a comma splits the row there rather than at the ";", and quoting
 * does not stop it, because the quote is not at the start of its field.
 *
 * Only the text columns go through this. The amount and the rate are written
 * by the app, and a negative amount has to stay a number.
 */
const FORMULA_LEAD = /^'*[=+\-@\t\r]/
const FORMULA_AFTER_SEPARATOR = /([,\t]\s*)('*[=+\-@])/g
const DEFUSED_AFTER_SEPARATOR = /([,\t]\s*)'('*[=+\-@])/g

function defuseFormula(value: string): string {
  const inner = value.replace(FORMULA_AFTER_SEPARATOR, "$1'$2")
  return FORMULA_LEAD.test(inner) ? `'${inner}` : inner
}

function restoreFormula(value: string): string {
  const inner =
    value.startsWith("'") && FORMULA_LEAD.test(value) ? value.slice(1) : value
  return inner.replace(DEFUSED_AFTER_SEPARATOR, "$1$2")
}

function quote(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Serialize to the export format: UTF-8 BOM, ";" delimiter, CRLF endings,
 * rows sorted by date, decimal commas.
 *
 * The header, the words in the cells and the category names follow `lang`
 * (§7.1); the numbers and the date never do.
 *
 * Receipt paths are always written, whether or not a ZIP is being produced:
 * §7.2 relies on a plain CSV carrying the paths so a re-import can mark those
 * receipts missing.
 */
export function serializeCsv(
  entries: readonly Entry[],
  cats: CategoryMap,
  opts: { lang?: Lang; paths?: ReadonlyMap<string, string> } = {}
): string {
  const lang = opts.lang ?? "fi"
  const paths = opts.paths ?? buildReceiptPaths(entries, lang)
  const lines: string[] = [csvHeaderLine(lang)]
  const sorted = [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.voucher ?? 0) - (b.voucher ?? 0)
  )

  const splitKeys = splitColumnValues(sorted)
  const byId = new Map(sorted.map((e) => [e.id, e]))
  const linkTarget = (id: string | undefined): string => {
    const target = id === undefined ? undefined : byId.get(id)
    return target ? reversalKey(target) : ""
  }

  for (const e of sorted) {
    const cat = cats.get(e.catId)
    const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
    /*
     * Only an image or a PDF is a receipt, so only one of those is written.
     * The path itself is what the rule is applied to: `buildReceiptPaths`
     * already drops the rest, but a caller-supplied map is not bound by it.
     */
    const receipts = (e.atts ?? [])
      .map((a, i) => paths.get(attachmentKey(e.id, i)) ?? a.path ?? "")
      .filter((p) => p && isReceiptPath(p))
      .join("|")

    lines.push(
      [
        isVoucherNumber(e.voucher) ? String(e.voucher) : "",
        e.date,
        defuseFormula(e.description.trim()),
        TYPE_TO_CSV[lang][e.type],
        line ? String(line.account) : "",
        defuseFormula(cat ? categoryName(cat, lang) : ""),
        formatAmountForCsv(e.amount),
        String(e.vatRate).replace(".", ","),
        MODE_TO_CSV[lang][e.amountMode],
        defuseFormula(receipts),
        e.settles ?? "",
        e.paidOn === null ? PAID_OPEN[lang] : (e.paidOn ?? ""),
        defuseFormula(e.buyerVatId ?? ""),
        e.euPurchase ? EU_PURCHASE_TO_CSV[lang][e.euPurchase] : "",
        e.cash ? CASH_TO_CSV[lang] : "",
        splitKeys.get(e.id) ?? "",
        isShare(e.share) ? String(e.share) : "",
        linkTarget(e.reverses),
        linkTarget(e.sells),
        e.periodFrom ?? "",
        e.periodTo ?? "",
        e.party && PARTY_ID.test(e.party) ? e.party : "",
        e.due ?? "",
        e.iban ?? "",
        e.reference ?? "",
      ]
        .map(quote)
        .join(";")
    )
  }

  return "﻿" + lines.join("\r\n") + "\r\n"
}

/**
 * The `split` cell of each entry that is one of several parts of a receipt:
 * the voucher number of the group's first part (§8.4). A voucher number is
 * unique within a year, so a part dated in another year than the first, a group
 * whose first part has no number and a group of one are left out; they come
 * back as ordinary entries.
 */
function splitColumnValues(sorted: readonly Entry[]): Map<string, string> {
  const groups = new Map<string, Entry[]>()
  for (const e of sorted) {
    if (e.split === undefined) continue
    const members = groups.get(e.split)
    if (members) members.push(e)
    else groups.set(e.split, [e])
  }
  const out = new Map<string, string>()
  for (const members of groups.values()) {
    const [first] = members
    if (!isVoucherNumber(first.voucher)) continue
    const year = yearOf(first.date)
    const parts = members.filter((e) => yearOf(e.date) === year)
    if (parts.length < 2) continue
    for (const e of parts) out.set(e.id, String(first.voucher))
  }
  return out
}

/* -------------------------------------------------------------------------
 * Parse
 * ---------------------------------------------------------------------- */

export type DetectedDelimiter = ";" | "\t" | ","

const CANDIDATES: readonly DetectedDelimiter[] = [";", "\t", ","]

const stripBom = (text: string) => text.replace(/^﻿/, "")

/**
 * The text of a CSV file, whatever Excel saved it as. Its "CSV UTF-8" option
 * writes UTF-8 with a BOM and "Unicode Text" writes UTF-16, but plain "CSV
 * (semicolon delimited)" writes the Windows code page, where ä and ö are not
 * valid UTF-8. So: a UTF-16 BOM decides, then strict UTF-8, then windows-1252.
 */
export function decodeCsv(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes)
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes)
  }
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes
    )
  } catch {
    return decodeWindows1252(bytes)
  }
}

/*
 * windows-1252 is Latin-1 except for 0x80 to 0x9F, where it has €, the
 * curly quotes, the dashes and a few letters. Not every runtime's
 * `TextDecoder` honours that range (some read it as Latin-1 control
 * characters), so it is mapped here. The five bytes the code page leaves
 * undefined stay as their control characters, as the WHATWG decoder does.
 */
const CP1252_HIGH = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ"

function decodeWindows1252(bytes: Uint8Array): string {
  let out = ""
  for (const b of bytes) {
    out +=
      b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : String.fromCharCode(b)
  }
  return out
}

/** The rate in the `vat` column, or null when it is not a usable one. */
function parseRateCell(cell: string): number | null {
  const rate = parseRate(cell)
  return rate != null && isVatRate(rate) ? rate : null
}

/**
 * Detect the delimiter by parsing the header row at each candidate and
 * scoring how many known column names it yields.
 *
 * Parsing rather than counting raw occurrences is what honours quoting: a
 * comma-delimited file with a quoted header field containing semicolons would
 * otherwise be read as one column.
 */
export function detectDelimiter(text: string): DetectedDelimiter {
  const sample = stripBom(text)
  let best: DetectedDelimiter = ";"
  let bestScore = -1

  for (const delimiter of CANDIDATES) {
    const row = Papa.parse<string[]>(sample, {
      header: false,
      delimiter,
      preview: 1,
    }).data[0]
    if (!row) continue
    const names = new Set(row.map(columnName))
    const score = CSV_HEADER.filter((h) => names.has(h)).length
    // Ties keep the earlier candidate: ";" > "\t" > ",".
    if (score > bestScore) {
      bestScore = score
      best = delimiter
    }
  }

  return best
}

/** An entry as read from a file: no ids resolved for its receipts yet. */
export interface ImportedEntry extends Omit<Entry, "atts"> {
  paths: readonly string[]
}

export type SkipCode = "bad-date" | "bad-type" | "bad-amount"

export interface SkippedRow {
  /** Physical line number in the file, 1-based. */
  line: number
  code: SkipCode
}

export type ImportWarning =
  | {
      code: "unknown-account"
      line: number
      account: string
      name: string
      bookedTo: string
    }
  | { code: "new-category"; line: number; catId: string; name: string }
  /** Header cells this app does not know, so their columns were not read. */
  | { code: "unknown-columns"; columns: readonly string[] }
  /** Rows whose `split` value no other row of their year shared, so they stand alone. */
  | { code: "split-dissolved"; rows: number }
  /** Rows whose `reverses` value named no voucher in the file, so they link to nothing. */
  | { code: "reverses-dissolved"; rows: number }
  /** Rows whose `sells` value named no voucher in the file, so they link to nothing. */
  | { code: "sells-dissolved"; rows: number }

export type ImportFailure =
  | { ok: false; code: "empty-file" }
  | { ok: false; code: "missing-columns"; missing: readonly CsvColumn[] }
  | { ok: false; code: "no-rows-read"; skipped: readonly SkippedRow[] }
  /** Not one column was recognised: this is not a bookkeeping file. */
  | { ok: false; code: "not-a-book" }

export interface ImportSuccess {
  ok: true
  entries: ImportedEntry[]
  /** The supplied categories plus any created during the import. */
  categories: Category[]
  newCategoryCount: number
  /** Paths in `receipts` that named neither an image nor a PDF, and were dropped. */
  rejectedReceiptCount: number
  skipped: readonly SkippedRow[]
  warnings: readonly ImportWarning[]
  latestYear: number | null
  delimiter: DetectedDelimiter
}

export type ImportResult = ImportSuccess | ImportFailure

/** The line to put a custom category on, for a given account and side. */
function primaryLineForAccount(
  account: number,
  side: EntryType
): AccountLine | undefined {
  const candidates = ALL_LINES.filter(
    (l) => l.account === account && l.side === side
  )
  if (candidates.length <= 1) return candidates[0]
  const preferred = DEFAULT_CATEGORY_FOR_ACCOUNT[account]
  return candidates.find((l) => l.key === preferred) ?? candidates[0]
}

function sideOf(cat: Category): EntryType | undefined {
  return LINE_BY_KEY.get(cat.line)?.side
}

function accountOf(cat: Category): number | undefined {
  return LINE_BY_KEY.get(cat.line)?.account
}

/**
 * Parse a bookkeeping CSV. Lenient per §7.1, and deliberately free of
 * user-facing text: every problem is reported as a code the i18n layer
 * translates.
 */
export function parseCsv(
  text: string,
  cats: readonly Category[],
  makeId: () => string = uid
): ImportResult {
  const source = stripBom(String(text ?? ""))
  if (!source.trim()) return { ok: false, code: "empty-file" }

  const delimiter = detectDelimiter(source)
  /*
   * skipEmptyLines is off so every row keeps its physical line number; blanks
   * are dropped afterwards. Filtering first would make the line numbers in
   * `skipped` point at the wrong row of the user's file.
   */
  const raw = Papa.parse<string[]>(source, {
    header: false,
    delimiter,
    skipEmptyLines: false,
  }).data

  const rows = raw
    .map((cells, i) => ({ line: i + 1, cells }))
    .filter((r) => r.cells.some((c) => c.trim() !== ""))

  const headerRow = rows.shift()
  if (!headerRow) return { ok: false, code: "empty-file" }

  const columns = new Map<string, number>()
  /*
   * Columns the header names that this app does not know. They are reported
   * rather than passed over in silence: a file written to some other shape
   * would otherwise import with its unreadable columns quietly dropped, and
   * the loss would only surface in the next export.
   */
  const unknown: string[] = []
  headerRow.cells.forEach((cell, i) => {
    const name = columnName(cell)
    if (!name) return
    if (!KNOWN_COLUMNS.has(name)) {
      if (!unknown.includes(cell.trim())) unknown.push(cell.trim())
      return
    }
    if (!columns.has(name)) columns.set(name, i)
  })

  /*
   * Not one column was recognised, so this is some other file altogether —
   * a different message from a bookkeeping missing a column.
   */
  if (!columns.size) return { ok: false, code: "not-a-book" }

  const missing = REQUIRED.filter((c) => !columns.has(c))
  if (missing.length) return { ok: false, code: "missing-columns", missing }

  const working = [...cats]
  const byId = new Map(working.map((c) => [c.id, c]))
  const entries: ImportedEntry[] = []
  const skipped: SkippedRow[] = []
  const warnings: ImportWarning[] = []
  /* Each entry's `split` cell as a year and number, in step with `entries`. */
  const splitKeysRead: (string | null)[] = []
  /* Each entry's `reverses` cell, in step with `entries`. */
  const reversesRead: ReversesCell[] = []
  /* Each entry's `sells` cell, in step with `entries`. */
  const sellsRead: ReversesCell[] = []
  let newCategoryCount = 0
  let rejectedReceiptCount = 0
  let latestYear: number | null = null

  for (const { line, cells } of rows) {
    const get = (name: string) => {
      const i = columns.get(name)
      return i == null ? "" : (cells[i] ?? "").trim()
    }

    const date = parseCsvDate(get("date"))
    if (!date) {
      skipped.push({ line, code: "bad-date" })
      continue
    }

    const type = TYPE_FROM_CSV.get(get("type").toLowerCase())
    if (!type) {
      skipped.push({ line, code: "bad-type" })
      continue
    }

    const amount = parseAmount(get("amount"))
    if (amount == null) {
      skipped.push({ line, code: "bad-amount" })
      continue
    }

    const name = restoreFormula(get("category"))
    const accountRaw = get("account")
    const written = /^\d+$/.test(accountRaw) ? Number(accountRaw) : null
    const account =
      written == null
        ? null
        : (FORMER_ACCOUNTS[`${written}:${type}`] ?? written)

    const resolved = resolveCategory({
      account,
      name,
      side: type,
      line,
      working,
      byId,
      makeId,
      warnings,
      rateHint: parseRateCell(get("vat")),
    })
    if (resolved.created) newCategoryCount++
    const cat = resolved.cat
    // A category the row itself brings in takes its EU status from the row (§6.9).
    if (resolved.created) {
      const eu = euPurchaseColumn(get("eu_purchase"), cat).euPurchase
      if (eu) cat.euPurchase = eu
    }

    const rateRaw = get("vat")
    // "" means "use the category default"; "0" is an explicit zero.
    const vatRate =
      rateRaw === "" ? cat.vatRate : (parseRateCell(rateRaw) ?? cat.vatRate)

    const modeRaw = get("mode").trim().toLowerCase()
    const amountMode: AmountMode = NET_VALUES.includes(modeRaw)
      ? "net"
      : "gross"

    const listed = restoreFormula(get("receipts"))
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean)
    /*
     * A path naming anything but an image or a PDF, or leading outside the
     * archive, is not a receipt and is dropped rather than carried along as a
     * missing attachment, which would put it back in the next export.
     */
    const paths = listed.filter(isReceiptPath)
    rejectedReceiptCount += listed.length - paths.length

    /*
     * A number the file gives is kept. A missing, malformed or repeated one
     * is filled in by `assignVouchers` when the book is opened (§4).
     */
    const voucherRaw = get("voucher")
    const voucher = /^\d+$/.test(voucherRaw) ? Number(voucherRaw) : null

    const paid = paidColumn(get("paid"), date, cat)
    entries.push({
      id: makeId(),
      ...(isVoucherNumber(voucher) ? { voucher } : {}),
      date,
      description: restoreFormula(get("description")),
      type,
      catId: cat.id,
      amount,
      vatRate,
      amountMode,
      paths,
      ...settledPeriod(get("settles"), cat),
      ...paid,
      ...cashColumn(get("cash"), paid, cat),
      ...buyerColumn(restoreFormula(get("buyer_vat")), cat),
      ...euPurchaseColumn(get("eu_purchase"), cat),
      ...shareColumn(get("share"), type, cat),
      ...periodColumns(get("period_from"), get("period_to"), cat),
      ...partyColumn(get("party")),
      ...dueColumn(get("due"), type, paid, cat),
      ...billColumns(get("pay_iban"), get("pay_reference"), type, paid, cat),
    })

    const splitRaw = get("split")
    splitKeysRead.push(
      /^\d+$/.test(splitRaw) ? `${yearOf(date)}:${Number(splitRaw)}` : null
    )

    const reversesRaw = get("reverses")
    reversesRead.push(
      reversesRaw === "" ? null : (parseReversalKey(reversesRaw) ?? "bad")
    )

    const sellsRaw = get("sells")
    sellsRead.push(
      sellsRaw === "" ? null : (parseReversalKey(sellsRaw) ?? "bad")
    )

    const y = yearOf(date)
    if (latestYear == null || y > latestYear) latestYear = y
  }

  const dissolved = linkSplits(entries, splitKeysRead, makeId)
  if (dissolved) warnings.push({ code: "split-dissolved", rows: dissolved })

  const unlinked = linkReversals(entries, reversesRead, "reverses")
  if (unlinked) warnings.push({ code: "reverses-dissolved", rows: unlinked })

  const unsold = linkReversals(entries, sellsRead, "sells")
  if (unsold) warnings.push({ code: "sells-dissolved", rows: unsold })

  /*
   * Rows that were all bad are a failure. No rows at all is a bookkeeping with
   * no entries, which saving one writes.
   */
  if (!entries.length && skipped.length) {
    return { ok: false, code: "no-rows-read", skipped }
  }

  if (unknown.length)
    warnings.push({ code: "unknown-columns", columns: unknown })

  return {
    ok: true,
    entries,
    categories: working,
    newCategoryCount,
    rejectedReceiptCount,
    skipped,
    warnings,
    latestYear,
    delimiter,
  }
}

/**
 * Give the entries that share a `split` value in one year a common group id.
 * A value only one row holds links nothing, so that row stands alone; the
 * count of such rows is returned for the import to report.
 */
function linkSplits(
  entries: ImportedEntry[],
  keys: readonly (string | null)[],
  makeId: () => string
): number {
  const sizes = new Map<string, number>()
  for (const key of keys) {
    if (key !== null) sizes.set(key, (sizes.get(key) ?? 0) + 1)
  }
  const ids = new Map<string, string>()
  let dissolved = 0
  keys.forEach((key, i) => {
    if (key === null) return
    if ((sizes.get(key) ?? 0) < 2) {
      dissolved += 1
      return
    }
    let id = ids.get(key)
    if (id === undefined) {
      id = makeId()
      ids.set(key, id)
    }
    entries[i].split = id
  })
  return dissolved
}

/** A `reverses` or `sells` cell as read: empty, the voucher it names, or unreadable. */
type ReversesCell = ReturnType<typeof parseReversalKey> | "bad"

/**
 * Point each entry at the one its `reverses` cell (§8.4) or `sells` cell
 * (§8.8) names, found by year and voucher number among the entries read. A
 * cell that names no entry read, names the row itself or, for `reverses`,
 * would close a loop links nothing; the count of those rows is returned for
 * the import to report.
 */
function linkReversals(
  entries: ImportedEntry[],
  cells: readonly ReversesCell[],
  field: "reverses" | "sells"
): number {
  const byNumber = new Map<string, ImportedEntry>()
  for (const e of entries) {
    if (!isVoucherNumber(e.voucher)) continue
    const key = `${yearOf(e.date)}:${e.voucher}`
    if (!byNumber.has(key)) byNumber.set(key, e)
  }
  let dropped = 0
  cells.forEach((cell, i) => {
    if (cell === null) return
    const target =
      cell === "bad" ? undefined : byNumber.get(`${cell.year}:${cell.voucher}`)
    const loops =
      !!target &&
      (field === "sells"
        ? target.id === entries[i].id
        : reversalLoops(entries[i].id, target.id, entries))
    if (!target || loops) {
      dropped += 1
      return
    }
    entries[i][field] = target.id
  })
  return dropped
}

/**
 * What an EU purchase bought, kept only on a line that can be one (§6.9). The
 * category decides when it says. A row marked on any other category is moved
 * to an EU category when the book opens (`moveEuPurchasesToCategories`).
 */
function euPurchaseColumn(
  value: string,
  cat: Category
): { euPurchase?: EuPurchase } {
  if (cat.euPurchase) return { euPurchase: cat.euPurchase }
  const euPurchase = EU_PURCHASE_FROM_CSV.get(value.trim().toLowerCase())
  return euPurchase && canBeEuPurchase(LINE_BY_KEY.get(cat.line))
    ? { euPurchase }
    : {}
}

/**
 * The business share of a cost (§6.12): a whole percent from 1 to 99, with or
 * without a "%". Kept only on an expense that is not an EU purchase, whose tax
 * the buyer reports and which has no share. Anything else reads as the whole
 * voucher.
 */
function shareColumn(
  value: string,
  type: EntryType,
  cat: Category
): { share?: number } {
  const m = /^\s*(\d{1,3})\s*%?\s*$/.exec(value)
  if (!m || type !== "expense" || cat.euPurchase) return {}
  const share = Number(m[1])
  return isShare(share) ? { share } : {}
}

/** The buyer's VAT number, kept only on an EU sale (§8.7). */
/** A register id as `uid` makes them; anything else links to nothing. */
const PARTY_ID = /^[A-Za-z0-9_-]{1,64}$/

/**
 * The counterparty's register id (§8.29). It is checked against the register
 * when shown, not here: a bare CSV has no register beside it.
 */
function partyColumn(value: string): { party?: string } {
  const id = value.trim()
  return PARTY_ID.test(id) ? { party: id } : {}
}

/**
 * The due date of a bill received (§8.30). Kept only on an expense on a line
 * that can be paid and not paid on its own date, where a due date means
 * something; an unreadable date reads as none.
 */
function dueColumn(
  value: string,
  type: EntryType,
  paid: { paidOn?: string | null },
  cat: Category
): { due?: string } {
  if (!value || type !== "expense" || paid.paidOn === undefined) return {}
  if (!canBeUnpaid(LINE_BY_KEY.get(cat.line))) return {}
  const due = parseCsvDate(value)
  return due ? { due } : {}
}

/**
 * How a bill received is paid (§8.30), kept on the same entries as its due
 * date. An IBAN or a reference whose check digits fail reads as none.
 */
function billColumns(
  iban: string,
  reference: string,
  type: EntryType,
  paid: { paidOn?: string | null },
  cat: Category
): { iban?: string; reference?: string } {
  if (type !== "expense" || paid.paidOn === undefined) return {}
  if (!canBeUnpaid(LINE_BY_KEY.get(cat.line))) return {}
  const i = billIban(iban)
  const r = billReference(reference)
  return { ...(i ? { iban: i } : {}), ...(r ? { reference: r } : {}) }
}

function buyerColumn(value: string, cat: Category): { buyerVatId?: string } {
  return value && isEuSaleKind(cat.kind) ? { buyerVatId: value } : {}
}

/**
 * When an entry was paid (§6.3). An unreadable date, and a date on a line with
 * no separate payment, read as paid on the entry's own date.
 */
function paidColumn(
  value: string,
  date: string,
  cat: Category
): { paidOn?: string | null } {
  if (!value || !canBeUnpaid(LINE_BY_KEY.get(cat.line))) return {}
  if (PAID_OPEN_VALUES.includes(value.trim().toLowerCase())) {
    return { paidOn: null }
  }
  const paid = parseCsvDate(value)
  return paid && paid !== date ? { paidOn: paid } : {}
}

/**
 * The period an entry covers (§6.3). Both dates have to be real, the end not
 * before the start, and the line one that can be paid; anything else is read as
 * no period, since half a period would change no figure.
 */
function periodColumns(
  from: string,
  to: string,
  cat: Category
): { periodFrom?: string; periodTo?: string } {
  if (!from || !to || !canBeUnpaid(LINE_BY_KEY.get(cat.line))) return {}
  const start = parseCsvDate(from)
  const end = parseCsvDate(to)
  if (!start || !end || !isPeriod(start, end)) return {}
  return { periodFrom: start, periodTo: end }
}

/**
 * Whether the entry was paid in cash (§8.5). Kept only where a payment is: on
 * a line that can be paid, and not on an entry still open.
 */
function cashColumn(
  value: string,
  paid: { paidOn?: string | null },
  cat: Category
): { cash?: true } {
  if (!CASH_VALUES.includes(value.trim().toLowerCase())) return {}
  if (paid.paidOn === null || !canBeUnpaid(LINE_BY_KEY.get(cat.line))) return {}
  return { cash: true }
}

/**
 * The period a VAT payment or refund settles (§6.6). Kept only on a settlement
 * category and only when it names a period, so a stray value elsewhere is
 * dropped rather than carried into the next export.
 */
function settledPeriod(value: string, cat: Category): { settles?: string } {
  if (!LINE_BY_KEY.get(cat.line)?.settlement) return {}
  return periodFromKey(value) ? { settles: value } : {}
}

interface ResolveArgs {
  account: number | null
  name: string
  side: EntryType
  line: number
  working: Category[]
  byId: Map<string, Category>
  makeId: () => string
  warnings: ImportWarning[]
  rateHint: number | null
}

function resolveCategory(a: ResolveArgs): { cat: Category; created: boolean } {
  const { account, name, side, working } = a
  const onAccount = working.filter(
    (c) => sideOf(c) === side && (account == null || accountOf(c) === account)
  )

  if (name) {
    const needle = name.toLowerCase()
    const match = onAccount.find(
      (c) =>
        c.name.toLowerCase() === needle ||
        (!c.custom &&
          (DEFAULT_EN_NAMES[c.id]?.toLowerCase() === needle ||
            FORMER_NAMES[c.id]?.some((n) => n.toLowerCase() === needle)))
    )
    if (match) return { cat: match, created: false }
  } else if (account != null) {
    /*
     * No name given: use the documented default for the account rather than
     * whichever category happens to come first.
     */
    const preferredId = DEFAULT_CATEGORY_FOR_ACCOUNT[account]
    const preferred = preferredId ? a.byId.get(preferredId) : undefined
    if (preferred && sideOf(preferred) === side) {
      return { cat: preferred, created: false }
    }
    const exact = onAccount.find((c) => c.id === c.line)
    if (exact) return { cat: exact, created: false }
    if (onAccount[0]) return { cat: onAccount[0], created: false }
  }

  // Unknown name on a known account: create a custom category there.
  const accountLine =
    account == null ? undefined : primaryLineForAccount(account, side)
  if (accountLine && name) {
    const cat: Category = {
      id: `c-${a.makeId()}`,
      line: accountLine.key,
      name,
      vatRate: a.rateHint ?? accountLine.vatRate,
      ...(side === "income" ? { kind: "domestic" as const } : {}),
      enabled: true,
      custom: true,
    }
    working.push(cat)
    a.byId.set(cat.id, cat)
    a.warnings.push({
      code: "new-category",
      line: a.line,
      catId: cat.id,
      name,
    })
    return { cat, created: true }
  }

  // Unknown account: book to 301 (income) or 344-other (expense).
  const fallbackId = side === "income" ? "301" : "344-other"
  let fallback = a.byId.get(fallbackId)
  if (!fallback) {
    const fallbackLine = LINE_BY_KEY.get(fallbackId)!
    fallback = {
      id: fallbackId,
      line: fallbackId,
      name: fallbackLine.name.fi,
      vatRate: fallbackLine.vatRate,
      ...(side === "income" ? { kind: "domestic" as const } : {}),
      enabled: true,
      custom: false,
    }
    working.push(fallback)
    a.byId.set(fallbackId, fallback)
  }
  a.warnings.push({
    code: "unknown-account",
    line: a.line,
    account: account == null ? "" : String(account),
    name,
    bookedTo: fallbackId,
  })
  return { cat: fallback, created: false }
}
