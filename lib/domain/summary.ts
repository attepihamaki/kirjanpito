import { BUCKETS, LINE_BY_KEY, RATES } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import type { Bucket, Cents, CategoryMap, Entry } from "@/lib/domain/types"

export interface MonthRow {
  /** 1–12, or 0 on the totals row. */
  month: number
  incomeNet: Cents
  expenseNet: Cents
  /** Domestic sales on line 300, keyed by the entry's own rate. */
  salesByRate: ReadonlyMap<number, Cents>
  eu: Cents
  nonEu: Cents
  reverse: Cents
  /** Income on lines 301–324. */
  otherIncome: Cents
  byBucket: Readonly<Record<Bucket, Cents>>
}

export interface Summary {
  year: number
  /** Always twelve rows, January first. */
  months: readonly MonthRow[]
  /**
   * The rate columns to render: the six standard rates plus any other rate
   * actually used, descending. Without this a 9 % sale would raise the row
   * total while appearing in no visible column.
   */
  rateColumns: readonly number[]
  totals: MonthRow
}

interface MutableRow {
  month: number
  incomeNet: Cents
  expenseNet: Cents
  salesByRate: Map<number, Cents>
  eu: Cents
  nonEu: Cents
  reverse: Cents
  otherIncome: Cents
  byBucket: Record<Bucket, Cents>
}

function emptyRow(month: number): MutableRow {
  return {
    month,
    incomeNet: 0,
    expenseNet: 0,
    salesByRate: new Map(),
    eu: 0,
    nonEu: 0,
    reverse: 0,
    otherIncome: 0,
    byBucket: Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<
      Bucket,
      Cents
    >,
  }
}

/** Total sales for a row: line 300 only, across every rate and sales kind. */
export function salesTotal(row: MonthRow): Cents {
  let total = row.eu + row.nonEu + row.reverse
  for (const v of row.salesByRate.values()) total += v
  return total + 0
}

/** The Yhteenveto grid for one year (§6.4). All amounts are net. */
export function summary(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): Summary {
  const months = Array.from({ length: 12 }, (_, i) => emptyRow(i + 1))
  const totals = emptyRow(0)
  const usedRates = new Set<number>(RATES)

  for (const e of entries) {
    if (yearOf(e.date) !== year) continue
    const row = months[monthOf(e.date) - 1]
    if (!row) continue

    const cat = cats.get(e.catId)
    const { net } = calcEntry(e)
    const rate = Number(e.vatRate) || 0

    if (e.type === "income") {
      row.incomeNet += net
      totals.incomeNet += net
      const kind = cat?.kind
      if (kind === "eu" || kind === "nonEu" || kind === "reverse") {
        row[kind] += net
        totals[kind] += net
      } else if (cat?.line === "300") {
        usedRates.add(rate)
        row.salesByRate.set(rate, (row.salesByRate.get(rate) ?? 0) + net)
        totals.salesByRate.set(rate, (totals.salesByRate.get(rate) ?? 0) + net)
      } else {
        row.otherIncome += net
        totals.otherIncome += net
      }
    } else {
      row.expenseNet += net
      totals.expenseNet += net
      const bucket = cat ? LINE_BY_KEY.get(cat.line)?.bucket : undefined
      const key: Bucket = bucket ?? "otherDeductible"
      row.byBucket[key] += net
      totals.byBucket[key] += net
    }
  }

  return {
    year,
    months,
    rateColumns: [...usedRates].sort((a, b) => b - a),
    totals,
  }
}
