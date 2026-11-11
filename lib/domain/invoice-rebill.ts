import { lineOf, offStatement } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { formatDate } from "@/lib/domain/dates"
import type { Invoice, InvoiceLang, InvoiceRow } from "@/lib/domain/invoice"
import type { Category, CategoryMap, Cents, Entry } from "@/lib/domain/types"

/**
 * Re-billing expenses (edelleenlaskutus, §8.27): a cost the business paid for
 * a customer, such as a train ticket or materials, becomes a row of the
 * customer's invoice. The cost stays an ordinary expense; the row is a sale
 * like any other, so its VAT is the sale's and not the purchase's, and its
 * price starts from the cost without VAT, which the business deducts itself.
 *
 * The row links to the entry with `rebills`, and whether an entry has been
 * billed on is read from the invoices each time, so a deleted draft or a
 * credit note gives the entry back.
 */

/** Whether an expense can be billed on: a cost on the income statement, not money only moving. */
export function isRebillable(entry: Entry, cats: CategoryMap): boolean {
  if (entry.type !== "expense") return false
  const cat = cats.get(entry.catId)
  const line = cat ? lineOf(cat) : undefined
  return line?.side === "expense" && !offStatement(line)
}

/**
 * The invoice that has billed each entry on. A row on an invoice counts one
 * way and a credit note's row the other, so a credited row frees its entry.
 * The newest invoice that still bills an entry is the one named. With
 * `issuedOnly` drafts are not counted, which is what issuing checks against.
 */
export function rebilledBy(
  invoices: readonly Invoice[],
  exceptId: string | null,
  issuedOnly = false
): Map<string, Invoice> {
  const count = new Map<string, number>()
  const by = new Map<string, Invoice>()
  for (const invoice of invoices) {
    if (invoice.id === exceptId) continue
    if (issuedOnly && invoice.number === null) continue
    for (const row of invoice.rows) {
      if (!row.rebills) continue
      const step = row.quantityMilli > 0 ? 1 : -1
      count.set(row.rebills, (count.get(row.rebills) ?? 0) + step)
      if (step > 0) by.set(row.rebills, invoice)
    }
  }
  for (const [id, n] of count) if (n <= 0) by.delete(id)
  return by
}

/** The expenses not yet billed on, newest first. */
export function rebillCandidates(
  entries: readonly Entry[],
  cats: CategoryMap,
  invoices: readonly Invoice[],
  exceptId: string | null
): Entry[] {
  const billed = rebilledBy(invoices, exceptId)
  return entries
    .filter((e) => isRebillable(e, cats) && !billed.has(e.id))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.voucher ?? 0) - (a.voucher ?? 0)
    )
}

/** The cost of an entry without VAT, its business share only (§6.12). */
export function rebillCost(entry: Entry): Cents {
  return calcEntry(entry).net
}

/** A markup is a percent from 0 to 1000, to two decimals. */
export function isMarkup(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1000 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  )
}

/**
 * The row that bills `entry` on: its description and date, one piece at the
 * cost without VAT plus `markup` percent, on the sale's category and rate.
 */
export function rebillRow(
  entry: Entry,
  sale: Pick<Category, "id"> & { vatRate: number },
  markup: number,
  lang: InvoiceLang
): InvoiceRow {
  const cost = rebillCost(entry)
  return {
    description:
      `${entry.description.trim()} ${formatDate(entry.date, lang)}`.trim(),
    quantityMilli: 1000,
    unit: "",
    unitCents: Math.round((cost * (10000 + Math.round(markup * 100))) / 10000),
    vatRate: sale.vatRate,
    catId: sale.id,
    rebills: entry.id,
  }
}

/** What stops an invoice with re-billed rows being issued. */
export type RebillProblem = "rebilledTwice"

/**
 * An entry is billed on once: not twice on one invoice, and not on an
 * invoice when another issued one already bills it. A credit note gives the
 * link back and is checked by its credit limit.
 */
export function rebillProblems(
  invoice: Invoice,
  invoices: readonly Invoice[]
): RebillProblem[] {
  if (invoice.credits !== null) return []
  const ids = invoice.rows.flatMap((r) => (r.rebills ? [r.rebills] : []))
  if (ids.length === 0) return []
  if (new Set(ids).size !== ids.length) return ["rebilledTwice"]
  const billed = rebilledBy(invoices, invoice.id, true)
  return ids.some((id) => billed.has(id)) ? ["rebilledTwice"] : []
}
