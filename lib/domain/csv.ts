import Papa from "papaparse"

import {
  DEFAULT_CATEGORY_FOR_ACCOUNT,
  DEFAULT_EN_NAMES,
  LINES,
  LINE_BY_KEY,
  type AccountLine,
} from "@/lib/domain/accounts"
import { CSV_HEADER, CSV_HEADER_LINE } from "@/lib/domain/csv-header"
import { parseCsvDate, yearOf } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { formatAmountForCsv, parseAmount, parseRate } from "@/lib/domain/money"
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
} from "@/lib/domain/types"

/**
 * The column names live in `csv-header.ts`, which has no dependencies, so the
 * landing page and the import command can name them without pulling papaparse
 * into their bundles. This module is the only place the `tulo`/`kulu` and
 * `brutto`/`netto` *values* appear.
 */
export { CSV_HEADER, CSV_HEADER_LINE }

const REQUIRED = ["pvm", "tyyppi", "summa"] as const

/** Entry type ⇄ the `tyyppi` column. */
const TYPE_TO_CSV: Readonly<Record<EntryType, string>> = {
  income: "tulo",
  expense: "kulu",
}
const TYPE_FROM_CSV: Readonly<Record<string, EntryType>> = {
  tulo: "income",
  kulu: "expense",
}

/** Amount mode ⇄ the `syotto` column. "veroton" is accepted on import only. */
const MODE_TO_CSV: Readonly<Record<AmountMode, string>> = {
  gross: "brutto",
  net: "netto",
}

/* -------------------------------------------------------------------------
 * Serialize
 * ---------------------------------------------------------------------- */

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
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  for (const e of sorted) {
    const cat = cats.get(e.catId)
    const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
    /*
     * Only an image or a PDF is a receipt, so only one of those is written.
     * The path itself is what the rule is applied to: `buildReceiptPaths`
     * already drops the rest, but a caller-supplied map is not bound by it.
     */
    const tosite = (e.atts ?? [])
      .map((a, i) => paths.get(attachmentKey(e.id, i)) ?? a.path ?? "")
      .filter((p) => p && isReceiptFile({ name: p, type: "" }))
      .join("|")

    lines.push(
      [
        e.date,
        e.description.trim(),
        TYPE_TO_CSV[e.type],
        line ? String(line.account) : "",
        cat ? cat.name : "",
        formatAmountForCsv(e.amount),
        String(e.vatRate).replace(".", ","),
        MODE_TO_CSV[e.amountMode],
        tosite,
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
    const names = new Set(row.map((c) => c.trim().toLowerCase()))
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
  /** Paths in `tosite` that named neither an image nor a PDF, and were dropped. */
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
  const candidates = LINES.filter(
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
    const name = cell.trim().toLowerCase()
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

    const date = parseCsvDate(get("pvm"))
    if (!date) {
      skipped.push({ line, code: "bad-date" })
      continue
    }

    const type = TYPE_FROM_CSV[get("tyyppi").toLowerCase()]
    if (!type) {
      skipped.push({ line, code: "bad-type" })
      continue
    }

    const amount = parseAmount(get("summa"))
    if (amount == null) {
      skipped.push({ line, code: "bad-amount" })
      continue
    }

    const name = get("luokka")
    const accountRaw = get("tili")
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
      rateHint: parseRate(get("alv")),
    })
    if (resolved.created) newCategoryCount++
    const cat = resolved.cat

    const rateRaw = get("alv")
    // "" means "use the category default"; "0" is an explicit zero.
    const vatRate =
      rateRaw === "" ? cat.vatRate : (parseRate(rateRaw) ?? cat.vatRate)

    const modeRaw = get("syotto").toLowerCase()
    const amountMode: AmountMode =
      modeRaw === "netto" || modeRaw === "veroton" ? "net" : "gross"

    const listed = get("tosite")
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

    entries.push({
      id: makeId(),
      date,
      description: get("selite"),
      type,
      catId: cat.id,
      amount,
      vatRate,
      amountMode,
      paths,
    })

    const y = yearOf(date)
    if (latestYear == null || y > latestYear) latestYear = y
  }

  if (!entries.length) return { ok: false, code: "no-rows-read", skipped }

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
        (!c.custom && DEFAULT_EN_NAMES[c.id]?.toLowerCase() === needle)
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
