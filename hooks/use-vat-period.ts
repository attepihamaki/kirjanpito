"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { filterPeriod, type Period } from "@/lib/domain/period"
import { indexCategories } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  bookStartDate,
  periodStatus,
  vatPeriods,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"
import { todayIso } from "@/lib/domain/dates"
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
  const index = useBookStore((s) => s.vatIndex)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const today = todayIso()

  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const period: Period = React.useMemo(() => {
    if (mode === "year") return { kind: "year", year }
    if (mode === "quarter") {
      return {
        kind: "quarter",
        year,
        quarter: Math.min(4, Math.max(1, index)) as 1 | 2 | 3 | 4,
      }
    }
    return { kind: "month", year, month: Math.min(12, Math.max(1, index)) }
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
  const periods = React.useMemo(() => vatPeriods(mode, year), [mode, year])
  const statuses: VatPeriodStatus[] = periods.map((p) =>
    periodStatus(p, today, vatFiled, start)
  )
  const current = periods.find((p) => p.index === index) ?? periods[0]
  const currentStatus = periodStatus(current, today, vatFiled, start)

  const label =
    mode === "year"
      ? f.t("vat.yearN", { y: year })
      : mode === "quarter"
        ? f.t("vat.quarterN", { q: index, y: year })
        : `${f.month(index - 1)} ${year}`

  return { mode, label, report, periods, statuses, current, currentStatus }
}
