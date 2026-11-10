import { daysBetween, addDays } from "@/lib/domain/dates"
import type { Invoice, InvoiceSettings, Reminder } from "@/lib/domain/invoice"
import { roundCents } from "@/lib/domain/money"
import { RULES, type RuleTables } from "@/lib/domain/rule-tables"
import type { Cents } from "@/lib/domain/types"

/**
 * Payment reminders (§8.27). The amounts are worked out from the invoice's
 * open balance and the day the reminder is made, and the result is kept on
 * the invoice as a log; nothing is booked.
 */

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

/** The figures for a reminder of `invoice` made on `on` while `open` is owed. */
export function reminderFigures(
  invoice: Pick<Invoice, "dueDate">,
  open: Cents,
  on: string,
  rate: number,
  fee: Cents
): ReminderFigures {
  const interest = lateInterest(open, invoice.dueDate, on, rate)
  return {
    open,
    rate,
    days: Math.max(0, daysBetween(invoice.dueDate, on)),
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
  figures: ReminderFigures
): Reminder {
  return {
    id,
    date: on,
    open: figures.open,
    rate: figures.rate,
    interest: figures.interest,
    fee: figures.fee,
    newDueDate: figures.newDueDate,
  }
}
