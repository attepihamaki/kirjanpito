import type { Invoice, InvoiceRow, Party } from "@/lib/domain/invoice"
import { addDays } from "@/lib/domain/dates"
import { normalizeName } from "@/lib/domain/bank-match"

/**
 * An invoice already issued that the one being made may repeat (§8.4, §8.27).
 * A hint only: a customer billed the same work twice in a week is rare but
 * possible, and an invoice every month is not one, so the dates must be close.
 */

/** How many days apart two otherwise identical invoices may be and still look like one. */
export const NEAR_INVOICE_DAYS = 7

/** What a row says, apart from the words around it: its description, quantity, price and VAT. */
function rowKey(r: InvoiceRow): string {
  return [
    normalizeName(r.description),
    r.quantityMilli,
    r.unitCents,
    r.vatRate,
  ].join("|")
}

/** The rows as one string, in any order, with an empty list never matching. */
function rowsKey(rows: readonly InvoiceRow[]): string | null {
  return rows.length === 0 ? null : rows.map(rowKey).sort().join(";")
}

function sameCustomer(
  a: { customerId: string | null; customer: Party },
  b: { customerId: string | null; customer: Party }
): boolean {
  if (a.customerId !== null && a.customerId === b.customerId) return true
  const name = normalizeName(a.customer.name)
  return name !== "" && name === normalizeName(b.customer.name)
}

/**
 * The issued invoice that `draft` repeats: the same customer, the same rows
 * and an invoice date within `NEAR_INVOICE_DAYS`. Credit notes, the draft
 * itself and an invoice a credit note has since cancelled never count.
 */
export function duplicateInvoice(
  draft: Pick<Invoice, "id" | "date" | "customerId" | "customer" | "rows"> & {
    credits?: string | null
  },
  invoices: readonly Invoice[]
): Invoice | undefined {
  if (draft.credits != null) return undefined
  const key = rowsKey(draft.rows)
  if (key === null || draft.date === "") return undefined
  const credited = new Set(
    invoices.flatMap((i) => (i.credits !== null ? [i.credits] : []))
  )
  return invoices.find(
    (i) =>
      i.id !== draft.id &&
      i.number !== null &&
      i.credits === null &&
      !credited.has(i.id) &&
      sameCustomer(draft, i) &&
      rowsKey(i.rows) === key &&
      i.date >= addDays(draft.date, -NEAR_INVOICE_DAYS) &&
      i.date <= addDays(draft.date, NEAR_INVOICE_DAYS)
  )
}
