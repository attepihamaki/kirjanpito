"use client"

import * as React from "react"

import { useToday } from "@/hooks/use-today"
import { bookStartDate, vatTimeline } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/**
 * The VAT returns waiting to be filed (§8.7): closed periods not marked as
 * filed, and whether any of them is past its due date. None in an archive or
 * the demo book, whose returns are nobody's to file.
 */
export function useVatWaiting(): { count: number; late: boolean } {
  const today = useToday()
  const entries = useBookStore((s) => s.entries)
  const mode = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const bookEnd = useBookStore((s) => s.bookEnd)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const quiet = useBookStore((s) => s.archiveYear !== null || s.demo)

  return React.useMemo(() => {
    if (quiet) return { count: 0, late: false }
    const first = entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
    const waiting = vatTimeline(
      mode,
      bookStartDate(bookStart, first),
      today,
      vatFiled,
      bookEnd
    ).filter((p) => p.status === "due" || p.status === "overdue")
    return {
      count: waiting.length,
      late: waiting.some((p) => p.status === "overdue"),
    }
  }, [quiet, entries, mode, bookStart, bookEnd, today, vatFiled])
}
