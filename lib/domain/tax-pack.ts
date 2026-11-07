import type { BookFinding } from "@/lib/domain/book-check"
import { filterPeriod } from "@/lib/domain/period"
import type { TaxFormSection } from "@/lib/domain/tax-form"
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

/**
 * The yearly tax return pack (§8.8): Form 5's filled fields, the year's VAT by
 * filing period and what is still open, on one printable page. Everything here
 * is pure; the view only lays it out.
 */

/**
 * Form 5 reduced to what the user types into OmaVero: every field with an
 * amount and the totals that apply. Groups, empty fields and sections left with
 * no row are dropped, so the page stays short.
 */
export function filledSections(
  sections: readonly TaxFormSection[]
): TaxFormSection[] {
  const out: TaxFormSection[] = []
  for (const section of sections) {
    const rows = section.rows.filter(
      (row) =>
        row.kind === "field" && (row.total ? !row.unused : row.value !== 0)
    )
    if (rows.length) out.push({ ...section, rows })
  }
  return out
}

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

/**
 * The findings that belong on the year's page: the ones about the year itself
 * and the ones about the book as a whole, such as unsaved changes. Findings
 * about other years are left out.
 */
export function packFindings(
  findings: readonly BookFinding[],
  year: number
): BookFinding[] {
  return findings.filter((b) => b.year === year || b.year === null)
}
