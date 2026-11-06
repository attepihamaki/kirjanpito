import { yearOf } from "@/lib/domain/dates"
import { incomeStatement } from "@/lib/domain/income-statement"
import { calcEntry } from "@/lib/domain/calc"
import type { CategoryMap, Cents, Entry } from "@/lib/domain/types"

/**
 * Advance tax (ennakkovero, §8.22): what the user pays in instalments during
 * the year, and a rough check of whether the decision matches the result.
 * Verohallinto sets the yearly amount in the advance tax decision; the app
 * takes it as typed and never works it out.
 */

/** The category that advance tax payments are booked to (line 365). */
export const ADVANCE_TAX_CAT = "365"

/**
 * The yearly amount split over the chosen months, in whole cents. Instalments
 * are equal; the cents that do not divide go on the last one, so the parts
 * always add up to the yearly amount.
 */
export function instalmentAmounts(
  yearly: Cents,
  months: readonly number[]
): ReadonlyMap<number, Cents> {
  const out = new Map<number, Cents>()
  if (months.length === 0 || yearly <= 0) return out
  const base = Math.floor(yearly / months.length)
  months.forEach((m, i) => {
    out.set(
      m,
      i === months.length - 1 ? yearly - base * (months.length - 1) : base
    )
  })
  return out
}

/** An advance tax payment: a line 365 expense. */
function isAdvanceTaxPayment(e: Entry): boolean {
  return e.type === "expense" && e.catId === ADVANCE_TAX_CAT
}

/**
 * The months of `year` that have a line 365 payment booked in them. A month
 * counts as paid when any payment is dated in it, so a booking made a few days
 * early or late still counts.
 */
export function paidMonths(
  entries: readonly Entry[],
  year: number
): ReadonlySet<number> {
  const out = new Set<number>()
  for (const e of entries) {
    if (isAdvanceTaxPayment(e) && yearOf(e.date) === year) {
      out.add(Number(e.date.slice(5, 7)))
    }
  }
  return out
}

/** Everything booked as advance tax in `year`. */
export function advanceTaxPaid(entries: readonly Entry[], year: number): Cents {
  return entries
    .filter((e) => isAdvanceTaxPayment(e) && yearOf(e.date) === year)
    .reduce((sum, e) => sum + calcEntry(e).net, 0)
}

export interface AdvanceTaxEstimate {
  /** The year's profit (358), or 0 for a loss. */
  profit: Cents
  /** `profit` times the user's own rate. */
  tax: Cents
  /** `tax` minus the decision: positive means the decision is too low. */
  gap: Cents
}

/**
 * A rough estimate of the year's tax: the profit at one flat rate the user
 * gives. Business income is taxed on a progressive scale, so the rate is the
 * user's own guess of the overall share, not a rule the app applies. Null
 * without a rate.
 */
export function estimateTax(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  ratePercent: number | null,
  decision: Cents
): AdvanceTaxEstimate | null {
  if (ratePercent === null || !(ratePercent >= 0)) return null
  const profit = Math.max(incomeStatement(entries, cats, year).result, 0)
  const tax = Math.round((profit * ratePercent) / 100)
  return { profit, tax, gap: tax - decision }
}
