/**
 * When Finland's VAT rates changed (§5), so an entry's rate can be checked
 * against its date.
 *
 * Each change replaced one rate with another on a given day. What decides
 * the rate is when the tax falls due, normally the delivery date, so the
 * entry's date is a stand-in: a mismatch is worth a hint, never a refusal.
 * Corrections and credit notes sometimes carry an older rate on purpose.
 */

export interface RateChange {
  /** ISO date the new rate took effect. */
  from: string
  before: number
  after: number
}

export const RATE_CHANGES: readonly RateChange[] = [
  // The general rate.
  { from: "2024-09-01", before: 24, after: 25.5 },
  // The reduced rate for food, restaurants, transport and accommodation.
  { from: "2026-01-01", before: 14, after: 13.5 },
]

/**
 * The rate in force on `date` that corresponds to `rate`: 25,5 % becomes
 * 24 % before September 2024, 14 % becomes 13,5 % from 2026. A rate no
 * change touched, or a date that is not a full ISO date, comes back as is.
 */
export function rateOnDate(rate: number, date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return rate
  let out = rate
  for (const c of RATE_CHANGES) {
    if (date >= c.from && out === c.before) out = c.after
    else if (date < c.from && out === c.after) out = c.before
  }
  return out
}

export type RateMismatch =
  /** The rate had not yet taken effect on that date. */
  | { kind: "notYet"; rate: number; since: string; suggested: number }
  /** The rate had already been replaced by that date. */
  | { kind: "ended"; rate: number; until: string; suggested: number }

/** Why `rate` does not fit `date`, or null when it does. */
export function rateMismatch(rate: number, date: string): RateMismatch | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  for (const c of RATE_CHANGES) {
    if (rate === c.after && date < c.from) {
      return { kind: "notYet", rate, since: c.from, suggested: c.before }
    }
    if (rate === c.before && date >= c.from) {
      return {
        kind: "ended",
        rate,
        until: dayBefore(c.from),
        suggested: c.after,
      }
    }
  }
  return null
}

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d - 1))
  return t.toISOString().slice(0, 10)
}
