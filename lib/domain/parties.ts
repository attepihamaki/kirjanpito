import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { isCustomer, isSupplier, type Customer } from "@/lib/domain/invoice"
import { balancesAt, type OpenBalances } from "@/lib/domain/open-items"
import type { Cents, CategoryMap, Entry, EntryType } from "@/lib/domain/types"

/**
 * The counterparty register (§8.29): customers and suppliers in one list,
 * kept in `customers.json`. An entry names its party by `Entry.party`; the
 * description stays the user's own text, so a book read without the register
 * still makes sense.
 */

/** Whether a party takes part on this side: a sale needs a customer, a cost a supplier. */
export function partyFitsSide(
  party: Pick<Customer, "role">,
  type: EntryType
): boolean {
  return type === "income" ? isCustomer(party) : isSupplier(party)
}

/**
 * The category and rate an entry for `party` on `type`'s side starts with:
 * the party's own category for that side when it is still enabled and on the
 * right side, and the party's rate or else the category's. Null when the
 * party sets no usable category.
 */
export function partyDefaults(
  party: Customer,
  type: EntryType,
  cats: CategoryMap
): { catId: string; vatRate: number } | null {
  const id = type === "income" ? party.incomeCat : party.expenseCat
  const cat = id ? cats.get(id) : undefined
  if (!cat || !cat.enabled || LINE_BY_KEY.get(cat.line)?.side !== type)
    return null
  return { catId: cat.id, vatRate: party.vatRate ?? cat.vatRate }
}

/** The register entry an entry names, or undefined for none or one since deleted. */
export function partyOf(
  entry: Pick<Entry, "party">,
  parties: readonly Customer[]
): Customer | undefined {
  return entry.party === undefined
    ? undefined
    : parties.find((p) => p.id === entry.party)
}

export interface PartySummary {
  /** The party's entries dated in the year, newest first. */
  entries: Entry[]
  /** Gross sales and gross costs in the year. */
  sales: Cents
  costs: Cents
  /** What is open with the party today, across every year. */
  open: OpenBalances
}

/** What one party's view shows (§8.29): the year's vouchers with totals, and what is open today. */
export function partySummary(
  partyId: string,
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  today: string
): PartySummary {
  const own = entries.filter((e) => e.party === partyId)
  const ofYear = own
    .filter((e) => yearOf(e.date) === year)
    .sort((a, b) => b.date.localeCompare(a.date))
  let sales = 0
  let costs = 0
  for (const e of ofYear) {
    const { gross } = calcEntry(e)
    if (e.type === "income") sales += gross
    else costs += gross
  }
  return {
    entries: ofYear,
    sales,
    costs,
    open: balancesAt(own, cats, today),
  }
}
