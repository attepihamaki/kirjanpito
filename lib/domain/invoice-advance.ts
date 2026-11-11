import { calcEntry } from "@/lib/domain/calc"
import type { Invoice, InvoiceLang, InvoiceRow } from "@/lib/domain/invoice"
import { rowNet } from "@/lib/domain/invoice-calc"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Advance invoices (ennakkolasku, §8.27). An advance invoice is issued and
 * paid like any invoice, but its entries carry `advance`, so the VAT return
 * reads them on the day the money arrived (AVL 15 §, §6.17). The final
 * invoice deducts what was paid of it with a row per category and rate that
 * links back to it, so the final invoice books and taxes only the rest.
 *
 * How much of an advance is left to deduct is worked out from the entries and
 * the other invoices each time and never stored.
 */

/** Whether an invoice is an issued advance invoice. */
function isAdvanceInvoice(invoice: Invoice): boolean {
  return invoice.kind === "advance" && invoice.number !== null
}

/** What was paid of an advance, or is left of it, in one category at one rate. */
export interface AdvancePart {
  catId: string
  vatRate: number
  /** Net cents, without VAT. */
  net: Cents
}

function key(catId: string, vatRate: number): string {
  return `${catId}|${vatRate}`
}

/**
 * The net paid on an advance, by category and rate: its paid entries, less
 * the paid entries of credit notes that credit it. A reminder's charges are
 * not the advance and are left out.
 */
function advancePaid(
  advance: Invoice,
  invoices: readonly Invoice[],
  byId: ReadonlyMap<string, Entry>
): AdvancePart[] {
  const charges = new Set(
    (advance.reminders ?? []).flatMap((r) => r.entryIds ?? [])
  )
  const sources = [
    advance,
    ...invoices.filter((i) => i.credits === advance.id && i.number !== null),
  ]
  const parts = new Map<string, AdvancePart>()
  for (const source of sources) {
    for (const id of source.entryIds) {
      const entry = byId.get(id)
      if (!entry || charges.has(id) || entry.paidOn === null) continue
      const k = key(entry.catId, entry.vatRate)
      const part = parts.get(k) ?? {
        catId: entry.catId,
        vatRate: entry.vatRate,
        net: 0,
      }
      part.net += calcEntry(entry).net
      parts.set(k, part)
    }
  }
  return [...parts.values()].filter((p) => p.net !== 0)
}

/**
 * The net already deducted from an advance by other invoices, by category and
 * rate. A final invoice's deduction rows are negative, so the sum is turned
 * round; a credit note of a final invoice gives its deduction back. With
 * `issuedOnly` drafts are not counted, which is what issuing checks against;
 * the dialog counts drafts too, so two drafts do not both take one advance.
 */
function advanceDeducted(
  advanceId: string,
  invoices: readonly Invoice[],
  exceptId: string | null,
  issuedOnly: boolean
): Map<string, Cents> {
  const out = new Map<string, Cents>()
  for (const invoice of invoices) {
    if (invoice.id === exceptId) continue
    if (issuedOnly && invoice.number === null) continue
    for (const row of invoice.rows) {
      if (row.advance !== advanceId) continue
      const k = key(row.catId, row.vatRate)
      out.set(k, (out.get(k) ?? 0) - rowNet(row))
    }
  }
  return out
}

/** What is left of an advance to deduct, by category and rate; nothing below a cent. */
export function advanceLeft(
  advance: Invoice,
  invoices: readonly Invoice[],
  byId: ReadonlyMap<string, Entry>,
  exceptId: string | null,
  issuedOnly = false
): AdvancePart[] {
  const deducted = advanceDeducted(advance.id, invoices, exceptId, issuedOnly)
  return advancePaid(advance, invoices, byId)
    .map((p) => ({
      ...p,
      net: p.net - (deducted.get(key(p.catId, p.vatRate)) ?? 0),
    }))
    .filter((p) => p.net > 0)
}

/** The issued advances of a customer that still have something to deduct, oldest first. */
export function openAdvances(
  customer: { customerId: string | null; name: string },
  invoices: readonly Invoice[],
  byId: ReadonlyMap<string, Entry>,
  exceptId: string | null
): { advance: Invoice; left: AdvancePart[] }[] {
  const name = customer.name.trim().toLocaleLowerCase("fi")
  return invoices
    .filter(
      (i) =>
        isAdvanceInvoice(i) &&
        i.credits === null &&
        (customer.customerId !== null
          ? i.customerId === customer.customerId
          : i.customer.name.trim().toLocaleLowerCase("fi") === name)
    )
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .flatMap((advance) => {
      const left = advanceLeft(advance, invoices, byId, exceptId)
      return left.length > 0 ? [{ advance, left }] : []
    })
}

const DEDUCTION_TEXT: Record<InvoiceLang, (n: number) => string> = {
  fi: (n) => `Vähennetään ennakkolasku ${n}`,
  en: (n) => `Less advance invoice ${n}`,
}

/**
 * The rows that deduct `left` of an advance on a final invoice: one per
 * category and rate, quantity −1 and the net as the unit price, linked to the
 * advance. A credit note is not given these; it inherits them flipped.
 */
export function deductionRows(
  advance: Invoice,
  left: readonly AdvancePart[],
  lang: InvoiceLang
): InvoiceRow[] {
  return left.map((part) => ({
    description: DEDUCTION_TEXT[lang](advance.number ?? 0),
    quantityMilli: -1000,
    unit: "",
    unitCents: part.net,
    vatRate: part.vatRate,
    catId: part.catId,
    advance: advance.id,
  }))
}

/** What stops an invoice with advance rows being issued. */
export type AdvanceProblem = "advanceOnAdvance" | "advanceTooLarge"

/**
 * An advance invoice deducts nothing, and a final invoice deducts no more of
 * an advance than was paid and not yet deducted by another issued invoice. A
 * credit note gives a deduction back and is checked by its credit limit.
 */
export function advanceProblems(
  invoice: Invoice,
  invoices: readonly Invoice[],
  entries: readonly Entry[]
): AdvanceProblem[] {
  const rows = invoice.rows.filter((r) => r.advance)
  if (rows.length === 0) return []
  if (invoice.kind === "advance") return ["advanceOnAdvance"]
  if (invoice.credits !== null) return []
  const byId = new Map(entries.map((e) => [e.id, e]))
  const wanted = new Map<string, Map<string, Cents>>()
  for (const row of rows) {
    const per = wanted.get(row.advance!) ?? new Map<string, Cents>()
    const k = key(row.catId, row.vatRate)
    per.set(k, (per.get(k) ?? 0) - rowNet(row))
    wanted.set(row.advance!, per)
  }
  for (const [advanceId, per] of wanted) {
    const advance = invoices.find((i) => i.id === advanceId)
    if (!advance || !isAdvanceInvoice(advance)) return ["advanceTooLarge"]
    const left = new Map(
      advanceLeft(advance, invoices, byId, invoice.id, true).map((p) => [
        key(p.catId, p.vatRate),
        p.net,
      ])
    )
    for (const [k, net] of per) {
      if (net > (left.get(k) ?? 0)) return ["advanceTooLarge"]
    }
  }
  return []
}
