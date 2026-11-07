import { filterPeriod } from "@/lib/domain/period"
import {
  indexCategories,
  type Category,
  type Cents,
  type Entry,
} from "@/lib/domain/types"
import { countsOnVatReturn, vatReport } from "@/lib/domain/vat"
import {
  asPeriod,
  bookStartDate,
  filedOn,
  vatPeriods,
  type VatPeriod,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"

export interface VatYearRow {
  period: VatPeriod
  /** Tax on sales and on purchases the buyer reports, before any deduction. */
  tax: Cents
  /** Field 307. */
  deductible: Cents
  /** Field 308 with its sign: negative is a refund. */
  due: Cents
  /** The day the return was marked as filed, or null. */
  filed: string | null
}

export interface VatYear {
  rows: VatYearRow[]
  total: { tax: Cents; deductible: Cents; due: Cents }
}

export interface VatYearInput {
  entries: readonly Entry[]
  cats: readonly Category[]
  year: number
  vatPeriod: VatPeriodKind
  bookStart: string | null
  vatFiled: Readonly<Record<string, string>>
}

/**
 * One row per filing period of the year (§6.5) and the year's total. A period
 * is left out when it ended before the book began, and when it has neither a
 * voucher on the return nor a filed mark, as in the retention package (§8.21).
 */
export function vatYear(input: VatYearInput): VatYear {
  const cats = indexCategories(input.cats)
  const start = bookStartDate(
    input.bookStart,
    input.entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
  )
  const total = { tax: 0, deductible: 0, due: 0 }
  if (!start) return { rows: [], total }

  const rows: VatYearRow[] = []
  for (const period of vatPeriods(input.vatPeriod, input.year)) {
    if (period.to < start) continue
    const inPeriod = filterPeriod(input.entries, asPeriod(period))
    const filed = filedOn(period, input.vatFiled)
    if (!filed && !inPeriod.some((e) => countsOnVatReturn(e, cats))) continue
    const report = vatReport(inPeriod, cats)
    const deductible =
      report.purchases.total.vat + report.euPurchases.deductible
    rows.push({
      period,
      tax: report.due + deductible,
      deductible,
      due: report.due,
      filed,
    })
  }
  for (const row of rows) {
    total.tax += row.tax
    total.deductible += row.deductible
    total.due += row.due
  }
  return { rows, total }
}
