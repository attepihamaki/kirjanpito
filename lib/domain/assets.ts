import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The register of machinery and equipment (§8.8), one pool as the tax rules
 * have it (EVL 30 §): new purchases join what is left of the earlier ones, a
 * sale reduces it, and the year's depreciation is at most 25 % of the result.
 * Once that is 1 200 € or less, all of it may go at once.
 *
 * Nothing is stored here but the opening balance. A purchase is an entry on
 * `asset-purchase` and a sale one on `asset-sale`, so each has its voucher
 * number and receipt, and depreciation is what the year's entries on line 337
 * add up to. Line 337 is read as this pool's, so a year with none simply
 * carries the whole balance forward.
 */

export const DEPRECIATION_PERCENT = 25
/** At or below this, the whole balance may be depreciated at once. */
export const SMALL_BALANCE: Cents = 120_000

/** The undepreciated balance when the register starts. */
export interface AssetOpening {
  /** The balance is the one at the start of this year. */
  year: number
  amount: Cents
}

export interface AssetYear {
  year: number
  opening: Cents
  additions: Cents
  disposals: Cents
  /** Opening + additions − disposals, never below zero. */
  base: Cents
  /** A sale above the balance: that part of the price is taxable income. */
  saleExcess: Cents
  /** The most that may be depreciated this year. */
  maximum: Cents
  /** What the year's entries on line 337 add up to. */
  taken: Cents
  closing: Cents
}

function lineKey(e: Entry, cats: CategoryMap): string | undefined {
  return cats.get(e.catId)?.line
}

function isCapital(e: Entry, cats: CategoryMap): boolean {
  return LINE_BY_KEY.get(lineKey(e, cats) ?? "")?.capital === true
}

/** The year's purchases and sales, in date order. */
export function assetEntries(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): Entry[] {
  return entries
    .filter((e) => yearOf(e.date) === year && isCapital(e, cats))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The maximum for a balance: a quarter of it, or all of a small one. */
export function maximumDepreciation(base: Cents): Cents {
  if (base <= SMALL_BALANCE) return base
  return Math.trunc((base * DEPRECIATION_PERCENT) / 100)
}

/**
 * The pool year by year, up to `through`, from the opening balance or the
 * first purchase. Empty while there is neither.
 */
export function assetSchedule(
  entries: readonly Entry[],
  cats: CategoryMap,
  opening: AssetOpening | null,
  through: number
): AssetYear[] {
  const capital = entries.filter((e) => isCapital(e, cats))
  const years = capital.map((e) => yearOf(e.date))
  if (opening) years.push(opening.year)
  if (years.length === 0) return []

  const out: AssetYear[] = []
  let balance: Cents = 0
  for (let year = Math.min(...years); year <= through; year++) {
    const openingNow =
      balance + (opening && opening.year === year ? opening.amount : 0)
    let additions = 0
    let disposals = 0
    for (const e of capital) {
      if (yearOf(e.date) !== year) continue
      if (e.type === "expense") additions += calcEntry(e).net
      else disposals += calcEntry(e).net
    }
    const taken = entries
      .filter((e) => yearOf(e.date) === year && lineKey(e, cats) === "337")
      .reduce((sum, e) => sum + calcEntry(e).net, 0)
    const raw = openingNow + additions - disposals
    const base = Math.max(0, raw)
    const closing = Math.max(0, base - taken)
    out.push({
      year,
      opening: openingNow,
      additions,
      disposals,
      base,
      saleExcess: Math.max(0, -raw),
      maximum: maximumDepreciation(base),
      taken,
      closing,
    })
    balance = closing
  }
  return out
}
