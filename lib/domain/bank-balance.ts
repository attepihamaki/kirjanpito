import { signedGross } from "@/lib/domain/calc"
import { NON_CASH_LINES, paidDate } from "@/lib/domain/open-items"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The balance of the business's bank account, as the user read it from the
 * bank on one date (§8.12). The app has no connection to a bank, so this is
 * the only real figure it has, and everything after that date is an estimate.
 */
export interface BankBalance {
  amount: Cents
  /** ISO date the balance was read. Entries on this day are taken to be in it. */
  date: string
}

export interface BankEstimate {
  /** How many entries moved the balance. */
  count: number
  /** Income minus expenses, VAT included, since the balance was read. */
  movement: Cents
  /** The balance plus the movement. */
  estimate: Cents
}

/**
 * Whether a paid entry moved money through the bank account. One paid in
 * cash never did, and a non-cash line moves no money at all.
 */
export function movesBank(e: Entry, catMap: CategoryMap): boolean {
  if (e.cash) return false
  const line = catMap.get(e.catId)?.line
  return !(line && NON_CASH_LINES.has(line))
}

/**
 * The balance carried forward through the entries paid after it, up to today.
 * An open entry and a payment still to come stay out. This drifts between
 * readings with anything the book does not record, such as tax payments other
 * than booked VAT. The owner's transfers count once booked (§6.7).
 */
export function bankEstimate(
  balance: BankBalance,
  entries: readonly Entry[],
  catMap: CategoryMap,
  today: string
): BankEstimate {
  let count = 0
  let movement = 0
  for (const e of entries) {
    const paid = paidDate(e)
    if (paid === null || paid <= balance.date || paid > today) continue
    if (!movesBank(e, catMap)) continue
    count += 1
    movement += signedGross(e)
  }
  return { count, movement, estimate: balance.amount + movement }
}
