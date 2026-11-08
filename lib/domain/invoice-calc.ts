import { lineOf } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import type {
  Invoice,
  InvoiceLang,
  InvoiceRow,
  InvoiceSettings,
  Seller,
} from "@/lib/domain/invoice"
import { finnishReference } from "@/lib/domain/invoice-reference"
import { roundCents } from "@/lib/domain/money"
import type { Category, Cents, Entry } from "@/lib/domain/types"

/* -------------------------------------------------------------------------
 * Amounts
 * ---------------------------------------------------------------------- */

/** One row's price without VAT: quantity times unit price, to the cent. */
export function rowNet(
  row: Pick<InvoiceRow, "quantityMilli" | "unitCents">
): Cents {
  return roundCents((row.quantityMilli * row.unitCents) / 1000)
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
export function invoiceGroups(rows: readonly InvoiceRow[]): InvoiceGroup[] {
  const groups = new Map<string, InvoiceGroup>()
  for (const row of rows) {
    const key = `${row.catId}|${row.vatRate}`
    const group = groups.get(key) ?? {
      catId: row.catId,
      vatRate: row.vatRate,
      net: 0,
      vat: 0,
    }
    group.net += rowNet(row)
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

export function invoiceTotals(rows: readonly InvoiceRow[]): InvoiceTotals {
  const byRate = new Map<number, RateLine>()
  for (const group of invoiceGroups(rows)) {
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
 * the series' first number. Drafts hold no number, and a number is never reused.
 */
export function nextInvoiceNumber(
  invoices: readonly Invoice[],
  firstNumber: number
): number {
  const highest = invoices.reduce((max, i) => Math.max(max, i.number ?? 0), 0)
  return Math.max(firstNumber, highest + 1)
}

/** The ISO date `days` days after `iso`. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
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

/** The business details outside the invoice settings that an invoice needs. */
export interface BusinessDetails {
  name: string | null
  businessId: string | null
  phone: string | null
}

export function issueProblems(
  invoice: Invoice,
  settings: InvoiceSettings,
  business: BusinessDetails,
  cats: readonly Category[]
): IssueProblem[] {
  const problems: IssueProblem[] = []
  if (invoice.rows.length === 0) problems.push("noRows")
  else if (
    invoice.rows.some(
      (r) =>
        r.description.trim() === "" || r.quantityMilli <= 0 || r.unitCents < 0
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
  /* Only a domestic income category fits: EU and reverse-charge sales need more than this invoice carries. */
  const usable = (catId: string) => {
    const cat = cats.find((c) => c.id === catId)
    return (
      cat !== undefined &&
      cat.enabled &&
      lineOf(cat)?.side === "income" &&
      cat.kind === "domestic"
    )
  }
  if (invoice.rows.some((r) => !usable(r.catId))) problems.push("badCategory")
  if (invoice.rows.length > 0 && invoiceTotals(invoice.rows).gross <= 0)
    problems.push("noTotal")
  if (invoice.dueDate < invoice.date) problems.push("dueBeforeDate")
  return problems
}

const WORD: Record<InvoiceLang, string> = { fi: "Lasku", en: "Invoice" }

export interface IssueInput {
  invoice: Invoice
  settings: InvoiceSettings
  business: BusinessDetails
  /** All invoices of the book, to find the next number. */
  invoices: readonly Invoice[]
  /** ISO date-time of the issue. */
  now: string
  makeId: () => string
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
  const number = nextInvoiceNumber(input.invoices, settings.firstNumber)
  const reference = finnishReference(number)
  if (reference === null) throw new Error("invoice number out of range")
  const seller: Seller = {
    name: business.name?.trim() ?? "",
    street: settings.street,
    postcode: settings.postcode,
    city: settings.city,
    country: "FI",
    vatId: `FI${(business.businessId ?? "").replace("-", "")}`,
    email: settings.email,
    businessId: business.businessId ?? "",
    phone: business.phone ?? "",
    iban: settings.iban,
  }
  const groups = invoiceGroups(invoice.rows)
  const split = groups.length > 1 ? input.makeId() : undefined
  const description = `${WORD[invoice.language]} ${number} – ${invoice.customer.name.trim()}`
  const entries: Entry[] = groups.map((group) => ({
    id: input.makeId(),
    date: invoice.date,
    description,
    type: "income",
    catId: group.catId,
    amount: group.net,
    vatRate: group.vatRate,
    amountMode: "net",
    paidOn: null,
    ...(split ? { split } : {}),
  }))
  return {
    invoice: {
      ...invoice,
      number,
      reference,
      seller,
      issuedAt: input.now,
      entryIds: entries.map((e) => e.id),
    },
    entries,
  }
}
