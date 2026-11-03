import type { CategoryMap, Entry } from "@/lib/domain/types"
import { countsOnVatReturn } from "@/lib/domain/vat"

/**
 * KPL 2:7: the content of a voucher or a book may not be changed or deleted
 * after a periodic return has been made from it, or after the financial
 * statements are prepared. So an entry the VAT return counts, in a period marked
 * as filed, is read-only, and so is any entry in a year marked as stored. A fix
 * is a correction entry. An entry the return does not count, such as a YEL
 * payment or a bank fee, was not reported by filing it and stays open.
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

/** The lock on one entry, if any: a filed period holds only what its return counts. */
export function entryLock(
  entry: Entry,
  marks: LockMarks,
  cats: CategoryMap
): PeriodLock | null {
  const lock = lockOn(entry.date, marks)
  if (lock?.kind === "filed" && !countsOnVatReturn(entry, cats)) return null
  return lock
}

export function lockedEntries(
  entries: readonly Entry[],
  marks: LockMarks,
  cats: CategoryMap
): Entry[] {
  return entries.filter((e) => entryLock(e, marks, cats) !== null)
}
