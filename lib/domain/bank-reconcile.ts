import { movesBank } from "@/lib/domain/bank-balance"
import type { BankRow, StatementInfo } from "@/lib/domain/bank-csv"
import { signedGross } from "@/lib/domain/calc"
import { paidDate } from "@/lib/domain/open-items"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * A statement set against the book (§8.16): which rows the book has no entry
 * for, which paid entries the statement has no row for, and how far the two
 * movements differ over the statement's days. Worked out each time and never
 * stored.
 */

/** One payment as the book holds it: an entry, or the parts of a split receipt paid together. */
export interface BookPayment {
  entries: Entry[]
  /** The day it was paid. */
  date: string
  /** Signed like a bank row: money in is positive. */
  amount: Cents
}

export interface Reconciliation {
  /** The first and last day compared, ISO. */
  from: string
  to: string
  /** The rows' sum, money in positive. */
  statementMovement: Cents
  /**
   * Opening balance plus the rows less the closing balance, when the
   * statement gives both. Anything but zero means the file lacks rows, or
   * some were skipped.
   */
  statementGap: Cents | null
  /** What the book moved through the bank on those days, the planned rows included. */
  bookMovement: Cents
  /** `statementMovement - bookMovement`: zero when the two agree. */
  difference: Cents
  /** Indexes of rows neither planned for booking nor found in the book. */
  rowsNotInBook: number[]
  /** Payments in the book on those days that no row accounts for. */
  paymentsNotOnStatement: BookPayment[]
}

/**
 * The book's payments through the bank on the days from `from` to `to`,
 * a split receipt's parts paid on one day taken as one payment.
 */
function bookPayments(
  entries: readonly Entry[],
  cats: CategoryMap,
  from: string,
  to: string
): BookPayment[] {
  const byKey = new Map<string, BookPayment>()
  for (const e of entries) {
    const paid = paidDate(e)
    if (paid === null || paid < from || paid > to) continue
    if (!movesBank(e, cats)) continue
    const key = e.split ? `split:${e.split}:${paid}` : `id:${e.id}`
    const payment = byKey.get(key)
    if (payment) {
      payment.entries.push(e)
      payment.amount += signedGross(e)
    } else {
      byKey.set(key, { entries: [e], date: paid, amount: signedGross(e) })
    }
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Set a statement's rows against the book. `planned` holds the indexes of
 * rows the review is about to book, as a new entry or as the payment of an
 * open one: each becomes a payment of the row's amount on the row's day, so
 * the figures show the book as it will be. Every other row is paired with a
 * payment of the same amount paid on its booking or value date, each payment
 * used once.
 */
export function reconcile(
  rows: readonly BankRow[],
  statement: StatementInfo | undefined,
  entries: readonly Entry[],
  cats: CategoryMap,
  planned: ReadonlySet<number>
): Reconciliation | null {
  const dates = rows
    .flatMap((r) => (r.valueDate ? [r.date, r.valueDate] : [r.date]))
    .sort()
  const from = statement?.opening?.date ?? dates[0]
  const to = statement?.closing?.date ?? dates[dates.length - 1]
  if (!from || !to) return null

  const payments = bookPayments(entries, cats, from, to)
  const used = new Set<BookPayment>()
  const rowsNotInBook: number[] = []
  let statementMovement = 0
  let plannedMovement = 0

  rows.forEach((row, i) => {
    statementMovement += row.amount
    if (planned.has(i)) {
      plannedMovement += row.amount
      return
    }
    const days = new Set([row.date, row.valueDate])
    const match = payments.find(
      (p) => !used.has(p) && p.amount === row.amount && days.has(p.date)
    )
    if (match) used.add(match)
    else rowsNotInBook.push(i)
  })

  const bookMovement =
    payments.reduce((sum, p) => sum + p.amount, 0) + plannedMovement
  const { opening, closing } = statement ?? {}
  return {
    from,
    to,
    statementMovement,
    statementGap:
      opening && closing
        ? opening.amount + statementMovement - closing.amount
        : null,
    bookMovement,
    difference: statementMovement - bookMovement,
    rowsNotInBook,
    paymentsNotOnStatement: payments.filter((p) => !used.has(p)),
  }
}
