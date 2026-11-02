import type { Cents } from "@/lib/domain/types"

/**
 * Deductions a sole trader works out rather than gets a receipt for (§8.8),
 * booked on line 354, deductible expenses outside the books.
 *
 * Mileage and per diems are an additional deduction: the tax-free amount for
 * the year, minus the actual costs already in the books, and nothing when
 * those are higher (Vero, "Liikkeen- ja ammatinharjoittajien sekä
 * maataloudenharjoittajien matkakustannusten vähentäminen").
 */

export interface TravelRates {
  /** Tax-free kilometre allowance for a car of one's own, per km. */
  km: Cents
  /** Trips over 10 hours. */
  fullPerDiem: Cents
  /** Trips over 6 hours. */
  partialPerDiem: Cents
}

/** Vero's yearly decisions on tax-exempt allowances for business travel. */
const TRAVEL: Readonly<Record<number, TravelRates>> = {
  2024: { km: 57, fullPerDiem: 5100, partialPerDiem: 2400 },
  2025: { km: 59, fullPerDiem: 5300, partialPerDiem: 2400 },
  2026: { km: 55, fullPerDiem: 5400, partialPerDiem: 2500 },
  2027: { km: 58, fullPerDiem: 5500, partialPerDiem: 2500 },
}

export type HomeOfficeTier = "full" | "part" | "occasional"

export const HOME_OFFICE_TIERS: readonly HomeOfficeTier[] = [
  "full",
  "part",
  "occasional",
]

/** The home office deduction, from Vero's confirmed amounts for each year. */
const HOME_OFFICE: Readonly<Record<number, Record<HomeOfficeTier, Cents>>> = {
  2025: { full: 98_000, part: 49_000, occasional: 24_500 },
  2026: { full: 98_000, part: 49_000, occasional: 24_500 },
}

/** Null for a year whose decision the app does not have. */
export function travelRates(year: number): TravelRates | null {
  return TRAVEL[year] ?? null
}

/** Null for a year whose decision the app does not have. */
export function homeOfficeAmounts(
  year: number
): Readonly<Record<HomeOfficeTier, Cents>> | null {
  return HOME_OFFICE[year] ?? null
}

/** What the allowance leaves after the costs already in the books. */
export function additionalDeduction(allowance: Cents, booked: Cents): Cents {
  return Math.max(0, allowance - Math.max(0, booked)) + 0
}

export function mileageAllowance(km: number, rates: TravelRates): Cents {
  return Math.round(km * rates.km)
}

export function perDiemAllowance(
  fullDays: number,
  partialDays: number,
  rates: TravelRates
): Cents {
  return fullDays * rates.fullPerDiem + partialDays * rates.partialPerDiem
}

/**
 * The date of an entry calculated for `year`: today within that year, so it
 * is not flagged as a future date, and otherwise the year's last day.
 */
export function calculatedEntryDate(year: number, today: string): string {
  return today.startsWith(`${year}-`) ? today : `${year}-12-31`
}
