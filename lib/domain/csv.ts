import Papa from "papaparse"

import {
  DEFAULT_CATEGORY_FOR_ACCOUNT,
  DEFAULT_EN_NAMES,
  FORMER_NAMES,
  ALL_LINES,
  LINE_BY_KEY,
  type AccountLine,
} from "@/lib/domain/accounts"
import { CSV_HEADER, CSV_HEADER_LINE } from "@/lib/domain/csv-header"
import { parseCsvDate, yearOf } from "@/lib/domain/dates"
import { canBeEuPurchase, isEuSaleKind } from "@/lib/domain/accounts"
import { canBeUnpaid } from "@/lib/domain/open-items"
import { uid } from "@/lib/domain/id"
import {
  formatAmountForCsv,
  isVatRate,
  parseAmount,
  parseRate,
} from "@/lib/domain/money"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import { isVoucherNumber } from "@/lib/domain/voucher"
import {
  attachmentKey,
  buildReceiptPaths,
  isReceiptFile,
} from "@/lib/domain/receipt-path"
import {
  type AmountMode,
  type Category,
  type CategoryMap,
  type Entry,
  type EntryType,
  type EuPurchase,
} from "@/lib/domain/types"

/**
 * The column names live in `csv-header.ts`, which has no dependencies, so the
 * landing page and the import command can name them without pulling papaparse
 * into their bundles. This module is the only place the `tulo`/`kulu` and
 * `brutto`/`netto` *values* and the Finnish column names appear.
 */
export { CSV_HEADER, CSV_HEADER_LINE }

const REQUIRED = ["date", "type", "amount"] as const

/**
 * The Finnish column names, which files already exported carry. The import
 * reads them as the English ones for good, and the export never writes them.
 */
const FINNISH_COLUMNS: ReadonlyMap<string, string> = new Map([
  ["tositenro", "voucher"],
  ["tositenumero", "voucher"],
  ["pvm", "date"],
  ["selite", "description"],
  ["tyyppi", "type"],
  ["tili", "account"],
  ["luokka", "category"],
  ["summa", "amount"],
  ["alv", "vat"],
  ["syotto", "mode"],
  ["tosite", "receipts"],
  ["verokausi", "settles"],
  ["maksettu", "paid"],
  ["ostajan_alv", "buyer_vat"],
  ["eu_osto", "eu_purchase"],
])

/** The column a header cell names, ignoring case and either language. */
function columnName(cell: string): string {
  const name = cell.trim().toLowerCase()
  return FINNISH_COLUMNS.get(name) ?? name
}

/** Entry type ⇄ the `type` column. */
const TYPE_TO_CSV: Readonly<Record<EntryType, string>> = {
  income: "tulo",
  expense: "kulu",
}
const TYPE_FROM_CSV: Readonly<Record<string, EntryType>> = {
  tulo: "income",
  kulu: "expense",
}

/** An EU purchase ⇄ the `eu_purchase` column. */
const EU_PURCHASE_TO_CSV: Readonly<Record<EuPurchase, string>> = {
  goods: "tavara",
  services: "palvelu",
}
const EU_PURCHASE_FROM_CSV: Readonly<Record<string, EuPurchase>> = {
  tavara: "goods",
  palvelu: "services",
}

/** The `paid` column's value for an entry still open. */
const PAID_OPEN = "avoin"

/** Amount mode ⇄ the `mode` column. "veroton" is accepted on import only. */
const MODE_TO_CSV: Readonly<Record<AmountMode, string>> = {
  gross: "brutto",
  net: "netto",
}

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
 * Only the text columns go through this. The amount and the rate are written
 * by the app, and a negative amount has to stay a number.
 */
const FORMULA_LEAD = /^'*[=+\-@\t\r]/

function defuseFormula(value: string): string {
  return FORMULA_LEAD.test(value) ? `'${value}` : value
}

function restoreFormula(value: string): string {
  return value.startsWith("'") && FORMULA_LEAD.test(value)
    ? value.slice(1)
    : value
}

function quote(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Serialize to the export format: UTF-8 BOM, ";" delimiter, CRLF endings,
 * rows sorted by date, Finnish category names, decimal commas.
 *
 * Receipt paths are always written, whether or not a ZIP is being produced:
 * §7.2 relies on a plain CSV carrying the paths so a re-import can mark those
 * receipts missing.
 */
export function serializeCsv(
  entries: readonly Entry[],
  cats: CategoryMap,
  paths: ReadonlyMap<string, string> = buildReceiptPaths(entries)
): string {
  const lines: string[] = [CSV_HEADER_LINE]
  const sorted = [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.voucher ?? 0) - (b.voucher ?? 0)
  )

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
      .filter((p) => p && isReceiptFile({ name: p, type: "" }))
      .join("|")

    lines.push(
      [
        isVoucherNumber(e.voucher) ? String(e.voucher) : "",
        e.date,
        defuseFormula(e.description.trim()),
        TYPE_TO_CSV[e.type],
        line ? String(line.account) : "",
        defuseFormula(cat ? cat.name : ""),
        formatAmountForCsv(e.amount),
        String(e.vatRate).replace(".", ","),
        MODE_TO_CSV[e.amountMode],
        defuseFormula(receipts),
        e.settles ?? "",
        e.paidOn === null ? PAID_OPEN : (e.paidOn ?? ""),
        defuseFormula(e.buyerVatId ?? ""),
        e.euPurchase ? EU_PURCHASE_TO_CSV[e.euPurchase] : "",
      ]
        .map(quote)
        .join(";")
    )
  }

  return "﻿" + lines.join("\r\n") + "\r\n"
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
    return new TextDecoder("windows-1252").decode(bytes)
  }
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

export type ImportFailure =
  | { ok: false; code: "empty-file" }
  | { ok: false; code: "missing-columns"; missing: readonly string[] }
  | { ok: false; code: "no-rows-read"; skipped: readonly SkippedRow[] }

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
  headerRow.cells.forEach((cell, i) => {
    const name = columnName(cell)
    if (name && !columns.has(name)) columns.set(name, i)
  })

  const missing = REQUIRED.filter((c) => !columns.has(c))
  if (missing.length) return { ok: false, code: "missing-columns", missing }

  const working = [...cats]
  const byId = new Map(working.map((c) => [c.id, c]))
  const entries: ImportedEntry[] = []
  const skipped: SkippedRow[] = []
  const warnings: ImportWarning[] = []
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

    const type = TYPE_FROM_CSV[get("type").toLowerCase()]
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
    const account = /^\d+$/.test(accountRaw) ? Number(accountRaw) : null

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

    const modeRaw = get("mode").toLowerCase()
    const amountMode: AmountMode =
      modeRaw === "netto" || modeRaw === "veroton" ? "net" : "gross"

    const listed = restoreFormula(get("receipts"))
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean)
    /*
     * A path naming anything but an image or a PDF is not a receipt and is
     * dropped rather than carried along as a missing attachment, which would
     * put it back in the next export.
     */
    const paths = listed.filter((p) => isReceiptFile({ name: p, type: "" }))
    rejectedReceiptCount += listed.length - paths.length

    /*
     * A number the file gives is kept. A missing, malformed or repeated one
     * is filled in by `assignVouchers` when the book is opened (§4).
     */
    const voucherRaw = get("voucher")
    const voucher = /^\d+$/.test(voucherRaw) ? Number(voucherRaw) : null

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
      ...paidColumn(get("paid"), date, cat),
      ...buyerColumn(restoreFormula(get("buyer_vat")), cat),
      ...euPurchaseColumn(get("eu_purchase"), cat),
    })

    const y = yearOf(date)
    if (latestYear == null || y > latestYear) latestYear = y
  }

  /*
   * Rows that were all bad are a failure. No rows at all is a bookkeeping with
   * no entries, which saving one writes.
   */
  if (!entries.length && skipped.length) {
    return { ok: false, code: "no-rows-read", skipped }
  }

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
 * What an EU purchase bought, kept only on a line that can be one (§6.9). The
 * category decides when it says. A row marked on any other category is moved
 * to an EU category when the book opens (`moveEuPurchasesToCategories`).
 */
function euPurchaseColumn(
  value: string,
  cat: Category
): { euPurchase?: EuPurchase } {
  if (cat.euPurchase) return { euPurchase: cat.euPurchase }
  const euPurchase = EU_PURCHASE_FROM_CSV[value.trim().toLowerCase()]
  return euPurchase && canBeEuPurchase(LINE_BY_KEY.get(cat.line))
    ? { euPurchase }
    : {}
}

/** The buyer's VAT number, kept only on an EU sale (§8.7). */
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
  if (value.toLowerCase() === PAID_OPEN) return { paidOn: null }
  const paid = parseCsvDate(value)
  return paid && paid !== date ? { paidOn: paid } : {}
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
