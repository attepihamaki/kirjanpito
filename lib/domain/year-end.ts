import { assetSchedule, type AssetOpening } from "@/lib/domain/assets"
import type { ChangeRecord } from "@/lib/domain/change-log"
import { calcEntry } from "@/lib/domain/calc"
import { lastCompleteMonth, monthOf, yearOf } from "@/lib/domain/dates"
import {
  ENTRY_CHECKS,
  flaggedEntryIds,
  type ReceiptHashes,
  type EntryCheck,
} from "@/lib/domain/entry-checks"
import type { YearEnd } from "@/lib/domain/form5-balance"
import {
  stockFigures,
  stockProblems,
  type Inventory,
} from "@/lib/domain/inventory"
import { balancesAt } from "@/lib/domain/open-items"
import {
  defineRules,
  evaluate,
  hasBlocker,
  sortBySeverity,
  type Finding,
} from "@/lib/domain/rules/engine"
import type { CategoryMap, Cents, Entry } from "@/lib/domain/types"
import {
  bookStartDate,
  vatTimeline,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"

/**
 * What stands between a year and its Form 5 (§8.8), as rules (§6.10). A
 * blocker makes locking impossible; a warning is something to look at first
 * but may be right; info is for the record.
 */
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
  /** The content hashes of the stored receipts read so far (§8.4). */
  receiptHashes?: ReceiptHashes
  assetOpening: AssetOpening | null
  /** The figures typed in on Varat ja velat, or undefined while none were. */
  yearEnd: YearEnd | undefined
  /** The stocktake (§8.28). Without it the stock rules say nothing about a count. */
  inventory?: Inventory
  /** Stock at the start of the year: the year before's 708 plus 709. */
  openingStock?: Cents
}

/** What each rule's breach carries, by rule id. */
export interface YearEndData {
  /** The year has not ended, so there is nothing final to report. */
  yearOngoing: undefined
  /** No entries: the return is a nil return. */
  noEntries: undefined
  unsaved: undefined
  entryCheck: { check: EntryCheck; n: number }
  missingFiles: { n: number }
  /** VAT periods of the year that have closed and are not marked as filed. */
  vatUnfiled: { keys: readonly string[] }
  /** A depreciation allowance the year did not use. */
  depreciation: { maximum: Cents }
  /**
   * Private use of a car is booked on line 313. OmaVero works that amount out
   * itself from the car's kilometres and costs (271, 273, 381 and 396 of
   * the specification), which the book does not hold.
   */
  privateCar: { amount: Cents }
  yearEndFigures: undefined
  /** Goods were bought in the year but no stock is recorded at its end. */
  stockMissing: { purchases: Cents }
  /** The counted stock is more than the opening stock and the year's purchases. */
  stockTooHigh: { closing: Cents; available: Cents }
  /** Rows of the stocktake that need attention. */
  stockRows: { n: number }
  openItems: { n: number; receivables: Cents; payables: Cents }
  emptyMonths: { months: readonly number[] }
}

export type YearEndFinding = {
  [K in keyof YearEndData]: Finding<YearEndData[K]> & { ruleId: K }
}[keyof YearEndData]

const yearEntriesOf = (i: YearEndInput) =>
  i.entries.filter((e) => yearOf(e.date) === i.year)

/**
 * What the year's goods purchases cost, excluding VAT: the positive entries on
 * line 333. The stock-change entry is negative when stock grows, which is the
 * only case the rules about a larger stock look at, so it never counts here.
 */
function goodsPurchases(i: YearEndInput): Cents {
  return yearEntriesOf(i)
    .filter((e) => i.cats.get(e.catId)?.line === "333")
    .map((e) => calcEntry(e).net)
    .filter((net) => net > 0)
    .reduce((sum, net) => sum + net, 0)
}

/** Listed in the order the dialog shows them within a severity. */
export const YEAR_END_RULES = defineRules<
  YearEndInput,
  YearEndData[keyof YearEndData]
>([
  {
    id: "yearOngoing",
    severity: "blocker",
    source: "app",
    check: (i) => (yearOf(i.today) <= i.year ? [undefined] : []),
  },
  {
    id: "noEntries",
    severity: "info",
    source: "app",
    check: (i) => (yearEntriesOf(i).length === 0 ? [undefined] : []),
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
      const entries = yearEntriesOf(i)
      const out: { check: EntryCheck; n: number }[] = []
      for (const check of ENTRY_CHECKS) {
        const n = flaggedEntryIds(
          check,
          entries,
          i.cats,
          i.today,
          i.changeLog,
          i.receiptHashes
        ).size
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
      const n = yearEntriesOf(i).reduce(
        (sum, e) => sum + (e.atts ?? []).filter((a) => a.missing).length,
        0
      )
      return n ? [{ n }] : []
    },
  },
  {
    id: "vatUnfiled",
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
            p.year === i.year && (p.status === "due" || p.status === "overdue")
        )
        .map((p) => p.key)
      return keys.length ? [{ keys }] : []
    },
  },
  {
    id: "depreciation",
    severity: "warn",
    source: "EVL 30 §",
    check: (i) => {
      const asset = assetSchedule(
        i.entries,
        i.cats,
        i.assetOpening,
        i.year
      ).find((a) => a.year === i.year)
      return asset && asset.maximum > 0 && asset.taken === 0
        ? [{ maximum: asset.maximum }]
        : []
    },
  },
  {
    id: "privateCar",
    severity: "warn",
    source: "Form 5 spec 2026 #1882",
    check: (i) => {
      const amount = yearEntriesOf(i)
        .filter((e) => i.cats.get(e.catId)?.line === "313")
        .reduce((sum, e) => sum + calcEntry(e).net, 0)
      return amount > 0 ? [{ amount }] : []
    },
  },
  {
    id: "yearEndFigures",
    severity: "info",
    source: "app",
    check: (i) => (i.yearEnd ? [] : [undefined]),
  },
  {
    id: "stockMissing",
    severity: "info",
    source: "app",
    check: (i) => {
      const purchases = goodsPurchases(i)
      const recorded = i.yearEnd ? i.yearEnd.goods + i.yearEnd.otherCurrent : 0
      return purchases > 0 && recorded === 0 ? [{ purchases }] : []
    },
  },
  {
    id: "stockTooHigh",
    severity: "warn",
    source: "app",
    check: (i) => {
      const counted = i.inventory && stockFigures(i.inventory, i.year)
      if (!counted) return []
      const closing = counted.goods + counted.otherCurrent
      const available = (i.openingStock ?? 0) + goodsPurchases(i)
      return closing > available ? [{ closing, available }] : []
    },
  },
  {
    id: "stockRows",
    severity: "warn",
    source: "app",
    check: (i) => {
      const rows = i.inventory?.years[String(i.year)] ?? []
      const n = rows.filter((r) => stockProblems(r).length > 0).length
      return n ? [{ n }] : []
    },
  },
  {
    id: "openItems",
    severity: "info",
    source: "KPL 1:1a",
    check: (i) => {
      const open = balancesAt(i.entries, i.cats, `${i.year}-12-31`)
      return open.count
        ? [
            {
              n: open.count,
              receivables: open.receivables,
              payables: open.payables,
            },
          ]
        : []
    },
  },
  {
    id: "emptyMonths",
    severity: "info",
    source: "app",
    check: (i) => {
      /*
       * From the year's first month with an entry to its last complete one, as
       * the overview's checklist does, and never before the start month.
       */
      const used = new Set(yearEntriesOf(i).map((e) => monthOf(e.date)))
      if (!used.size) return []
      const months: number[] = []
      for (
        let m = Math.min(...used);
        m <= lastCompleteMonth(i.year, i.today);
        m++
      ) {
        const key = `${i.year}-${String(m).padStart(2, "0")}`
        if (i.bookStart && key < i.bookStart) continue
        if (!used.has(m)) months.push(m)
      }
      return months.length ? [{ months }] : []
    },
  },
])

/** Every breach for a year, blockers first and each severity in rule order. */
export function yearEndFindings(input: YearEndInput): YearEndFinding[] {
  return sortBySeverity(evaluate(YEAR_END_RULES, input) as YearEndFinding[])
}

/** Whether the year may be locked: nothing blocks it. */
export function canLockYear(findings: readonly YearEndFinding[]): boolean {
  return !hasBlocker(findings)
}
