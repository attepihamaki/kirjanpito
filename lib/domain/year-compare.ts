import { monthOf, yearOf } from "@/lib/domain/dates"
import { incomeStatement } from "@/lib/domain/income-statement"
import { monthFigures, summary } from "@/lib/domain/summary"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/** One month of the year beside the same month of the year before (§6.4). */
export interface CompareRow {
  /** 1 to 12, or 0 on the totals row. */
  month: number
  income: Cents
  incomePrev: Cents
  expense: Cents
  expensePrev: Cents
  result: Cents
  resultPrev: Cents
}

export interface YearComparison {
  previous: number
  months: readonly CompareRow[]
  totals: CompareRow
}

function hasEntries(entries: readonly Entry[], year: number): boolean {
  return entries.some((e) => yearOf(e.date) === year)
}

/** Null while the year before has no entries: there is nothing to compare. */
export function yearComparison(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): YearComparison | null {
  const previous = year - 1
  if (!hasEntries(entries, previous)) return null
  const now = summary(entries, cats, year)
  const prev = summary(entries, cats, previous)
  const result = monthFigures(entries, cats, year).result
  const resultPrev = monthFigures(entries, cats, previous).result

  const months = now.months.map((row, i) => ({
    month: row.month,
    income: row.incomeNet,
    incomePrev: prev.months[i].incomeNet,
    expense: row.expenseNet,
    expensePrev: prev.months[i].expenseNet,
    result: result[i],
    resultPrev: resultPrev[i],
  }))
  return {
    previous,
    months,
    totals: {
      month: 0,
      income: now.totals.incomeNet,
      incomePrev: prev.totals.incomeNet,
      expense: now.totals.expenseNet,
      expensePrev: prev.totals.expenseNet,
      result: incomeStatement(entries, cats, year).result,
      resultPrev: incomeStatement(entries, cats, previous).result,
    },
  }
}

export interface SameTimeLastYear {
  /** The month `through` falls in, 1 to 12. */
  month: number
  /** The result of the year before, from 1.1. to the same day. */
  result: Cents
  /** The result of the same month of the year before. */
  monthResult: Cents
}

/**
 * The year before up to the same day, so a part of this year is never set
 * against all of last year. Null while that year has no entries.
 */
export function sameTimeLastYear(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  through: string
): SameTimeLastYear | null {
  const previous = year - 1
  if (!hasEntries(entries, previous)) return null
  const cutoff = `${previous}${through.slice(4)}`
  const month = monthOf(through)
  return {
    month,
    result: incomeStatement(
      entries.filter((e) => e.date <= cutoff),
      cats,
      previous
    ).result,
    monthResult: monthFigures(entries, cats, previous).result[month - 1],
  }
}
