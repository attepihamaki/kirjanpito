import { calcEntry } from "@/lib/domain/calc"
import { daysBetween, addDays } from "@/lib/domain/dates"
import type {
  Invoice,
  InvoiceLang,
  InvoiceSettings,
  Reminder,
} from "@/lib/domain/invoice"
import { openEntries } from "@/lib/domain/invoice-status"
import { roundCents } from "@/lib/domain/money"
import { RULES, type RuleTables } from "@/lib/domain/rule-tables"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Payment reminders (§8.27). The amounts are worked out from the invoice's
 * open balance and the day the reminder is made. The reminder is kept on the
 * invoice as a log, and its interest and fee are booked as open income
 * entries of the invoice, so they are a receivable until the customer pays.
 */

/** The category late-payment interest books on: Form 5's financial income. */
export const REMINDER_INTEREST_CAT = "323"

/** The category a reminder fee books on: other operating income. */
export const REMINDER_FEE_CAT = "301"

/** Days a reminder gives to pay, counted from the reminder's date. */
const REMINDER_TERM_DAYS = 7

/**
 * The general late-payment rate in percent on a day (Interest Act 4 §: the
 * reference rate plus 7 points, set for each half-year), or null for a day
 * before the first rate the tables hold: an older rate is not guessed.
 */
export function statutoryRate(
  on: string,
  tables: RuleTables = RULES
): number | null {
  let found: number | null = null
  for (const v of tables.limits.lateInterestRate) {
    if (v.from !== null && v.from <= on) found = v.value
  }
  return found
}

/**
 * The rate a reminder charges: the book's own rate when the seller set one,
 * else the statutory rate on the reminder's day. Null when neither exists.
 */
export function reminderRate(
  settings: Pick<InvoiceSettings, "interestRate">,
  on: string,
  tables: RuleTables = RULES
): number | null {
  return settings.interestRate ?? statutoryRate(on, tables)
}

/**
 * Simple interest on `open` at `rate` percent a year for the whole days from
 * the day after the due date up to `on`, on a 365-day year. Nothing is owed on
 * or before the due date.
 */
export function lateInterest(
  open: Cents,
  dueDate: string,
  on: string,
  rate: number
): Cents {
  const days = daysBetween(dueDate, on)
  if (days <= 0 || open <= 0 || rate <= 0) return 0
  return roundCents((open * rate * days) / 36_500)
}

export interface ReminderFigures {
  open: Cents
  rate: number
  days: number
  interest: Cents
  fee: Cents
  /** What the customer is asked to pay: the balance, the interest and the fee. */
  total: Cents
  newDueDate: string
}

/**
 * What interest is charged on: the invoice's own balance, without the charges
 * of earlier reminders, since interest is not charged on interest. `from` is
 * the day interest runs from, the due date or the last reminder whose interest
 * is still booked, so no day is charged twice.
 */
export interface InterestBasis {
  principal: Cents
  from: string
}

/**
 * The figures for a reminder of `invoice` made on `on` while `open` is owed.
 * Without a basis, interest runs on the whole of `open` from the due date.
 */
export function reminderFigures(
  invoice: Pick<Invoice, "dueDate">,
  open: Cents,
  on: string,
  rate: number,
  fee: Cents,
  basis: InterestBasis = { principal: open, from: invoice.dueDate }
): ReminderFigures {
  const interest = lateInterest(basis.principal, basis.from, on, rate)
  return {
    open,
    rate,
    days: Math.max(0, daysBetween(basis.from, on)),
    interest,
    fee,
    total: open + interest + fee,
    newDueDate: addDays(on, REMINDER_TERM_DAYS),
  }
}

/** The log entry for a reminder, ready to be kept on the invoice. */
export function reminderRecord(
  id: string,
  on: string,
  figures: ReminderFigures,
  entryIds: readonly string[] = []
): Reminder {
  return {
    id,
    date: on,
    open: figures.open,
    rate: figures.rate,
    interest: figures.interest,
    fee: figures.fee,
    newDueDate: figures.newDueDate,
    ...(entryIds.length > 0 ? { entryIds: [...entryIds] } : {}),
  }
}

const CHARGE_WORD: Record<InvoiceLang, string> = {
  fi: "Maksumuistutus, lasku",
  en: "Payment reminder, invoice",
}

/**
 * The open income entries a reminder books (§8.27): the interest on
 * financial income and the fee on other operating income, each outside VAT,
 * dated on the reminder's day. A charge of nothing books nothing.
 */
export function reminderEntries(
  invoice: Pick<Invoice, "number" | "language" | "customer">,
  on: string,
  figures: Pick<ReminderFigures, "interest" | "fee">,
  makeId: () => string
): Entry[] {
  const description = `${CHARGE_WORD[invoice.language]} ${invoice.number ?? ""} – ${invoice.customer.name.trim()}`
  const charges: [string, Cents][] = [
    [REMINDER_INTEREST_CAT, figures.interest],
    [REMINDER_FEE_CAT, figures.fee],
  ]
  return charges
    .filter(([, amount]) => amount > 0)
    .map(([catId, amount]) => ({
      id: makeId(),
      date: on,
      description,
      type: "income" as const,
      catId,
      amount,
      vatRate: 0,
      amountMode: "gross" as const,
      paidOn: null,
    }))
}

/** The ids of the entries an invoice's reminders booked. */
export function chargeIds(invoice: Pick<Invoice, "reminders">): Set<string> {
  return new Set((invoice.reminders ?? []).flatMap((r) => r.entryIds ?? []))
}

/**
 * The interest basis of a new reminder: the unpaid balance of the invoice's
 * own entries, and the day after which interest is not yet charged.
 */
export function interestBasis(
  invoice: Pick<Invoice, "dueDate" | "entryIds" | "reminders">,
  byId: ReadonlyMap<string, Entry>
): InterestBasis {
  const charges = chargeIds(invoice)
  const principal = openEntries(invoice, byId)
    .filter((e) => !charges.has(e.id))
    .reduce((sum, e) => sum + calcEntry(e).gross, 0)
  let from = invoice.dueDate
  for (const r of invoice.reminders ?? []) {
    const booked = (r.entryIds ?? []).some(
      (id) => byId.get(id)?.catId === REMINDER_INTEREST_CAT
    )
    if (booked && r.date > from) from = r.date
  }
  return { principal, from }
}

/** The reminder charges still unpaid, which the user can give up when the customer will not pay them. */
export function openCharges(
  invoice: Pick<Invoice, "entryIds" | "reminders">,
  byId: ReadonlyMap<string, Entry>
): Entry[] {
  const charges = chargeIds(invoice)
  return openEntries(invoice, byId).filter((e) => charges.has(e.id))
}
