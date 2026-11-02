import { yearOf } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"

/**
 * How long a closed financial year has to be kept (KPL 2:10, and vero.fi,
 * "Kirjanpito, tilikausi, verokausi"). The books, päiväkirja and pääkirja
 * included, for 10 years from the end of the financial year; the vouchers
 * for 6 years from the end of the year in which it ended. The financial year
 * here is the calendar year, so both run to a 31 December.
 */
export function retentionDates(year: number): {
  books: string
  vouchers: string
} {
  return { books: `${year + 10}-12-31`, vouchers: `${year + 6}-12-31` }
}

/**
 * The closed years the overview reminds the user to put away (§8.12): years
 * before today's with entries, not marked as stored in `archived`, and still
 * inside the retention of their books. Oldest first.
 */
export function yearsToArchive(
  entries: readonly Entry[],
  today: string,
  archived: Readonly<Record<string, string>>
): number[] {
  const thisYear = yearOf(today)
  const years = new Set(entries.map((e) => yearOf(e.date)))
  return [...years]
    .filter(
      (y) =>
        y < thisYear &&
        !(String(y) in archived) &&
        retentionDates(y).books >= today
    )
    .sort((a, b) => a - b)
}
