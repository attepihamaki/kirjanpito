import { calcEntry } from "@/lib/domain/calc"
import { isoDate } from "@/lib/domain/dates"
import { descriptionKey } from "@/lib/domain/entry-suggest"
import { matchRecurring, type RecurringEntry } from "@/lib/domain/recurring"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Bills that came every month and have not come this month (§8.12). Nothing
 * is set up: a cost booked in each of the three months before a month is
 * expected in that month too, and the overview says so once its usual day has
 * passed. It catches the receipt that was never booked, the commonest gap in
 * a sole trader's book.
 */

/** How many months in a row before a month make a bill expected in it. */
const BILL_HISTORY_MONTHS = 3

/** Days past the latest day the bill has come on before it counts as missing. */
const BILL_GRACE_DAYS = 5

/** A bill expected in a month that has no entry for it. */
export interface MissingBill {
  /** What the bill is known by; also what an ignore stores. */
  key: string
  /** `"2026-11"`, the month it is missing from. */
  month: string
  /** The latest entry of the bill, for its description and to book from. */
  last: Entry
  /** The middle of the last three gross amounts. */
  expected: Cents
  /** The latest day of the month it has come on. */
  day: number
}

/**
 * A bill's key: its counterparty when the entry names one, otherwise its
 * description without case, spacing or numbers, so "Puhelin 10/2026" and
 * "Puhelin 11/2026" are one bill. Empty for an entry that cannot be told apart.
 */
export function billKey(entry: Entry): string {
  if (entry.party) return `party:${entry.party}`
  const text = descriptionKey(entry.description)
  return /\p{L}/u.test(text) ? `text:${text}` : ""
}

/** The ignore that covers one month only. */
export function monthIgnore(key: string, month: string): string {
  return `${key}@${month}`
}

/**
 * Entries that can be a bill: costs the user booked. A VAT payment, a split
 * part and an entry made from a recurring template are left out, the last
 * because the recurring reminder already covers it.
 */
function isBill(entry: Entry, recurring: readonly RecurringEntry[]): boolean {
  return (
    entry.type === "expense" &&
    !entry.settles &&
    !entry.split &&
    matchRecurring(recurring, entry) === undefined
  )
}

function monthIndex(key: string): number {
  return Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1
}

function monthAt(index: number): string {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

function lastDay(month: string): number {
  for (let d = 31; d > 27; d--) {
    if (isoDate(Number(month.slice(0, 4)), Number(month.slice(5, 7)), d)) {
      return d
    }
  }
  return 28
}

/**
 * The day a missing bill is booked on: today, or the missing month's last day
 * when the month is over, so the entry lands in the month it belongs to.
 */
export function billDate(month: string, today: string): string {
  const end = `${month}-${String(lastDay(month)).padStart(2, "0")}`
  return today < end ? today : end
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * The bills missing from last month or this month, oldest first. A month is
 * checked when each of the `BILL_HISTORY_MONTHS` months before it has the
 * bill; this month only once its latest usual day plus `BILL_GRACE_DAYS` has
 * passed. A bill missing from last month is not reported for this month as
 * well, since its run is already broken. `ignored` holds keys, for good, and
 * `key@month` for one month.
 */
export function missingBills(
  entries: readonly Entry[],
  today: string,
  recurring: readonly RecurringEntry[] = [],
  ignored: readonly string[] = []
): MissingBill[] {
  const now = monthIndex(today)
  const oldest = now - 1 - BILL_HISTORY_MONTHS
  const byKey = new Map<string, Map<number, Entry[]>>()
  for (const e of entries) {
    const m = monthIndex(e.date)
    if (m < oldest || m > now || !isBill(e, recurring)) continue
    const key = billKey(e)
    if (!key) continue
    const months = byKey.get(key) ?? new Map<number, Entry[]>()
    months.set(m, [...(months.get(m) ?? []), e])
    byKey.set(key, months)
  }

  const skip = new Set(ignored)
  const out: MissingBill[] = []
  for (const [key, months] of byKey) {
    if (skip.has(key)) continue
    for (const target of [now - 1, now]) {
      if (months.has(target)) continue
      const history: Entry[][] = []
      for (let m = target - BILL_HISTORY_MONTHS; m < target; m++) {
        const found = months.get(m)
        if (found) history.push(found)
      }
      if (history.length < BILL_HISTORY_MONTHS) continue
      const month = monthAt(target)
      if (skip.has(monthIgnore(key, month))) continue
      const day = Math.max(
        ...history.flat().map((e) => Number(e.date.slice(8, 10)))
      )
      if (
        target === now &&
        Number(today.slice(8, 10)) <=
          Math.min(day + BILL_GRACE_DAYS, lastDay(month))
      ) {
        continue
      }
      /* Two bills from one party in a month count as their total. */
      const totals = history.map((list) =>
        list.reduce((sum, e) => sum + calcEntry(e).gross, 0)
      )
      const latest = [...history[history.length - 1]].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
      out.push({
        key,
        month,
        last: latest[latest.length - 1],
        expected: median(totals),
        day,
      })
      break
    }
  }
  return out.sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.last.description.localeCompare(b.last.description, "fi")
  )
}
