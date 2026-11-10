import { addDays } from "@/lib/domain/dates"
import type { Invoice, InvoiceSettings, Quote } from "@/lib/domain/invoice"
import type { BusinessDetails } from "@/lib/domain/invoice-calc"
import { copyDraft, type DraftContext } from "@/lib/domain/invoice-draft"
import { vatProblems, type VatProblem } from "@/lib/domain/invoice-vat"

/**
 * Quotes (tarjous, §8.34): an offer with rows and prices, valid until a date.
 * A quote books nothing and is not a voucher, so it has a number series of its
 * own and never takes an invoice number. Pure, so the status can be tested
 * without a clock.
 */

/** Days from the quote's date to its last valid day when the user sets none. */
const QUOTE_VALID_DAYS = 30

/** The next quote number: the highest used plus one, from 1. */
export function nextQuoteNumber(quotes: readonly Quote[]): number {
  return quotes.reduce((max, q) => Math.max(max, q.number), 0) + 1
}

/** The day a quote dated `date` is valid until by default. */
export function defaultValidUntil(date: string): string {
  return addDays(date, QUOTE_VALID_DAYS)
}

/**
 * Where a quote stands. Invoiced once an invoice made from it still exists,
 * then the customer's answer, then expired once its last valid day has passed
 * without one, and open until then.
 */
export type QuoteStatus =
  "open" | "expired" | "accepted" | "declined" | "invoiced"

export function quoteStatus(
  quote: Quote,
  invoices: readonly Pick<Invoice, "id">[],
  today: string
): QuoteStatus {
  if (quote.invoiceId && invoices.some((i) => i.id === quote.invoiceId))
    return "invoiced"
  if (quote.outcome) return quote.outcome
  return quote.validUntil < today ? "expired" : "open"
}

/** What stops a quote's PDF from being drawn. */
export type QuoteProblem =
  | "noRows"
  | "badRow"
  | "noCustomer"
  | "sellerName"
  | "sellerAddress"
  | "validBeforeDate"
  | Extract<VatProblem, "zeroRateVat" | "vatUnregistered">

/**
 * The problems that keep a quote from being printed, in the order they are
 * shown. A quote needs less than an invoice: no IBAN or business ID, since
 * nothing is paid on it, and no customer address, since a quote often goes
 * to someone not yet in the register.
 */
export function quoteProblems(
  quote: Pick<Quote, "rows" | "customer" | "date" | "validUntil">,
  settings: Pick<InvoiceSettings, "street" | "postcode" | "city"> &
    Partial<Pick<InvoiceSettings, "vatRegistered">>,
  business: Pick<BusinessDetails, "name">
): QuoteProblem[] {
  const problems: QuoteProblem[] = []
  if (quote.rows.length === 0) problems.push("noRows")
  else if (
    quote.rows.some(
      (r) =>
        r.description.trim() === "" || r.quantityMilli <= 0 || r.unitCents < 0
    )
  )
    problems.push("badRow")
  if (quote.customer.name.trim() === "") problems.push("noCustomer")
  if (!business.name?.trim()) problems.push("sellerName")
  if (
    settings.street.trim() === "" ||
    settings.postcode.trim() === "" ||
    settings.city.trim() === ""
  )
    problems.push("sellerAddress")
  if (quote.validUntil < quote.date) problems.push("validBeforeDate")
  // A quote prints the VAT its invoice will; the buyer's details can wait.
  for (const p of vatProblems(
    quote.rows,
    quote.customer,
    settings.vatRegistered ?? true
  ))
    if (p === "zeroRateVat" || p === "vatUnregistered") problems.push(p)
  return problems
}

/**
 * An invoice draft from a quote, dated `today`: the quote's customer, rows,
 * language and note, the customer's details as the register has them now and
 * a VAT rate that has changed since following the new date (§5).
 */
export function invoiceFromQuote(
  quote: Quote,
  today: string,
  ctx: DraftContext
): Invoice {
  return copyDraft(quote, today, ctx)
}
