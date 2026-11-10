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

/**
 * How far a year's retention has run: the vouchers may be destroyed while the
 * books must still be kept, or everything may be destroyed.
 */
export type RetentionStage = "vouchers" | "books"

/**
 * The years whose records the user holds: the years the book has entries in,
 * and the years archived or marked as stored away, whose material lives
 * outside the book (§8.19). Oldest first.
 */
export function heldYears(
  entries: readonly Entry[],
  archived: Readonly<Record<string, unknown>>,
  stubs: Readonly<Record<string, unknown>> = {}
): number[] {
  const years = new Set(entries.map((e) => yearOf(e.date)))
  for (const key of [...Object.keys(archived), ...Object.keys(stubs)]) {
    if (/^\d{4}$/.test(key)) years.add(Number(key))
  }
  return [...years].sort((a, b) => a - b)
}

/** The stage a year's retention has reached on `today`, or null while all of it must be kept. */
export function retentionStage(
  year: number,
  today: string
): RetentionStage | null {
  const r = retentionDates(year)
  if (r.books < today) return "books"
  if (r.vouchers < today) return "vouchers"
  return null
}

/**
 * The years the retention reminder names (§8.12): a held year whose
 * vouchers, or whose books too, may now be destroyed, unless the user has
 * already noted that stage. Noting the vouchers leaves the books' end to be
 * reminded of in its turn. Oldest first.
 */
export function retentionEnded(
  years: readonly number[],
  today: string,
  noted: Readonly<Record<string, RetentionStage>>
): { year: number; stage: RetentionStage }[] {
  return years.flatMap((year) => {
    const stage = retentionStage(year, today)
    if (stage === null) return []
    const seen = noted[String(year)]
    if (seen === "books" || seen === stage) return []
    return [{ year, stage }]
  })
}
