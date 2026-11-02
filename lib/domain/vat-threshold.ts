import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The turnover limit of VAT liability, per calendar year and excluding VAT
 * (AVL 3 §, vero.fi, "VAT exemption for small businesses"). A seller is liable
 * from the day the current year's turnover exceeds it, and also while the
 * previous year's turnover did.
 */
export const VAT_THRESHOLD: Cents = 2_000_000

/** From here on the overview warns, so that registering is not a surprise. */
export const VAT_THRESHOLD_NEAR: Cents = 1_500_000

export interface VatThreshold {
  year: number
  /** The current calendar year's turnover so far. */
  turnover: Cents
  /** The date a sale took turnover over the limit, this year or last. */
  exceededOn: string | null
  level: "below" | "near" | "over"
}

/**
 * Sales that count towards the limit: line 300, net. A service sold to a
 * business in another EU country is supplied there and does not count. The
 * book cannot tell a service sold outside the EU from an exported good, nor a
 * sale of a fixed asset from any other sale, so those count.
 */
function counts(e: Entry, cats: CategoryMap): boolean {
  return cats.get(e.catId)?.kind !== "euServices"
}

/** The date `sales`, in date order, first add up to more than the limit. */
function dateExceeded(sales: readonly Entry[]): string | null {
  let sum = 0
  for (const e of sales) {
    sum += calcEntry(e).net
    if (sum > VAT_THRESHOLD) return e.date
  }
  return null
}

/**
 * Where a business outside the VAT register stands against the limit, or null
 * when the tracker has nothing to say. The book does not record registration,
 * so a line 300 sale with VAT this year or last is what says the business is
 * registered, and the limit no longer concerns it. With no sales yet there is
 * nothing to track either.
 */
export function vatThreshold(
  entries: readonly Entry[],
  cats: CategoryMap,
  today: string
): VatThreshold | null {
  const year = yearOf(today)
  const recent = entries
    .filter((e) => {
      const y = yearOf(e.date)
      return (
        (y === year || y === year - 1) &&
        e.type === "income" &&
        cats.get(e.catId)?.line === "300"
      )
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  if (recent.length === 0 || recent.some((e) => e.vatRate > 0)) return null

  const ofYear = (y: number) =>
    recent.filter((e) => yearOf(e.date) === y && counts(e, cats))
  const current = ofYear(year)
  const turnover = current.reduce((sum, e) => sum + calcEntry(e).net, 0)
  const exceededOn = dateExceeded(ofYear(year - 1)) ?? dateExceeded(current)
  return {
    year,
    turnover,
    exceededOn,
    level: exceededOn
      ? "over"
      : turnover >= VAT_THRESHOLD_NEAR
        ? "near"
        : "below",
  }
}
