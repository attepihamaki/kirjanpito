import { yearOf } from "@/lib/domain/dates"
import {
  ENTRY_CHECKS,
  flaggedEntryIds,
  type EntryCheck,
} from "@/lib/domain/entry-checks"
import { inPeriod } from "@/lib/domain/period"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import {
  asPeriod,
  bookStartDate,
  vatTimeline,
  type VatPeriod,
  type VatPeriodKind,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"
import type { ChangeRecord } from "@/lib/domain/change-log"

/**
 * What stands between a VAT period and its return (§8.7). A blocker makes
 * marking impossible; a warning is something to look at first but may be right;
 * info is for the record.
 */
export type VatCheckSeverity = "blocker" | "warn" | "info"

export type VatCheckItem =
  /** The period has not closed, so its figures can still change. */
  | { id: "periodOngoing"; severity: "blocker" }
  /** No entries: the return is a nil return. */
  | { id: "noEntries"; severity: "info" }
  | { id: "unsaved"; severity: "warn" }
  | { id: "entryCheck"; severity: "warn"; check: EntryCheck; n: number }
  | { id: "missingFiles"; severity: "warn"; n: number }
  /** Earlier closed periods that are not marked as filed. */
  | { id: "earlierUnfiled"; severity: "warn"; keys: readonly string[] }

export interface VatCheckInput {
  entries: readonly Entry[]
  cats: CategoryMap
  period: VatPeriod
  status: VatPeriodStatus
  today: string
  dirty: boolean
  vatPeriod: VatPeriodKind
  bookStart: string | null
  vatFiled: Readonly<Record<string, string>>
  changeLog: readonly ChangeRecord[]
}

/**
 * The items to look at before a period is marked as filed, blockers first and
 * each group in a fixed order. The entry checks run over the whole year, as the
 * ledger's do (§8.4), and are then narrowed to the period's own entries, so a
 * period does not change what stands out.
 */
export function vatCheckItems(input: VatCheckInput): VatCheckItem[] {
  const { entries, cats, period, today } = input
  const yearEntries = entries.filter((e) => yearOf(e.date) === period.year)
  const own = yearEntries.filter((e) => inPeriod(e, asPeriod(period)))
  const items: VatCheckItem[] = []

  if (input.status === "open" || input.status === "future") {
    items.push({ id: "periodOngoing", severity: "blocker" })
  }
  if (own.length === 0) items.push({ id: "noEntries", severity: "info" })
  if (input.dirty) items.push({ id: "unsaved", severity: "warn" })

  const ownIds = new Set(own.map((e) => e.id))
  for (const check of ENTRY_CHECKS) {
    const ids = flaggedEntryIds(check, yearEntries, cats, today, input.changeLog)
    let n = 0
    for (const id of ids) if (ownIds.has(id)) n++
    if (n) items.push({ id: "entryCheck", severity: "warn", check, n })
  }

  const missing = own.reduce(
    (n, e) => n + (e.atts ?? []).filter((a) => a.missing).length,
    0
  )
  if (missing) items.push({ id: "missingFiles", severity: "warn", n: missing })

  const first = entries.reduce<string | null>(
    (min, e) => (min === null || e.date < min ? e.date : min),
    null
  )
  const earlier = vatTimeline(
    input.vatPeriod,
    bookStartDate(input.bookStart, first),
    today,
    input.vatFiled
  )
    .filter(
      (p) =>
        p.to < period.from && (p.status === "due" || p.status === "overdue")
    )
    .map((p) => p.key)
  if (earlier.length) {
    items.push({ id: "earlierUnfiled", severity: "warn", keys: earlier })
  }

  const rank: Record<VatCheckSeverity, number> = { blocker: 0, warn: 1, info: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity])
}

/** Whether the period may be marked as filed: nothing blocks it. */
export function canMarkFiled(items: readonly VatCheckItem[]): boolean {
  return !items.some((i) => i.severity === "blocker")
}
