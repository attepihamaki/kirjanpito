import { SALES } from "@/lib/domain/accounts"
import type { InvoiceRow } from "@/lib/domain/invoice"
import type { SalesKind } from "@/lib/domain/types"

/**
 * How VAT is treated on an invoice (§8.27): a domestic sale with the rate the
 * row carries, a zero-rated sale with the note the law asks for instead of the
 * rate, or a sale by a seller outside the VAT register, which shows no VAT at
 * all. The wording follows Verohallinto's guidance "Laskutusvaatimukset
 * arvonlisäverotuksessa" (AVL 209 e §, sections 6.1.4, 6.1.10 and 6.1.19).
 */

/** The kinds of sale an invoice row can book on. The retired "eu" kind does not say which note applies. */
export type InvoiceSaleKind = Exclude<SalesKind, "eu">

/**
 * The note an invoice prints for each treatment it contains, in this order.
 * "unregistered" is the seller's own: it replaces every other note.
 */
export type VatNote =
  "euGoods" | "euServices" | "nonEu" | "reverse" | "unregistered"

const NOTE_ORDER: readonly VatNote[] = [
  "euGoods",
  "euServices",
  "nonEu",
  "reverse",
]

/**
 * The kind of sale a row books as. Every category that is not one of the
 * built-in sales categories is domestic, which is how custom income
 * categories are made (§5), so the kind needs no category map and an issued
 * invoice reads the same however the categories are renamed later.
 */
export function rowSaleKind(catId: string): SalesKind {
  return SALES.find((s) => s.id === catId)?.kind ?? "domestic"
}

/** Whether an invoice row may book on a category of this kind. */
export function isInvoiceSaleKind(
  kind: SalesKind | undefined
): kind is InvoiceSaleKind {
  return kind !== undefined && kind !== "eu"
}

/** A sale whose VAT is not charged on the invoice: the rate is always 0. */
export function isZeroRated(kind: SalesKind): boolean {
  return kind !== "domestic"
}

/**
 * The buyer accounts for the VAT: the invoice shows neither the rate nor the
 * amount (section 6.1.10). An exempt sale of goods to another EU country or
 * outside the EU is not reverse charge and may show its 0 %.
 */
export function isReverseCharge(kind: SalesKind): boolean {
  return kind === "euServices" || kind === "reverse"
}

/** The buyer's VAT number must be on the invoice (section 6.1.4). */
function needsBuyerVatId(kind: SalesKind): boolean {
  return kind === "euGoods" || kind === "euServices" || kind === "reverse"
}

/** A sale to a buyer abroad: the customer's country is not Finland. */
function isSaleAbroad(kind: SalesKind): boolean {
  return kind === "euGoods" || kind === "euServices" || kind === "nonEu"
}

/** The notes an invoice with these rows prints, each once, in a fixed order. */
export function vatNotes(
  rows: readonly Pick<InvoiceRow, "catId">[],
  vatRegistered: boolean
): VatNote[] {
  if (!vatRegistered) return ["unregistered"]
  const kinds = new Set(rows.map((r) => rowSaleKind(r.catId)))
  return NOTE_ORDER.filter((note) => kinds.has(note as SalesKind))
}

/** What stops a set of rows from going on an invoice, beyond the rows themselves. */
export type VatProblem =
  "zeroRateVat" | "vatUnregistered" | "buyerVatId" | "buyerCountry"

/**
 * The VAT problems of a sale document's rows and buyer. A registered seller's
 * zero-rated row must carry rate 0, a reverse-charge or EU sale needs the
 * buyer's VAT number, and a sale abroad needs a buyer abroad. A seller outside
 * the register sells domestically at rate 0 only, since every other kind is a
 * registered seller's.
 */
export function vatProblems(
  rows: readonly Pick<InvoiceRow, "catId" | "vatRate">[],
  buyer: { vatId: string; country: string },
  vatRegistered: boolean
): VatProblem[] {
  const kinds = rows.map((r) => rowSaleKind(r.catId))
  if (!vatRegistered) {
    return rows.some((r, i) => r.vatRate !== 0 || kinds[i] !== "domestic")
      ? ["vatUnregistered"]
      : []
  }
  const problems: VatProblem[] = []
  if (rows.some((r, i) => isZeroRated(kinds[i]) && r.vatRate !== 0))
    problems.push("zeroRateVat")
  if (kinds.some(needsBuyerVatId) && buyer.vatId.trim() === "")
    problems.push("buyerVatId")
  if (
    kinds.some(isSaleAbroad) &&
    (buyer.country.trim().toUpperCase() || "FI") === "FI"
  )
    problems.push("buyerCountry")
  return problems
}
