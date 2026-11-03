import type { Entry } from "@/lib/domain/types"

/**
 * KPL 2:7: the content of a voucher or a book may not be changed or deleted
 * after a periodic return has been made from it, or after the financial
 * statements are prepared. So an entry in a VAT period marked as filed, or in a
 * year marked as stored, is read-only. A fix is a correction entry.
 *
 * Its payment date stays open, since a later payment adds to what is known and
 * alters nothing that was reported. Removing the mark unlocks the entry and
 * shows in the change log.
 */
export type PeriodLock =
  | { kind: "year"; key: string; since: string }
  | { kind: "filed"; key: string; since: string }

export interface LockMarks {
  vatFiled: Readonly<Record<string, string>>
  yearsArchived: Readonly<Record<string, string>>
}

/** Whichever mark holds this date, the stored year first. */
export function lockOn(date: string, marks: LockMarks): PeriodLock | null {
  const year = date.slice(0, 4)
  const month = date.slice(0, 7)
  const quarter = `${year}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`
  const stored = marks.yearsArchived[year]
  if (stored) return { kind: "year", key: year, since: stored }
  for (const key of [month, quarter, year]) {
    const since = marks.vatFiled[key]
    if (since) return { kind: "filed", key, since }
  }
  return null
}

export function lockedEntries(
  entries: readonly Entry[],
  marks: LockMarks
): Entry[] {
  return entries.filter((e) => lockOn(e.date, marks) !== null)
}
