import { calcEntry } from "@/lib/domain/calc"
import type { Invoice } from "@/lib/domain/invoice"
import { creditedAmount, invoiceTotals } from "@/lib/domain/invoice-calc"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Where an invoice stands (§8.27). It is worked out from the entries each time
 * and never stored, so a payment set from the ledger, the bank import or the
 * invoice view all show up the same way.
 */
export type InvoiceStatus =
  | "draft"
  | "open"
  | "overdue"
  | "paid"
  /* A credit note, whatever has become of its own entries. */
  | "credit"
  /* An invoice a credit note or notes have taken in full. */
  | "credited"

/** The entries of an invoice that are still unpaid. */
export function openEntries(
  invoice: Invoice,
  byId: ReadonlyMap<string, Entry>
): Entry[] {
  return invoice.entryIds.flatMap((id) => {
    const entry = byId.get(id)
    return entry && entry.paidOn === null ? [entry] : []
  })
}

/** What is still owed on an invoice: the gross of its unpaid entries. */
export function openAmount(
  invoice: Invoice,
  byId: ReadonlyMap<string, Entry>
): Cents {
  return openEntries(invoice, byId).reduce(
    (sum, entry) => sum + calcEntry(entry).gross,
    0
  )
}

export function invoiceStatus(
  invoice: Invoice,
  byId: ReadonlyMap<string, Entry>,
  today: string,
  invoices: readonly Invoice[] = []
): InvoiceStatus {
  if (invoice.number === null) return "draft"
  if (invoice.credits !== null) return "credit"
  const gross = invoiceTotals(invoice.rows).gross
  if (gross > 0 && creditedAmount(invoice, invoices) >= gross) return "credited"
  if (openEntries(invoice, byId).length === 0) return "paid"
  return invoice.dueDate < today ? "overdue" : "open"
}
