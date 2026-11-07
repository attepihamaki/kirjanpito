import { calcEntry } from "@/lib/domain/calc"
import { parseCsvDate } from "@/lib/domain/dates"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Accrual and deferral of an entry's cost or income over the days it covers
 * (§6.3). A liikkeenharjoittaja has single-entry books adjusted to accrual
 * basis for tax, so a twelve-month insurance paid in November is spread over
 * the two years it covers. The VAT return never reads the period.
 */

const DAY_MS = 86_400_000

/** Days since the epoch of an ISO date, or null when it is not a real date. */
function dayNumber(iso: string): number | null {
  if (parseCsvDate(iso) !== iso) return null
  const [y, m, d] = iso.split("-").map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

function isoOfDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

/** The days an entry covers, first to last day included, or null when it has no valid period. */
export function periodDays(
  entry: Pick<Entry, "periodFrom" | "periodTo">
): { from: number; to: number } | null {
  if (!entry.periodFrom || !entry.periodTo) return null
  const from = dayNumber(entry.periodFrom)
  const to = dayNumber(entry.periodTo)
  if (from === null || to === null || to < from) return null
  return { from, to }
}

/** Whether both dates are real and the period does not end before it starts. */
export function isPeriod(from: string, to: string): boolean {
  return periodDays({ periodFrom: from, periodTo: to }) !== null
}

export interface PeriodPart {
  /** The first day of the period that falls in this calendar year. */
  date: string
  amount: Cents
}

/**
 * Splits `amount` over the calendar years of the period, in proportion to the
 * days in each. The shares are differences of rounded running totals, so they
 * always add up to `amount` exactly.
 */
export function spreadByDays(
  amount: Cents,
  period: { from: number; to: number }
): PeriodPart[] {
  const total = period.to - period.from + 1
  const parts: PeriodPart[] = []
  let start = period.from
  let given = 0
  while (start <= period.to) {
    const year = new Date(start * DAY_MS).getUTCFullYear()
    const end = Math.min(period.to, Date.UTC(year, 11, 31) / DAY_MS)
    const upTo = Math.round((amount * (end - period.from + 1)) / total)
    parts.push({ date: isoOfDay(start), amount: upTo - given })
    given = upTo
    start = end + 1
  }
  return parts
}

/**
 * The entry as one entry per calendar year of its period, each carrying that
 * year's share of the net amount. An entry with no valid period, or whose
 * period lies in one year, is returned as it is, dated by `date`.
 *
 * A part is net, without the business share or EU flag, so `calcEntry` reads
 * back exactly the share.
 */
export function accrueEntry(entry: Entry): Entry[] {
  const period = periodDays(entry)
  if (!period) return [entry]
  const first = new Date(period.from * DAY_MS).getUTCFullYear()
  const last = new Date(period.to * DAY_MS).getUTCFullYear()
  if (first === last) return [{ ...entry, date: isoOfDay(period.from) }]

  const rest: Entry = { ...entry }
  delete rest.share
  delete rest.euPurchase
  return spreadByDays(calcEntry(entry).net, period).map((part) => ({
    ...rest,
    date: part.date,
    amount: part.amount,
    amountMode: "net" as const,
  }))
}
