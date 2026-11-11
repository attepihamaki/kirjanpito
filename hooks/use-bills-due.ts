"use client"

import * as React from "react"

import { useToday } from "@/hooks/use-today"
import { payablesReport } from "@/lib/domain/payables"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * The bills that need paying now (§8.30): those past their due date and
 * those falling due today or within the week, the earliest first, with their
 * total and how many are overdue or due today. The overview's panel and the
 * top bar's bell read the same list.
 */
export function useBillsDue() {
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const today = useToday()

  return React.useMemo(() => {
    const report = payablesReport(entries, indexCategories(cats), today)
    const bills = report.items.filter(
      (b) => b.group === "overdue" || b.group === "soon"
    )
    const overdue = bills.filter((b) => b.group === "overdue")
    const dueToday = bills.filter((b) => b.due === today)
    const sum = (list: typeof bills) => list.reduce((s, b) => s + b.open, 0)
    return {
      bills,
      total: sum(bills),
      overdue: { count: overdue.length, total: sum(overdue) },
      dueToday: { count: dueToday.length, total: sum(dueToday) },
    }
  }, [entries, cats, today])
}
