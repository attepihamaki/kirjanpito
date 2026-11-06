import type { ChangeRecord } from "@/lib/domain/change-log"
import { yearOf } from "@/lib/domain/dates"
import {
  ENTRY_CHECKS,
  flaggedEntryIds,
  type EntryCheck,
} from "@/lib/domain/entry-checks"
import { inPeriod } from "@/lib/domain/period"
import {
  defineRules,
  evaluate,
  hasBlocker,
  sortBySeverity,
  type Finding,
} from "@/lib/domain/rules/engine"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import {
  asPeriod,
  bookStartDate,
  vatTimeline,
  type VatPeriod,
  type VatPeriodKind,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"

/**
 * What stands between a VAT period and its return (§8.7), as rules (§6.10). A
 * blocker makes marking impossible; a warning is something to look at first
 * but may be right; info is for the record.
 */
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

/** What each rule's breach carries, by rule id. */
export interface VatCheckData {
  /** The period has not closed, so its figures can still change. */
  periodOngoing: undefined
  /** No entries: the return is a nil return. */
  noEntries: undefined
  unsaved: undefined
  entryCheck: { check: EntryCheck; n: number }
  missingFiles: { n: number }
  /** Earlier closed periods that are not marked as filed. */
  earlierUnfiled: { keys: readonly string[] }
}

export type VatCheckFinding = {
  [K in keyof VatCheckData]: Finding<VatCheckData[K]> & { ruleId: K }
}[keyof VatCheckData]

/** The year's entries, and the part of them that falls in the period. */
function scope(input: VatCheckInput) {
  const yearEntries = input.entries.filter(
    (e) => yearOf(e.date) === input.period.year
  )
  const own = yearEntries.filter((e) => inPeriod(e, asPeriod(input.period)))
  return { yearEntries, own }
}

/*
 * Listed in the order the dialog shows them within a severity. The entry
 * checks run over the whole year, as the ledger's do (§8.4), and are then
 * narrowed to the period's own entries, so a period does not change what
 * stands out.
 */
const VAT_CHECK_RULES = defineRules<
  VatCheckInput,
  VatCheckData[keyof VatCheckData]
>([
  {
    id: "periodOngoing",
    severity: "blocker",
    source: "app",
    check: (i) =>
      i.status === "open" || i.status === "future" ? [undefined] : [],
  },
  {
    id: "noEntries",
    severity: "info",
    source: "app",
    check: (i) => (scope(i).own.length === 0 ? [undefined] : []),
  },
  {
    id: "unsaved",
    severity: "warn",
    source: "app",
    check: (i) => (i.dirty ? [undefined] : []),
  },
  {
    id: "entryCheck",
    severity: "warn",
    source: "app",
    check: (i) => {
      const { yearEntries, own } = scope(i)
      const ownIds = new Set(own.map((e) => e.id))
      const out: { check: EntryCheck; n: number }[] = []
      for (const check of ENTRY_CHECKS) {
        const ids = flaggedEntryIds(
          check,
          yearEntries,
          i.cats,
          i.today,
          i.changeLog
        )
        let n = 0
        for (const id of ids) if (ownIds.has(id)) n++
        if (n) out.push({ check, n })
      }
      return out
    },
  },
  {
    id: "missingFiles",
    severity: "warn",
    source: "app",
    check: (i) => {
      const n = scope(i).own.reduce(
        (sum, e) => sum + (e.atts ?? []).filter((a) => a.missing).length,
        0
      )
      return n ? [{ n }] : []
    },
  },
  {
    id: "earlierUnfiled",
    severity: "warn",
    source: "app",
    check: (i) => {
      const first = i.entries.reduce<string | null>(
        (min, e) => (min === null || e.date < min ? e.date : min),
        null
      )
      const keys = vatTimeline(
        i.vatPeriod,
        bookStartDate(i.bookStart, first),
        i.today,
        i.vatFiled
      )
        .filter(
          (p) =>
            p.to < i.period.from &&
            (p.status === "due" || p.status === "overdue")
        )
        .map((p) => p.key)
      return keys.length ? [{ keys }] : []
    },
  },
])

/** Every breach for a period, blockers first and each severity in rule order. */
export function vatCheckFindings(input: VatCheckInput): VatCheckFinding[] {
  return sortBySeverity(evaluate(VAT_CHECK_RULES, input) as VatCheckFinding[])
}

/** Whether the period may be marked as filed: nothing blocks it. */
export function canMarkFiled(findings: readonly VatCheckFinding[]): boolean {
  return !hasBlocker(findings)
}
