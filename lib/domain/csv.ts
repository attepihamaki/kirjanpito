import Papa from "papaparse"

import {
  DEFAULT_CATEGORY_FOR_ACCOUNT,
  DEFAULT_EN_NAMES,
  LINES,
  LINE_BY_KEY,
  type AccountLine,
} from "@/lib/domain/accounts"
import { parseCsvDate, yearOf } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { formatAmountForCsv, parseAmount, parseRate } from "@/lib/domain/money"
import { attachmentKey, buildReceiptPaths } from "@/lib/domain/receipt-path"
import {
  indexCategories,
  type AmountMode,
  type Category,
  type CategoryMap,
  type Entry,
  type EntryType,
} from "@/lib/domain/types"

/** The nine columns, always in this order (§7.1). */
export const CSV_HEADER = [
  "pvm",
  "selite",
  "tyyppi",
  "tili",
  "luokka",
  "summa",
  "alv",
  "syotto",
  "tosite",
] as const

const REQUIRED = ["pvm", "tyyppi", "summa"] as const

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

function quote(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Serialize to the export format: UTF-8 BOM, ";" delimiter, CRLF endings,
 * rows sorted by date, Finnish category names, decimal commas.
 *
 * Receipt paths are always written, whether or not a ZIP is being produced.
 * The prototype emitted an empty `tosite` for real attachments on a CSV-only
 * export while keeping the path for already-missing ones, which made that
 * round trip lossy — §7.2 relies on a plain CSV carrying the paths so a
 * re-import can mark them missing.
 */
export function serializeCsv(
  entries: readonly Entry[],
  cats: CategoryMap,
  paths: ReadonlyMap<string, string> = buildReceiptPaths(entries)
): string {
  const lines: string[] = [CSV_HEADER.join(";")]
  const sorted = [...entries].sort((a, b) => a.pvm.localeCompare(b.pvm))

  for (const e of sorted) {
    const cat = cats.get(e.catId)
    const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
    const tosite = (e.atts ?? [])
      .map((a, i) => paths.get(attachmentKey(e.id, i)) ?? a.path ?? "")
      .filter(Boolean)
      .join("|")

    lines.push(
      [
        e.pvm,
        e.selite.trim(),
        e.tyyppi,
        line ? String(line.tili) : "",
        cat ? cat.nimi : "",
        formatAmountForCsv(e.summa),
        String(e.alv).replace(".", ","),
        e.syotto,
        tosite,
      ]
        .map(quote)
        .join(";")
    )
  }

  return "﻿" + lines.join("\r\n") + "\r\n"
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export type DetectedDelimiter = ";" | "\t" | ","

const CANDIDATES: readonly DetectedDelimiter[] = [";", "\t", ","]

const stripBom = (text: string) => text.replace(/^﻿/, "")

/**
 * Detect the delimiter by parsing the header row at each candidate and
 * scoring how many known column names it yields.
 *
 * Counting raw occurrences, as the prototype did, ignores quoting: a
 * comma-delimited file with a quoted header field containing semicolons would
 * be read as one column.
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
      tili: string
      nimi: string
      bookedTo: string
    }
  | { code: "new-category"; line: number; catId: string; nimi: string }

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
  skipped: readonly SkippedRow[]
  warnings: readonly ImportWarning[]
  latestYear: number | null
  delimiter: DetectedDelimiter
}

export type ImportResult = ImportSuccess | ImportFailure

/** The line to put a custom category on, for a given account and side. */
function primaryLineForAccount(
  tili: number,
  side: EntryType
): AccountLine | undefined {
  const candidates = LINES.filter((l) => l.tili === tili && l.side === side)
  if (candidates.length <= 1) return candidates[0]
  const preferred = DEFAULT_CATEGORY_FOR_ACCOUNT[tili]
  return candidates.find((l) => l.key === preferred) ?? candidates[0]
}

function sideOf(cat: Category): EntryType | undefined {
  return LINE_BY_KEY.get(cat.line)?.side
}

function tiliOf(cat: Category): number | undefined {
  return LINE_BY_KEY.get(cat.line)?.tili
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
  // skipEmptyLines is off so every row keeps its physical line number; blanks
  // are dropped afterwards. Filtering first is what made the prototype's error
  // messages point at the wrong line.
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
  let latestYear: number | null = null

  for (const { line, cells } of rows) {
    const get = (name: string) => {
      const i = columns.get(name)
      return i == null ? "" : (cells[i] ?? "").trim()
    }

    const pvm = parseCsvDate(get("pvm"))
    if (!pvm) {
      skipped.push({ line, code: "bad-date" })
      continue
    }

    const tyyppiRaw = get("tyyppi").toLowerCase()
    if (tyyppiRaw !== "tulo" && tyyppiRaw !== "kulu") {
      skipped.push({ line, code: "bad-type" })
      continue
    }
    const tyyppi: EntryType = tyyppiRaw

    const summa = parseAmount(get("summa"))
    if (summa == null) {
      skipped.push({ line, code: "bad-amount" })
      continue
    }

    const nimi = get("luokka")
    const tiliRaw = get("tili")
    const tili = /^\d+$/.test(tiliRaw) ? Number(tiliRaw) : null

    const resolved = resolveCategory({
      tili,
      nimi,
      side: tyyppi,
      line,
      working,
      byId,
      makeId,
      warnings,
      rateHint: parseRate(get("alv")),
    })
    if (resolved.created) newCategoryCount++
    const cat = resolved.cat

    const alvRaw = get("alv")
    // "" means "use the category default"; "0" is an explicit zero.
    const alv = alvRaw === "" ? cat.alv : (parseRate(alvRaw) ?? cat.alv)

    const syottoRaw = get("syotto").toLowerCase()
    const syotto: AmountMode =
      syottoRaw === "netto" || syottoRaw === "veroton" ? "netto" : "brutto"

    const paths = get("tosite")
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean)

    entries.push({
      id: makeId(),
      pvm,
      selite: get("selite"),
      tyyppi,
      catId: cat.id,
      summa,
      alv,
      syotto,
      paths,
    })

    const y = yearOf(pvm)
    if (latestYear == null || y > latestYear) latestYear = y
  }

  if (!entries.length) return { ok: false, code: "no-rows-read", skipped }

  return {
    ok: true,
    entries,
    categories: working,
    newCategoryCount,
    skipped,
    warnings,
    latestYear,
    delimiter,
  }
}

interface ResolveArgs {
  tili: number | null
  nimi: string
  side: EntryType
  line: number
  working: Category[]
  byId: Map<string, Category>
  makeId: () => string
  warnings: ImportWarning[]
  rateHint: number | null
}

function resolveCategory(a: ResolveArgs): { cat: Category; created: boolean } {
  const { tili, nimi, side, working } = a
  const onAccount = working.filter(
    (c) => sideOf(c) === side && (tili == null || tiliOf(c) === tili)
  )

  if (nimi) {
    const needle = nimi.toLowerCase()
    const match = onAccount.find(
      (c) =>
        c.nimi.toLowerCase() === needle ||
        (!c.custom && DEFAULT_EN_NAMES[c.id]?.toLowerCase() === needle)
    )
    if (match) return { cat: match, created: false }
  } else if (tili != null) {
    // No name given: use the documented default for the account rather than
    // whichever category happens to come first.
    const preferredId = DEFAULT_CATEGORY_FOR_ACCOUNT[tili]
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
    tili == null ? undefined : primaryLineForAccount(tili, side)
  if (accountLine && nimi) {
    const cat: Category = {
      id: `c-${a.makeId()}`,
      line: accountLine.key,
      nimi,
      alv: a.rateHint ?? accountLine.alv,
      ...(side === "tulo" ? { kind: "kotimaa" as const } : {}),
      on: true,
      custom: true,
    }
    working.push(cat)
    a.byId.set(cat.id, cat)
    a.warnings.push({
      code: "new-category",
      line: a.line,
      catId: cat.id,
      nimi,
    })
    return { cat, created: true }
  }

  // Unknown account: book to 301 (income) or 344-muut (expense).
  const fallbackId = side === "tulo" ? "301" : "344-muut"
  let fallback = a.byId.get(fallbackId)
  if (!fallback) {
    const fallbackLine = LINE_BY_KEY.get(fallbackId)!
    fallback = {
      id: fallbackId,
      line: fallbackId,
      nimi: fallbackLine.name.fi,
      alv: fallbackLine.alv,
      ...(side === "tulo" ? { kind: "kotimaa" as const } : {}),
      on: true,
      custom: false,
    }
    working.push(fallback)
    a.byId.set(fallbackId, fallback)
  }
  a.warnings.push({
    code: "unknown-account",
    line: a.line,
    tili: tili == null ? "" : String(tili),
    nimi,
    bookedTo: fallbackId,
  })
  return { cat: fallback, created: false }
}

/** Convenience for round-trip tests and the import command. */
export function categoryMapOf(cats: readonly Category[]): CategoryMap {
  return indexCategories(cats)
}
