import { assetSchedule, type AssetOpening } from "@/lib/domain/assets"
import type { ChangeRecord } from "@/lib/domain/change-log"
import { lastCompleteMonth, monthOf, yearOf } from "@/lib/domain/dates"
import {
  ENTRY_CHECKS,
  flaggedEntryIds,
  type EntryCheck,
} from "@/lib/domain/entry-checks"
import type { YearEnd } from "@/lib/domain/form5-balance"
import { balancesAt } from "@/lib/domain/open-items"
import type { CategoryMap, Cents, Entry } from "@/lib/domain/types"
import {
  bookStartDate,
  vatTimeline,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"

/**
 * What stands between a year and its Form 5 (§8.8). A blocker makes locking
 * impossible; a warning is something to look at first but may be right; info is
 * for the record.
 */
export type YearEndSeverity = "blocker" | "warn" | "info"

export type YearEndItem =
  /** The year has not ended, so there is nothing final to report. */
  | { id: "yearOngoing"; severity: "blocker" }
  /** No entries: the return is a nil return. */
  | { id: "noEntries"; severity: "info" }
  | { id: "unsaved"; severity: "warn" }
  | { id: "entryCheck"; severity: "warn"; check: EntryCheck; n: number }
  | { id: "missingFiles"; severity: "warn"; n: number }
  /** VAT periods of the year that have closed and are not marked as filed. */
  | { id: "vatUnfiled"; severity: "warn"; keys: readonly string[] }
  /** A depreciation allowance the year did not use. */
  | { id: "depreciation"; severity: "warn"; maximum: Cents }
  | { id: "yearEndFigures"; severity: "info" }
  | {
      id: "openItems"
      severity: "info"
      n: number
      receivables: Cents
      payables: Cents
    }
  | { id: "emptyMonths"; severity: "info"; months: readonly number[] }

export interface YearEndInput {
  entries: readonly Entry[]
  cats: CategoryMap
  year: number
  today: string
  dirty: boolean
  vatPeriod: VatPeriodKind
  bookStart: string | null
  vatFiled: Readonly<Record<string, string>>
  changeLog: readonly ChangeRecord[]
  assetOpening: AssetOpening | null
  /** The figures typed in on Varat ja velat, or undefined while none were. */
  yearEnd: YearEnd | undefined
}

/**
 * The items to look at before the year is locked, blockers first and each group
 * in a fixed order. An empty list means nothing is in the way.
 */
export function yearEndItems(input: YearEndInput): YearEndItem[] {
  const { entries, cats, year, today } = input
  const yearEntries = entries.filter((e) => yearOf(e.date) === year)
  const items: YearEndItem[] = []

  if (yearOf(today) <= year) items.push({ id: "yearOngoing", severity: "blocker" })
  if (yearEntries.length === 0) items.push({ id: "noEntries", severity: "info" })
  if (input.dirty) items.push({ id: "unsaved", severity: "warn" })

  for (const check of ENTRY_CHECKS) {
    const n = flaggedEntryIds(
      check,
      yearEntries,
      cats,
      today,
      input.changeLog
    ).size
    if (n) items.push({ id: "entryCheck", severity: "warn", check, n })
  }

  const missing = yearEntries.reduce(
    (n, e) => n + (e.atts ?? []).filter((a) => a.missing).length,
    0
  )
  if (missing) items.push({ id: "missingFiles", severity: "warn", n: missing })

  const first = entries.reduce<string | null>(
    (min, e) => (min === null || e.date < min ? e.date : min),
    null
  )
  const unfiled = vatTimeline(
    input.vatPeriod,
    bookStartDate(input.bookStart, first),
    today,
    input.vatFiled
  )
    .filter(
      (p) => p.year === year && (p.status === "due" || p.status === "overdue")
    )
    .map((p) => p.key)
  if (unfiled.length) {
    items.push({ id: "vatUnfiled", severity: "warn", keys: unfiled })
  }

  const asset = assetSchedule(entries, cats, input.assetOpening, year).find(
    (a) => a.year === year
  )
  if (asset && asset.maximum > 0 && asset.taken === 0) {
    items.push({ id: "depreciation", severity: "warn", maximum: asset.maximum })
  }

  if (!input.yearEnd) items.push({ id: "yearEndFigures", severity: "info" })

  const open = balancesAt(entries, cats, `${year}-12-31`)
  if (open.count) {
    items.push({
      id: "openItems",
      severity: "info",
      n: open.count,
      receivables: open.receivables,
      payables: open.payables,
    })
  }

  /*
   * From the year's first month with an entry to its last complete one, as the
   * overview's checklist does, and never before the start month.
   */
  const used = new Set(yearEntries.map((e) => monthOf(e.date)))
  if (used.size) {
    const empty: number[] = []
    for (let m = Math.min(...used); m <= lastCompleteMonth(year, today); m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`
      if (input.bookStart && key < input.bookStart) continue
      if (!used.has(m)) empty.push(m)
    }
    if (empty.length) {
      items.push({ id: "emptyMonths", severity: "info", months: empty })
    }
  }

  const rank: Record<YearEndSeverity, number> = { blocker: 0, warn: 1, info: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity])
}

/** Whether the year may be locked: nothing blocks it. */
export function canLockYear(items: readonly YearEndItem[]): boolean {
  return !items.some((i) => i.severity === "blocker")
}
