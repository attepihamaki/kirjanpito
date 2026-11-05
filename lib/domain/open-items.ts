import { LINE_BY_KEY, type AccountLine } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * When entries are paid (§6.3). KPL 1:1a has a sole trader of either kind able
 * to determine accounts payable and receivable at all times, and EVL 27 a §
 * puts an ammatinharjoittaja's income and expenses in the year of payment, so
 * an entry's date alone does not settle either.
 *
 * `Entry.date` is the delivery or invoice date, which is what the VAT return
 * reads. `Entry.paidOn` is absent when the entry was paid on that date.
 */

/** Lines booked without any money moving: depreciation, provisions, private use and deductions outside the books. */
export const NON_CASH_LINES: ReadonlySet<string> = new Set([
  "312",
  "313",
  "314",
  "315",
  "337",
  "353",
  "354",
  "364-travel",
  "364-car",
])

/**
 * Whether an entry on this line can be paid on another day. A VAT payment, an
 * owner's transfer and a loan movement are themselves the payment, and a
 * non-cash line has no payment at all.
 */
export function canBeUnpaid(line: AccountLine | undefined): boolean {
  if (!line) return true
  if (line.settlement || line.owner || line.loan) return false
  return !NON_CASH_LINES.has(line.key)
}

/** The date an entry was paid, or null while it is open. */
export function paidDate(entry: Pick<Entry, "date" | "paidOn">): string | null {
  return entry.paidOn === undefined ? entry.date : entry.paidOn
}

/** Whether an entry was dated by `date` and not yet paid then. */
export function isOpenAt(
  entry: Pick<Entry, "date" | "paidOn">,
  date: string
): boolean {
  if (entry.date > date) return false
  const paid = paidDate(entry)
  return paid === null || paid > date
}

export interface OpenBalances {
  /** Sales not yet paid, VAT included. */
  receivables: Cents
  /** Purchases not yet paid, VAT included. */
  payables: Cents
  count: number
}

/** Accounts receivable and payable on `date`, from whichever entries are open then. */
export function balancesAt(
  entries: readonly Entry[],
  cats: CategoryMap,
  date: string
): OpenBalances {
  const out: OpenBalances = { receivables: 0, payables: 0, count: 0 }
  for (const e of entries) {
    const cat = cats.get(e.catId)
    if (!canBeUnpaid(cat && LINE_BY_KEY.get(cat.line))) continue
    if (!isOpenAt(e, date)) continue
    const { gross } = calcEntry(e)
    if (e.type === "income") out.receivables += gross
    else out.payables += gross
    out.count += 1
  }
  return out
}

/**
 * Which kind of sole trader keeps the book (§6.3). An ammatinharjoittaja is
 * taxed on payment (EVL 27 a §). A liikkeenharjoittaja has to adjust
 * single-entry books to accrual basis for tax.
 */
export type TraderType = "professional" | "business"

export const TRADER_TYPES: readonly TraderType[] = ["professional", "business"]

/**
 * The entries as the income statement and Form 5 read them (§6.3). An
 * ammatinharjoittaja has each entry placed on its payment date and an open one
 * left out. A liikkeenharjoittaja is read by the entry's own date, paid or not,
 * which is the accrual adjustment.
 */
export function taxBasisEntries(
  entries: readonly Entry[],
  trader: TraderType = "professional"
): readonly Entry[] {
  if (trader === "business") return entries
  return entries.flatMap((e) => {
    const paid = paidDate(e)
    if (paid === null) return []
    return paid === e.date ? [e] : [{ ...e, date: paid }]
  })
}
