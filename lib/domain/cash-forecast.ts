import { movesBank } from "@/lib/domain/bank-balance"
import { signedGross } from "@/lib/domain/calc"
import { addDays } from "@/lib/domain/dates"
import type { Customer, Invoice, RecurringInvoice } from "@/lib/domain/invoice"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import { nextRecurringDate } from "@/lib/domain/invoice-draft"
import {
  dueRecurring,
  monthKey,
  recurringToEntry,
  type RecurringEntry,
} from "@/lib/domain/recurring"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The cash-flow forecast (§8.12): the bank balance today carried forward week
 * by week through the money the book already knows is coming or going. It is
 * an estimate from the book alone: anything not booked, scheduled or owed on
 * a return is not in it.
 */

/** How many weeks ahead the overview looks. */
export const FORECAST_WEEKS = 13

/** Where an expected payment comes from. */
export type FlowKind =
  | "receivable"
  | "bill"
  | "recurring"
  | "recurringInvoice"
  | "vat"
  | "advanceTax"

export interface Flow {
  kind: FlowKind
  /** ISO date the money is expected to move; an overdue one is moved to today. */
  date: string
  /** Signed: money in is positive, money out negative. */
  amount: Cents
  label: string
  /** Whether its own date had already passed. */
  overdue: boolean
}

/** A tax payment the caller has worked out: a VAT return or an advance tax instalment. */
export interface TaxPayment {
  kind: "vat" | "advanceTax"
  date: string
  /** What is paid, positive; a VAT refund is negative. */
  amount: Cents
  label: string
}

export interface ForecastInput {
  today: string
  /** The bank balance today, or null when the user has given none. */
  balance: Cents | null
  entries: readonly Entry[]
  catMap: CategoryMap
  invoices: readonly Invoice[]
  recurring: readonly RecurringEntry[]
  recurringInvoices: readonly RecurringInvoice[]
  customers: readonly Customer[]
  /** The book's payment term, for a customer that sets none. */
  termDays: number
  taxes: readonly TaxPayment[]
  weeks?: number
}

export interface ForecastWeek {
  /** ISO dates, inclusive. */
  start: string
  end: string
  in: Cents
  out: Cents
  /** The balance at the end of the week. */
  balance: Cents
}

export interface CashForecast {
  /** The balance the forecast starts from: the bank balance, or 0 without one. */
  start: Cents
  /** Whether `start` is a real balance rather than 0. */
  hasBalance: boolean
  flows: Flow[]
  weeks: ForecastWeek[]
  /** The week whose closing balance is lowest, the first of equals. */
  lowest: ForecastWeek
  /** Overdue receivables counted in the first week. */
  overdueIn: Cents
  /** Overdue bills and returns counted in the first week. */
  overdueOut: Cents
}

/** The months from `from`'s month to `to`'s, as `YYYY-MM` keys. */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  const last = to.slice(0, 7)
  for (;;) {
    const key = monthKey(y, m)
    out.push(key)
    if (key >= last) return out
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
}

/** A flow dated `date`, moved to `today` when its date has passed. */
function flowOn(
  kind: FlowKind,
  date: string,
  amount: Cents,
  label: string,
  today: string
): Flow {
  const overdue = date < today
  return { kind, date: overdue ? today : date, amount, label, overdue }
}

/**
 * The open entries: an invoice's by its due date, a bill by its own due date
 * and anything else by its date. Entries that move no money through the bank
 * (cash, non-cash lines) stay out, as they do from the bank estimate.
 */
function openFlows(input: ForecastInput, end: string): Flow[] {
  const invoiceDue = new Map<string, Invoice>()
  for (const invoice of input.invoices)
    for (const id of invoice.entryIds) invoiceDue.set(id, invoice)
  const out: Flow[] = []
  for (const e of input.entries) {
    if (e.paidOn !== null) continue
    if (!movesBank(e, input.catMap)) continue
    const invoice = invoiceDue.get(e.id)
    const date = invoice?.dueDate ?? e.due ?? e.date
    if (date > end) continue
    const amount = signedGross(e)
    out.push(
      flowOn(
        amount >= 0 ? "receivable" : "bill",
        date,
        amount,
        e.description,
        input.today
      )
    )
  }
  return out
}

/** Recurring entries not yet booked, on their dates from today to `end`. */
function recurringFlows(input: ForecastInput, end: string): Flow[] {
  const out: Flow[] = []
  let n = 0
  for (const month of monthsBetween(input.today, end)) {
    for (const r of dueRecurring(input.recurring, month, input.entries)) {
      const entry = recurringToEntry(r, month, () => `forecast-${n++}`)
      if (entry.date < input.today || entry.date > end) continue
      if (!movesBank(entry, input.catMap)) continue
      out.push({
        kind: "recurring",
        date: entry.date,
        amount: signedGross(entry),
        label: entry.description,
        overdue: false,
      })
    }
  }
  return out
}

/** Invoices the recurring templates will make, paid on their due dates up to `end`. */
function recurringInvoiceFlows(input: ForecastInput, end: string): Flow[] {
  const out: Flow[] = []
  for (const t of input.recurringInvoices) {
    if (t.paused) continue
    const customer = input.customers.find((c) => c.id === t.customerId)
    const term = customer?.termDays ?? input.termDays
    const gross = invoiceTotals(t.rows, t.discount).gross
    for (
      let date = t.next;
      date <= end && (t.until === null || date <= t.until);
      date = nextRecurringDate(t, date)
    ) {
      const due = addDays(date, term)
      if (due > end) break
      if (due < input.today) continue
      out.push({
        kind: "recurringInvoice",
        date: due,
        amount: gross,
        label: t.customer.name,
        overdue: false,
      })
    }
  }
  return out
}

export function cashForecast(input: ForecastInput): CashForecast {
  const weekCount = input.weeks ?? FORECAST_WEEKS
  const end = addDays(input.today, weekCount * 7 - 1)
  const taxFlows = input.taxes
    .filter((t) => t.date <= end && t.amount !== 0)
    .map((t) => flowOn(t.kind, t.date, -t.amount, t.label, input.today))
  const flows = [
    ...openFlows(input, end),
    ...recurringFlows(input, end),
    ...recurringInvoiceFlows(input, end),
    ...taxFlows,
  ].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount)

  const start = input.balance ?? 0
  let balance = start
  const weeks: ForecastWeek[] = []
  for (let i = 0; i < weekCount; i++) {
    const from = addDays(input.today, i * 7)
    const to = addDays(from, 6)
    let cashIn = 0
    let cashOut = 0
    for (const flow of flows) {
      if (flow.date < from || flow.date > to) continue
      if (flow.amount >= 0) cashIn += flow.amount
      else cashOut += flow.amount
    }
    balance += cashIn + cashOut
    weeks.push({ start: from, end: to, in: cashIn, out: cashOut, balance })
  }
  const lowest = weeks.reduce((low, w) => (w.balance < low.balance ? w : low))
  const overdue = flows.filter((f) => f.overdue)
  return {
    start,
    hasBalance: input.balance !== null,
    flows,
    weeks,
    lowest,
    overdueIn: overdue
      .filter((f) => f.amount > 0)
      .reduce((s, f) => s + f.amount, 0),
    overdueOut: overdue
      .filter((f) => f.amount < 0)
      .reduce((s, f) => s + f.amount, 0),
  }
}
