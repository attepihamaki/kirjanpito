import { signedGross } from "@/lib/domain/calc"
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

/** Lines booked without any money moving: depreciation, provisions, private use and deductions outside the books. */
const NON_CASH_LINES: ReadonlySet<string> = new Set([
  "312",
  "313",
  "314",
  "315",
  "337",
  "353",
  "354",
])

export interface BankEstimate {
  /** How many entries moved the balance. */
  count: number
  /** Income minus expenses, VAT included, since the balance was read. */
  movement: Cents
  /** The balance plus the movement. */
  estimate: Cents
}

/**
 * The balance carried forward through the entries dated after it, up to today.
 * A future-dated entry has not happened yet, so it stays out. An entry is dated
 * by its invoice or receipt rather than by its payment, so this drifts between
 * readings, as it does with anything the book does not record: tax payments,
 * private withdrawals and the owner's own deposits.
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
    if (e.date <= balance.date || e.date > today) continue
    const line = catMap.get(e.catId)?.line
    if (line && NON_CASH_LINES.has(line)) continue
    count += 1
    movement += signedGross(e)
  }
  return { count, movement, estimate: balance.amount + movement }
}
