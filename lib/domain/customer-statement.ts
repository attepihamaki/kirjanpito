import { calcEntry } from "@/lib/domain/calc"
import { daysBetween } from "@/lib/domain/dates"
import type { Invoice } from "@/lib/domain/invoice"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * A customer statement (tiliote, §8.29): the customer's issued invoices and
 * credit notes with what each came to, what has been paid and what is open.
 * Every figure is read from the invoice's entries, so a part payment, a
 * reminder's interest and fee and a linked credit all show as the ledger has
 * them.
 */

/** One invoice or credit note on the statement. */
export interface StatementLine {
  invoiceId: string
  number: number
  credit: boolean
  date: string
  /** The due date, or null on a credit note, which has none. */
  dueDate: string | null
  /** Everything the invoice booked: its rows and any reminder charges, gross. */
  total: Cents
  paid: Cents
  open: Cents
  /** Days past the due date while something is open, otherwise 0. */
  overdueDays: number
}

export interface CustomerStatement {
  lines: StatementLine[]
  total: Cents
  paid: Cents
  open: Cents
  /** The part of `open` that is past its due date. */
  overdue: Cents
}

/**
 * Which invoices the statement lists. Without `includePaid` it is every one
 * with something open, whatever its date; with it, every one dated from
 * `from` to `to`, paid or not.
 */
export interface StatementOptions {
  today: string
  includePaid: boolean
  /** ISO dates, inclusive; either may be null for no limit. */
  from: string | null
  to: string | null
}

/** A sale or a credit note's line: the gross of its entries, split into paid and open. */
function lineOf(
  invoice: Invoice & { number: number },
  byId: ReadonlyMap<string, Entry>,
  today: string
): StatementLine {
  let paid = 0
  let open = 0
  for (const id of invoice.entryIds) {
    const entry = byId.get(id)
    if (!entry) continue
    const gross = calcEntry(entry).gross
    if (entry.paidOn === null) open += gross
    else paid += gross
  }
  const credit = invoice.credits !== null
  return {
    invoiceId: invoice.id,
    number: invoice.number,
    credit,
    date: invoice.date,
    dueDate: credit ? null : invoice.dueDate,
    total: paid + open,
    paid,
    open,
    overdueDays:
      !credit && open !== 0
        ? Math.max(0, daysBetween(invoice.dueDate, today))
        : 0,
  }
}

/** The statement of `customerId`, oldest invoice first. */
export function customerStatement(
  customerId: string,
  invoices: readonly Invoice[],
  byId: ReadonlyMap<string, Entry>,
  options: StatementOptions
): CustomerStatement {
  const lines = invoices
    .filter(
      (i): i is Invoice & { number: number } =>
        i.customerId === customerId && i.number !== null
    )
    .map((i) => lineOf(i, byId, options.today))
    .filter((line) =>
      options.includePaid
        ? (options.from === null || line.date >= options.from) &&
          (options.to === null || line.date <= options.to)
        : line.open !== 0
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
  const sum = (pick: (l: StatementLine) => Cents) =>
    lines.reduce((s, l) => s + pick(l), 0)
  return {
    lines,
    total: sum((l) => l.total),
    paid: sum((l) => l.paid),
    open: sum((l) => l.open),
    overdue: sum((l) => (l.overdueDays > 0 ? l.open : 0)),
  }
}
