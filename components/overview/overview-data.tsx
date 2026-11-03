"use client"

import * as React from "react"

import { monthOf, todayIso, yearOf } from "@/lib/domain/dates"
import {
  incomeStatement,
  type IncomeStatement,
} from "@/lib/domain/income-statement"
import { filterPeriod } from "@/lib/domain/period"
import {
  monthFigures,
  summary,
  type MonthFigures,
  type Summary,
} from "@/lib/domain/summary"
import {
  sameTimeLastYear,
  type SameTimeLastYear,
} from "@/lib/domain/year-compare"
import {
  indexCategories,
  type CategoryMap,
  type Entry,
} from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  asPeriod,
  bookStartDate,
  vatTimeline,
  type TimelinePeriod,
  type VatPeriod,
} from "@/lib/domain/vat-deadline"
import { useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

/**
 * Everything the overview's widgets read, computed once per change rather
 * than once per widget. The figures are for the selected year (§8.12); the
 * VAT timeline is not, because a due date belongs to today: December's
 * return falls due in the February after it.
 */
export interface OverviewData {
  entries: readonly Entry[]
  catMap: CategoryMap
  year: number
  today: string
  /** The last day the year's figures cover: today in the current year. */
  through: string
  /** Months of the year that have begun: 12 for a past year, 0 for a future one. */
  elapsedMonths: number
  yearEntries: readonly Entry[]
  summary: Summary
  statement: IncomeStatement
  /** VAT and result for each month of the year, January first. */
  months: MonthFigures
  /** The year before up to the same day, or null with no entries for it (§8.12). */
  lastYear: SameTimeLastYear | null
  /** The month the bookkeeping began, from Settings, or null. */
  bookStart: string | null
  timeline: readonly TimelinePeriod[]
}

const OverviewDataContext = React.createContext<OverviewData | null>(null)

export function OverviewDataProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const basis = useTaxBasisEntries()
  const today = todayIso()

  const value = React.useMemo<OverviewData>(() => {
    const catMap = indexCategories(cats)
    const yearEntries = entries.filter((e) => yearOf(e.date) === year)
    const thisYear = yearOf(today)
    const elapsedMonths =
      year < thisYear ? 12 : year > thisYear ? 0 : monthOf(today)
    const first = entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
    const through = year === thisYear ? today : `${year}-12-31`
    return {
      entries,
      catMap,
      year,
      today,
      through,
      elapsedMonths,
      yearEntries,
      summary: summary(basis, catMap, year),
      statement: incomeStatement(basis, catMap, year),
      months: monthFigures(entries, catMap, year, basis),
      lastYear: sameTimeLastYear(basis, catMap, year, through),
      bookStart,
      timeline: vatTimeline(
        vatPeriod,
        bookStartDate(bookStart, first),
        today,
        vatFiled
      ),
    }
  }, [entries, basis, cats, year, today, vatPeriod, bookStart, vatFiled])

  return (
    <OverviewDataContext.Provider value={value}>
      {children}
    </OverviewDataContext.Provider>
  )
}

export function useOverviewData(): OverviewData {
  const value = React.useContext(OverviewDataContext)
  if (!value) throw new Error("useOverviewData outside OverviewDataProvider")
  return value
}

export { periodLabel } from "@/lib/i18n/period-label"

/** The VAT return for one period, and how many entries it was built from. */
export function periodVat(data: OverviewData, p: VatPeriod) {
  const inPeriod = filterPeriod(data.entries, asPeriod(p))
  return { report: vatReport(inPeriod, data.catMap), count: inPeriod.length }
}
