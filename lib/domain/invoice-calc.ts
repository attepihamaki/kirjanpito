import { isEuSaleKind, lineOf } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import type {
  Customer,
  Invoice,
  InvoiceLang,
  InvoiceRow,
  InvoiceSettings,
  Seller,
} from "@/lib/domain/invoice"
import { buyerRefs, discountField } from "@/lib/domain/invoice"
import { finnishReference } from "@/lib/domain/invoice-reference"
import {
  isInvoiceSaleKind,
  rowSaleKind,
  vatProblems,
  type VatProblem,
} from "@/lib/domain/invoice-vat"
import type { Category, Cents, Entry } from "@/lib/domain/types"

/**
 * Whether an invoice row can book on `cat`: an enabled income category whose
 * kind of sale says which VAT note the invoice prints (`invoice-vat.ts`). The
 * retired "Myynti – EU" does not say whether goods or services were sold.
 */
export function isInvoiceCategory(cat: Category): boolean {
  return (
    cat.enabled &&
    lineOf(cat)?.side === "income" &&
    isInvoiceSaleKind(cat.kind ?? "domestic")
  )
}

/* -------------------------------------------------------------------------
 * Amounts
 * ---------------------------------------------------------------------- */

/** A discount in hundredths of a percent, 0 when there is none. */
function discountBp(discount: number | undefined): bigint {
  return BigInt(discount === undefined ? 0 : Math.round(discount * 100))
}

/**
 * One row's price without VAT: quantity times unit price, less the row's
 * discount and then the document's, rounded to the cent once (§8.27). The
 * sum is worked in integers, so no discount leaves a half cent to chance.
 */
export function rowNet(
  row: Pick<InvoiceRow, "quantityMilli" | "unitCents" | "discount">,
  docDiscount?: number
): Cents {
  const numerator =
    BigInt(Math.round(row.quantityMilli)) *
    BigInt(Math.round(row.unitCents)) *
    (BigInt(10000) - discountBp(row.discount)) *
    (BigInt(10000) - discountBp(docDiscount))
  const denominator = BigInt(1000) * BigInt(10000) * BigInt(10000)
  const negative = numerator < BigInt(0)
  const abs = negative ? -numerator : numerator
  const rounded = Number(
    (abs * BigInt(2) + denominator) / (denominator * BigInt(2))
  )
  return (negative ? -rounded : rounded) + 0
}

/**
 * What the document's discount takes off the rows, in cents: the rows after
 * their own discounts less the same rows after the document's too. The PDF
 * and the dialog print it as one line above the totals.
 */
export function docDiscountCents(
  rows: readonly InvoiceRow[],
  docDiscount: number | undefined
): Cents {
  if (docDiscount === undefined) return 0
  return rows.reduce(
    (sum, row) => sum + rowNet(row) - rowNet(row, docDiscount),
    0
  )
}

/** The rows that book as one entry: the same category and the same VAT rate. */
export interface InvoiceGroup {
  catId: string
  vatRate: number
  net: Cents
  vat: Cents
}

/**
 * The rows grouped by category and rate, in the order they first appear. The
 * VAT of a group is what `calcEntry` gives the entry the group becomes, so the
 * invoice and the VAT return always agree to the cent (§8.27).
 */
export function invoiceGroups(
  rows: readonly InvoiceRow[],
  docDiscount?: number
): InvoiceGroup[] {
  const groups = new Map<string, InvoiceGroup>()
  for (const row of rows) {
    const key = `${row.catId}|${row.vatRate}`
    const group = groups.get(key) ?? {
      catId: row.catId,
      vatRate: row.vatRate,
      net: 0,
      vat: 0,
    }
    group.net += rowNet(row, docDiscount)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    vat: calcEntry({
      amount: group.net,
      vatRate: group.vatRate,
      amountMode: "net",
    }).vat,
  }))
}

export interface RateLine {
  vatRate: number
  net: Cents
  vat: Cents
}

export interface InvoiceTotals {
  net: Cents
  vat: Cents
  gross: Cents
  /** One line per VAT rate, lowest rate first, as the invoice prints them. */
  rates: RateLine[]
}

/** The totals of `rows`, after the document's discount when there is one. */
export function invoiceTotals(
  rows: readonly InvoiceRow[],
  docDiscount?: number
): InvoiceTotals {
  const byRate = new Map<number, RateLine>()
  for (const group of invoiceGroups(rows, docDiscount)) {
    const line = byRate.get(group.vatRate) ?? {
      vatRate: group.vatRate,
      net: 0,
      vat: 0,
    }
    line.net += group.net
    line.vat += group.vat
    byRate.set(group.vatRate, line)
  }
  const rates = [...byRate.values()].sort((a, b) => a.vatRate - b.vatRate)
  const net = rates.reduce((sum, line) => sum + line.net, 0)
  const vat = rates.reduce((sum, line) => sum + line.vat, 0)
  return { net, vat, gross: net + vat, rates }
}

/* -------------------------------------------------------------------------
 * Numbers and dates
 * ---------------------------------------------------------------------- */

/**
 * The next invoice number: one past the highest number used, and never below
 * the series' first number. A draft holds no number, except one reopened for
 * correction, whose number stays reserved. A number is never reused.
 */
export function nextInvoiceNumber(
  invoices: readonly Invoice[],
  firstNumber: number
): number {
  const highest = invoices.reduce(
    (max, i) => Math.max(max, i.number ?? i.reservedNumber ?? 0),
    0
  )
  return Math.max(firstNumber, highest + 1)
}

/* -------------------------------------------------------------------------
 * Issuing
 * ---------------------------------------------------------------------- */

/** What stops an invoice from being issued. The UI words each one. */
export type IssueProblem =
  | "noRows"
  | "badRow"
  | "noCustomer"
  | "customerAddress"
  | "sellerName"
  | "sellerId"
  | "sellerAddress"
  | "sellerIban"
  | "badCategory"
  | "noTotal"
  | "dueBeforeDate"
  | "creditOriginal"
  | "creditTooLarge"
  | VatProblem

/** The business details outside the invoice settings that an invoice needs. */
export interface BusinessDetails {
  name: string | null
  businessId: string | null
  phone: string | null
}

/**
 * What a credit note has already taken off an invoice, in positive cents: the
 * gross of every issued credit note that names it (§8.27).
 */
export function creditedAmount(
  invoice: Invoice,
  invoices: readonly Invoice[]
): Cents {
  return invoices
    .filter((i) => i.credits === invoice.id && i.number !== null)
    .reduce((sum, i) => sum - invoiceTotals(i.rows, i.discount).gross, 0)
}

/** What a credit note may still take off an invoice: its gross less what was credited. */
export function creditableAmount(
  invoice: Invoice,
  invoices: readonly Invoice[]
): Cents {
  return Math.max(
    0,
    invoiceTotals(invoice.rows, invoice.discount).gross -
      creditedAmount(invoice, invoices)
  )
}

export function issueProblems(
  invoice: Invoice,
  settings: InvoiceSettings,
  business: BusinessDetails,
  cats: readonly Category[],
  invoices: readonly Invoice[] = []
): IssueProblem[] {
  const problems: IssueProblem[] = []
  const credit = invoice.credits !== null
  if (invoice.rows.length === 0) problems.push("noRows")
  else if (
    invoice.rows.some(
      (r) =>
        r.description.trim() === "" ||
        (credit ? r.quantityMilli >= 0 : r.quantityMilli <= 0) ||
        r.unitCents < 0
    )
  )
    problems.push("badRow")
  const customer = invoice.customer
  if (customer.name.trim() === "") problems.push("noCustomer")
  else if (customer.street.trim() === "" || customer.city.trim() === "")
    problems.push("customerAddress")
  if (!business.name?.trim()) problems.push("sellerName")
  if (!business.businessId) problems.push("sellerId")
  if (
    settings.street.trim() === "" ||
    settings.postcode.trim() === "" ||
    settings.city.trim() === ""
  )
    problems.push("sellerAddress")
  if (settings.iban === "") problems.push("sellerIban")
  const usable = (catId: string) => {
    const cat = cats.find((c) => c.id === catId)
    return cat !== undefined && isInvoiceCategory(cat)
  }
  if (invoice.rows.some((r) => !usable(r.catId))) problems.push("badCategory")
  problems.push(...vatProblems(invoice.rows, customer, settings.vatRegistered))
  const gross = invoiceTotals(invoice.rows, invoice.discount).gross
  if (invoice.rows.length > 0 && (credit ? gross >= 0 : gross <= 0))
    problems.push("noTotal")
  if (invoice.dueDate < invoice.date) problems.push("dueBeforeDate")
  if (credit) {
    const original = invoices.find((i) => i.id === invoice.credits)
    if (!original || original.number === null) problems.push("creditOriginal")
    else if (-gross > creditableAmount(original, invoices))
      problems.push("creditTooLarge")
  }
  return problems
}

const WORD: Record<InvoiceLang, string> = { fi: "Lasku", en: "Invoice" }
const CREDIT_WORD: Record<InvoiceLang, string> = {
  fi: "Hyvityslasku",
  en: "Credit note",
}

/** The seller as the settings describe it now, as an issued invoice or a quote prints it. */
export function sellerOf(
  settings: Pick<
    InvoiceSettings,
    "street" | "postcode" | "city" | "email" | "iban" | "vatRegistered"
  >,
  business: BusinessDetails
): Seller {
  return {
    name: business.name?.trim() ?? "",
    street: settings.street,
    postcode: settings.postcode,
    city: settings.city,
    country: "FI",
    /* A seller outside the VAT register has a business ID but no VAT number. */
    vatId: settings.vatRegistered
      ? `FI${(business.businessId ?? "").replace("-", "")}`
      : "",
    email: settings.email,
    businessId: business.businessId ?? "",
    phone: business.phone ?? "",
    iban: settings.iban,
    vatRegistered: settings.vatRegistered,
  }
}

export interface IssueInput {
  invoice: Invoice
  settings: InvoiceSettings
  business: BusinessDetails
  /** All invoices of the book, to find the next number. */
  invoices: readonly Invoice[]
  /** ISO date-time of the issue. */
  now: string
  makeId: () => string
  /**
   * For a credit note: the entries of the invoice it credits, which its own
   * entries point at (`reverses`).
   */
  originalEntries?: readonly Entry[]
  /**
   * For a credit note: the entries are booked as paid on their own date,
   * because the credit cancels an invoice nobody had paid (§8.27).
   */
  settled?: boolean
}

export interface IssueResult {
  invoice: Invoice
  entries: Entry[]
}

/**
 * The issued invoice and the open income entries it books. The caller has
 * checked `issueProblems` first. Groups of one invoice share a `split` id, so
 * the ledger knows they came from one document (§4).
 */
export function buildIssue(input: IssueInput): IssueResult {
  const { invoice, settings, business } = input
  const number =
    invoice.reservedNumber ??
    nextInvoiceNumber(input.invoices, settings.firstNumber)
  const reference = finnishReference(number)
  if (reference === null) throw new Error("invoice number out of range")
  const seller = sellerOf(settings, business)
  const groups = invoiceGroups(invoice.rows, invoice.discount)
  const split = groups.length > 1 ? input.makeId() : undefined
  const credit = invoice.credits !== null
  const word = (credit ? CREDIT_WORD : WORD)[invoice.language]
  const description = `${word} ${number} – ${invoice.customer.name.trim()}`
  const originals = input.originalEntries ?? []
  /* An EU sale carries the buyer's number, which the EC Sales List reads (§8.7). */
  const buyerVatId = invoice.customer.vatId.replace(/\s/g, "").toUpperCase()
  const entries: Entry[] = groups.map((group) => {
    const target = credit
      ? (originals.find(
          (e) => e.catId === group.catId && e.vatRate === group.vatRate
        ) ?? originals[0])
      : undefined
    return {
      id: input.makeId(),
      date: invoice.date,
      description,
      type: "income",
      catId: group.catId,
      amount: group.net,
      vatRate: group.vatRate,
      amountMode: "net",
      paidOn: credit && input.settled ? undefined : null,
      ...(split ? { split } : {}),
      ...(target ? { reverses: target.id } : {}),
      ...(buyerVatId && isEuSaleKind(rowSaleKind(group.catId))
        ? { buyerVatId }
        : {}),
    }
  })
  const issued: Invoice = {
    ...invoice,
    number,
    reference,
    seller,
    terms: settings.terms[invoice.language],
    issuedAt: input.now,
    entryIds: entries.map((e) => e.id),
  }
  /* The reserved number is spent. */
  delete issued.reservedNumber
  return { invoice: issued, entries }
}

/**
 * A draft credit note for an issued invoice: the same customer, language and
 * rows with their quantities turned negative, dated `today` (§8.27). The user
 * can then remove or shrink rows to credit part of the invoice.
 */
export function creditDraft(
  original: Invoice,
  id: string,
  today: string
): Invoice {
  return {
    id,
    number: null,
    date: today,
    dueDate: today,
    supplyFrom: null,
    supplyTo: null,
    customerId: original.customerId,
    customer: { ...original.customer },
    language: original.language,
    rows: original.rows.map((r) => ({ ...r, quantityMilli: -r.quantityMilli })),
    ...discountField(original.discount),
    note: "",
    /* The customer's accounts payable matches the credit to its invoice by these. */
    ...buyerRefs(original),
    terms: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    credits: original.id,
  }
}

/**
 * The invoices that own at least one of `entries`, and the customers those
 * invoices were made for. A year archive or an audit package holds only some of
 * the entries, and carries only the invoices that belong with them (§8.27).
 */
export function invoicesOfEntries(
  entries: readonly Entry[],
  invoices: readonly Invoice[],
  customers: readonly Customer[]
): { invoices: Invoice[]; customers: Customer[] } {
  const ids = new Set(entries.map((e) => e.id))
  const kept = invoices.filter((i) => i.entryIds.some((id) => ids.has(id)))
  const used = new Set(kept.map((i) => i.customerId))
  return { invoices: kept, customers: customers.filter((c) => used.has(c.id)) }
}
