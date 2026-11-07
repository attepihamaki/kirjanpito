import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { limitOn, startOf } from "@/lib/domain/rule-tables"
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

/**
 * The purchases a sale dated `date` may be linked to, nearest in date first.
 * Any year qualifies, since a machine is often sold years after it was bought.
 */
export function sellCandidates(
  entries: readonly Entry[],
  cats: CategoryMap,
  date: string
): Entry[] {
  const at = Date.parse(date)
  const distance = (e: Entry) =>
    Number.isNaN(at) ? 0 : Math.abs(Date.parse(e.date) - at)
  return entries
    .filter((e) => e.type === "expense" && isCapital(e, cats))
    .sort(
      (a, b) => distance(a) - distance(b) || (b.voucher ?? 0) - (a.voucher ?? 0)
    )
}

/** One purchase in the asset list, with the sales that name it. */
export interface AssetItem {
  purchase: Entry
  /** The sales linked to the purchase, in date order. Empty while it is in use. */
  sales: Entry[]
}

export interface AssetList {
  items: AssetItem[]
  /** Sales that name no purchase in the list, so no item shows them as sold. */
  unlinkedSales: Entry[]
}

/**
 * The list of what the pool holds (§8.8): every purchase dated up to the end
 * of `through`, with the sales linked to it by `Entry.sells` and dated by
 * then. The list is a record for an accountant. The pool's balance is worked
 * out from the sums alone, so a missing or wrong link changes no figure.
 */
export function assetList(
  entries: readonly Entry[],
  cats: CategoryMap,
  through: number
): AssetList {
  const byDate = (a: Entry, b: Entry) =>
    a.date.localeCompare(b.date) || (a.voucher ?? 0) - (b.voucher ?? 0)
  const capital = entries
    .filter((e) => yearOf(e.date) <= through && isCapital(e, cats))
    .sort(byDate)
  const items: AssetItem[] = capital
    .filter((e) => e.type === "expense")
    .map((purchase) => ({ purchase, sales: [] }))
  const byId = new Map(items.map((item) => [item.purchase.id, item]))
  const unlinkedSales: Entry[] = []
  for (const sale of capital) {
    if (sale.type !== "income") continue
    const item = sale.sells === undefined ? undefined : byId.get(sale.sells)
    if (item) item.sales.push(sale)
    else unlinkedSales.push(sale)
  }
  return { items, unlinkedSales }
}

/** The maximum for a balance in a year: a quarter of it, or all of a small one. */
export function maximumDepreciation(base: Cents, year: number): Cents {
  const on = startOf(year)
  if (base <= limitOn("depreciationSmallBalance", on)) return base
  return Math.trunc((base * limitOn("depreciationPercent", on)) / 100)
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
    const maximum = maximumDepreciation(base, year)
    // Depreciation above the maximum is not deductible, so it leaves the pool alone.
    const closing = Math.max(0, base - Math.min(taken, maximum))
    out.push({
      year,
      opening: openingNow,
      additions,
      disposals,
      base,
      saleExcess: Math.max(0, -raw),
      maximum,
      taken,
      closing,
    })
    balance = closing
  }
  return out
}

/**
 * The most depreciation each year of the register allows, for
 * `StatementOptions.depreciationMax`. A year before the register starts, or
 * every year while it has no purchase and no opening balance, is absent and so
 * not capped.
 */
export function depreciationMaximums(
  entries: readonly Entry[],
  cats: CategoryMap,
  opening: AssetOpening | null,
  through: number
): ReadonlyMap<number, Cents> {
  return new Map(
    assetSchedule(entries, cats, opening, through).map((y) => [
      y.year,
      y.maximum,
    ])
  )
}
