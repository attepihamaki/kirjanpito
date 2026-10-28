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
import type { Formatters } from "@/lib/i18n/create-formatters"
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
    return {
      entries,
      catMap,
      year,
      today,
      through: year === thisYear ? today : `${year}-12-31`,
      elapsedMonths,
      yearEntries,
      summary: summary(entries, catMap, year),
      statement: incomeStatement(entries, catMap, year),
      months: monthFigures(entries, catMap, year),
      bookStart,
      timeline: vatTimeline(
        vatPeriod,
        bookStartDate(bookStart, first),
        today,
        vatFiled
      ),
    }
  }, [entries, cats, year, today, vatPeriod, bookStart, vatFiled])

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

/** "Syyskuu 2026", "3. neljännes 2026" or "Vuosi 2026". */
export function periodLabel(f: Formatters, p: VatPeriod): string {
  if (p.kind === "month") return `${f.month(p.index - 1)} ${p.year}`
  if (p.kind === "quarter")
    return f.t("vat.quarterN", { q: p.index, y: p.year })
  return f.t("vat.yearN", { y: p.year })
}

/** The VAT return for one period, and how many entries it was built from. */
export function periodVat(data: OverviewData, p: VatPeriod) {
  const inPeriod = filterPeriod(data.entries, asPeriod(p))
  return { report: vatReport(inPeriod, data.catMap), count: inPeriod.length }
}
