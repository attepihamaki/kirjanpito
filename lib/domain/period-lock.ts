import { paidDate, type TraderType } from "@/lib/domain/open-items"
import { defineRules, evaluate } from "@/lib/domain/rules/engine"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import { countsOnVatReturn } from "@/lib/domain/vat"
import { vatDate, type VatCashBasis } from "@/lib/domain/vat-basis"

/**
 * KPL 2:7: the content of a voucher or a book may not be changed or deleted
 * after a periodic return has been made from it, or after the financial
 * statements are prepared. So an entry the VAT return counts, in a period marked
 * as filed, is read-only, and so is any entry in a year whose Form 5 is marked as
 * filed or which is marked as stored. A fix is a correction entry. An entry the
 * VAT return does not count, such as a YEL payment or a bank fee, was not reported
 * by filing it and stays open until Form 5.
 *
 * Its payment date stays open, since a later payment adds to what is known and
 * alters nothing that was reported. Removing the mark unlocks the entry and
 * shows in the change log.
 */
export type PeriodLock =
  | { kind: "year"; key: string; since: string }
  | { kind: "form5"; key: string; since: string }
  /** Dated in an open year, but paid in a year whose Form 5 is filed. */
  | { kind: "form5Paid"; key: string; since: string }
  | { kind: "filed"; key: string; since: string }
  /** The voucher belongs to an issued invoice, whose number is `key` (§8.27). */
  | { kind: "invoice"; key: string; since: string }

export interface LockMarks {
  vatFiled: Readonly<Record<string, string>>
  yearsArchived: Readonly<Record<string, string>>
  form5Filed: Readonly<Record<string, string>>
  /** Absent means an ammatinharjoittaja (§6.3). */
  traderType?: TraderType
  /** The book's invoices; the entries of an issued one are locked (§8.27). */
  invoices?: readonly InvoiceRef[]
  /** The months VAT is reported on payment (§6.16); a filed period then holds what was paid in it. */
  vatCash?: VatCashBasis | null
}

/** What the invoice lock needs of an invoice. */
export interface InvoiceRef {
  number: number | null
  issuedAt: string | null
  entryIds: readonly string[]
}

/** What the lock rules look at: one voucher's dates against the marks. */
export interface LockContext {
  /** The entry's own date. */
  date: string
  /** The date it was paid, null while open. */
  paid: string | null
  /** Whether the VAT return counts the entry. A filed period holds only these. */
  countsOnVat: boolean
  /** The date the VAT return reads it on (§6.16), null while it is on none; absent means `date`. */
  vatDate?: string | null
  /** The issued invoice the entry belongs to, or null. */
  invoice?: { number: number; since: string } | null
  marks: LockMarks
}

/**
 * KPL 2:7, one rule per mark. A breach is the lock that holds the voucher.
 * The order is the precedence: a stored year, then Form 5, then a filed VAT
 * period, then Form 5 by the year of payment.
 */
export const LOCK_RULES = defineRules<LockContext, PeriodLock>([
  {
    id: "year",
    severity: "blocker",
    source: "KPL 2:7",
    check: ({ date, marks }) => {
      const key = date.slice(0, 4)
      const since = marks.yearsArchived[key]
      return since ? [{ kind: "year", key, since }] : []
    },
  },
  {
    id: "form5",
    severity: "blocker",
    source: "KPL 2:7",
    check: ({ date, marks }) => {
      const key = date.slice(0, 4)
      const since = marks.form5Filed[key]
      return since ? [{ kind: "form5", key, since }] : []
    },
  },
  {
    id: "filed",
    severity: "blocker",
    source: "KPL 2:7",
    check: ({ date: own, vatDate: on, countsOnVat, marks }) => {
      const date = on === undefined ? own : on
      if (!countsOnVat || date === null) return []
      const year = date.slice(0, 4)
      const month = date.slice(0, 7)
      const quarter = `${year}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`
      for (const key of [month, quarter, year]) {
        const since = marks.vatFiled[key]
        if (since) return [{ kind: "filed", key, since }]
      }
      return []
    },
  },
  {
    id: "form5Paid",
    severity: "blocker",
    source: "KPL 2:7, EVL 27 a §",
    check: ({ paid, marks }) => {
      // A liikkeenharjoittaja is read by the entry's own date (§6.3).
      if (marks.traderType === "business") return []
      const key = paid?.slice(0, 4)
      const since = key ? marks.form5Filed[key] : undefined
      return key && since ? [{ kind: "form5Paid", key, since }] : []
    },
  },
  {
    id: "invoice",
    severity: "blocker",
    source: "KPL 2:7",
    check: ({ invoice }) =>
      invoice
        ? [
            {
              kind: "invoice",
              key: String(invoice.number),
              since: invoice.since,
            },
          ]
        : [],
  },
])

/**
 * Each entry's issued invoice, built once per list of invoices: the ledger asks
 * about every row on every render, and a scan of the invoices for each would
 * grow with both.
 */
const invoiceIndexes = new WeakMap<
  readonly InvoiceRef[],
  Map<string, { number: number; since: string }>
>()

function invoiceOf(
  invoices: readonly InvoiceRef[] | undefined,
  entryId: string
): { number: number; since: string } | null {
  if (!invoices || invoices.length === 0) return null
  let index = invoiceIndexes.get(invoices)
  if (!index) {
    index = new Map()
    for (const invoice of invoices) {
      if (invoice.number === null || invoice.issuedAt === null) continue
      for (const id of invoice.entryIds) {
        index.set(id, {
          number: invoice.number,
          since: invoice.issuedAt.slice(0, 10),
        })
      }
    }
    invoiceIndexes.set(invoices, index)
  }
  return index.get(entryId) ?? null
}

/** The first lock that holds the voucher, or null. */
function firstLock(ctx: LockContext): PeriodLock | null {
  return evaluate(LOCK_RULES, ctx)[0]?.data ?? null
}

/**
 * Whichever mark holds this date, the stored year first. A date alone has no
 * payment, so the payment-year lock never applies.
 */
export function lockOn(date: string, marks: LockMarks): PeriodLock | null {
  return firstLock({ date, paid: null, countsOnVat: true, marks })
}

/**
 * Whether changing a payment date would rewrite a year whose Form 5 is filed: the
 * year-end receivables and payables, and an ammatinharjoittaja's result, follow it
 * (§6.3). Paying in a later year, which is what an open invoice usually needs, is
 * fine. Dates are as `paidDate` gives them, null while open.
 */
export function paidChangeHitsForm5(
  before: string | null,
  after: string | null,
  marks: Pick<LockMarks, "form5Filed">
): boolean {
  if (before === after) return false
  const filed = (date: string | null) =>
    date !== null && !!marks.form5Filed[date.slice(0, 4)]
  return filed(before) || filed(after)
}

/**
 * The lock on one entry, if any: a filed period holds only what its return
 * counts. Form 5 reads an entry in the year it was paid (§6.3), so an entry paid
 * in a year whose Form 5 is filed is locked too, whatever year it is dated in.
 * That is a prepayment: paid before the date it carries. A liikkeenharjoittaja
 * is read by the entry's own date, so the payment year adds no lock.
 */
export function entryLock(
  entry: Entry,
  marks: LockMarks,
  cats: CategoryMap
): PeriodLock | null {
  return firstLock({
    date: entry.date,
    paid: paidDate(entry),
    countsOnVat: countsOnVatReturn(entry, cats),
    vatDate: vatDate(entry, cats, marks.vatCash),
    invoice: invoiceOf(marks.invoices, entry.id),
    marks,
  })
}

export function lockedEntries(
  entries: readonly Entry[],
  marks: LockMarks,
  cats: CategoryMap
): Entry[] {
  return entries.filter((e) => entryLock(e, marks, cats) !== null)
}
