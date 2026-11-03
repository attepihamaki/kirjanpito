import { yearOf } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"

/**
 * When Form 5 is due, by tax year, added by hand from Verohallinto's yearly
 * announcement (vero.fi, "Instructions for filing"). A year not listed has no
 * date here rather than a guessed one.
 */
const FORM5_DUE: Readonly<Record<number, string>> = {
  2025: "2026-04-01",
}

export function form5Due(taxYear: number): string | null {
  return FORM5_DUE[taxYear] ?? null
}

export interface Form5Reminder {
  taxYear: number
  /** Null while Verohallinto's date for the year is not in the table. */
  due: string | null
}

/**
 * Last year's return, while it can still be due and is not marked as filed: up
 * to its date, or the end of April for a year whose date is not known. A year
 * with no entries has nothing to prompt from, though Form 5 is due with no
 * activity too.
 */
export function form5Reminder(
  entries: readonly Entry[],
  today: string,
  filed: Readonly<Record<string, string>> = {}
): Form5Reminder | null {
  const taxYear = yearOf(today) - 1
  if (filed[String(taxYear)]) return null
  if (!entries.some((e) => yearOf(e.date) === taxYear)) return null
  const due = form5Due(taxYear)
  const until = due ?? `${taxYear + 1}-04-30`
  return today <= until ? { taxYear, due } : null
}
