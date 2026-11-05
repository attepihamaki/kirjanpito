"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { filterPeriod, type Period } from "@/lib/domain/period"
import { indexCategories } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  bookStartDate,
  periodContaining,
  periodStatus,
  vatPeriods,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"
import { useToday } from "@/hooks/use-today"
import { useBookStore } from "@/stores/book-store"

/**
 * The filing period the VAT view is on, with where it stands and its report.
 * The period length is set in Settings (§8.10), and the view's sub-pages
 * (§8.7) share the selected one through the store.
 */
export function useVatPeriod() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const mode = useBookStore((s) => s.vatPeriod)
  const picked = useBookStore((s) => s.vatIndex)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const today = useToday()
  /*
   * One index for the title, the figures and the filed mark, so they can never
   * be about different periods.
   */
  const count = mode === "month" ? 12 : mode === "quarter" ? 4 : 1
  const index = Math.min(
    count,
    Math.max(1, picked ?? periodContaining(mode, today).index)
  )

  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const period: Period = React.useMemo(() => {
    if (mode === "year") return { kind: "year", year }
    if (mode === "quarter") {
      return { kind: "quarter", year, quarter: index as 1 | 2 | 3 | 4 }
    }
    return { kind: "month", year, month: index }
  }, [mode, index, year])

  const report = React.useMemo(
    () => vatReport(filterPeriod(entries, period), catMap),
    [entries, period, catMap]
  )

  const start = React.useMemo(
    () =>
      bookStartDate(
        bookStart,
        entries.reduce<string | null>(
          (min, e) => (min === null || e.date < min ? e.date : min),
          null
        )
      ),
    [bookStart, entries]
  )
  const all = React.useMemo(() => vatPeriods(mode, year), [mode, year])
  const current = all.find((p) => p.index === index) ?? all[0]
  const currentStatus = periodStatus(current, today, vatFiled, start)

  /*
   * A period that ended before the book began owes no return and is left out
   * of the strip, so a business founded in October is not offered January to
   * September. The period on screen always stays, so the strip can never be
   * empty or lose its selected chip; its banner is what explains the period
   * to a user who reached it another way.
   */
  const shown = all.filter(
    (p) =>
      p.index === current.index ||
      periodStatus(p, today, vatFiled, start) !== "before"
  )
  const statuses: VatPeriodStatus[] = shown.map((p) =>
    periodStatus(p, today, vatFiled, start)
  )

  const label =
    mode === "year"
      ? f.t("vat.yearN", { y: year })
      : mode === "quarter"
        ? f.t("vat.quarterN", { q: index, y: year })
        : `${f.month(index - 1)} ${year}`

  return {
    mode,
    label,
    period,
    report,
    periods: shown,
    statuses,
    current,
    currentStatus,
  }
}
