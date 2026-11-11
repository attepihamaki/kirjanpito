import { addDays } from "@/lib/domain/dates"
import {
  buyerRefs,
  type BuyerRefs,
  discountField,
  type DocDiscount,
  type Customer,
  Invoice,
  InvoiceLang,
  InvoiceRow,
  type Party,
  type Product,
  type RecurringInvoice,
} from "@/lib/domain/invoice"
import { monthKey, recurringDate } from "@/lib/domain/recurring"
import { rateOnDate } from "@/lib/domain/vat-rates"

/**
 * New drafts made from something that already exists (§8.27): a copy of an
 * invoice, a recurring invoice's next draft, and an invoice row filled from
 * the product register. Pure, so the schedule can be tested without a clock.
 */

/** What a draft is made from: an invoice, a quote or a recurring template. */
interface DraftSource extends BuyerRefs, DocDiscount {
  customerId: string | null
  customer: Party
  language: InvoiceLang
  rows: readonly InvoiceRow[]
  note: string
}

/** What making a draft needs besides its source. */
export interface DraftContext {
  /** The book's payment term, for a customer that sets none. */
  termDays: number
  customers: readonly Customer[]
  makeId: () => string
}

/** The party's details as the register holds them now, or as `source` has them. */
function partyOf(source: DraftSource, customers: readonly Customer[]): Party {
  const customer = customers.find((c) => c.id === source.customerId)
  if (!customer) return { ...source.customer }
  return {
    name: customer.name,
    street: customer.street,
    postcode: customer.postcode,
    city: customer.city,
    country: customer.country,
    vatId: customer.vatId,
    email: customer.email,
  }
}

/**
 * A draft dated `date` from `source`. The due date follows the customer's
 * term, and a VAT rate that changed since the source was written follows the
 * date, as it does in the entry dialog (§5). The source's "Your reference"
 * wins over the register customer's default, and its order number is kept.
 */
function draftOf(
  source: DraftSource,
  date: string,
  ctx: DraftContext
): Invoice {
  const customer = ctx.customers.find((c) => c.id === source.customerId)
  return {
    id: ctx.makeId(),
    number: null,
    date,
    dueDate: addDays(date, customer?.termDays ?? ctx.termDays),
    supplyFrom: null,
    supplyTo: null,
    customerId: customer ? customer.id : null,
    customer: partyOf(source, ctx.customers),
    language: source.language,
    rows: source.rows.map((r) => ({
      ...r,
      vatRate: rateOnDate(r.vatRate, date),
    })),
    ...discountField(source.discount),
    note: source.note,
    ...buyerRefs({
      buyerReference: source.buyerReference ?? customer?.reference,
      orderNumber: source.orderNumber,
    }),
    terms: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    credits: null,
  }
}

/** Whether an invoice can be copied: a credit note cannot, since its rows only make sense against the invoice it credits. */
export function canCopy(invoice: Invoice): boolean {
  return invoice.credits === null
}

/**
 * A new draft with an invoice's or a quote's customer, rows, note and "Your
 * reference", dated `today`. The supply period, number, order number and
 * reminders are left behind: they belong to what was copied.
 */
export function copyDraft(
  source: DraftSource,
  today: string,
  ctx: DraftContext
): Invoice {
  return draftOf({ ...source, orderNumber: undefined }, today, ctx)
}

/** The next date after `from` on the template's schedule. */
export function nextRecurringDate(
  template: Pick<RecurringInvoice, "every" | "day">,
  from: string
): string {
  const months = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1
  const at = months + template.every
  return recurringDate(
    template.day,
    monthKey(Math.floor(at / 12), (at % 12) + 1)
  )
}

/**
 * The first date on a schedule that starts at `from` and is after `today`:
 * where a template made from an invoice starts, so it never makes a draft
 * for a date already passed.
 */
export function firstRecurringDate(
  every: number,
  from: string,
  today: string
): string {
  const schedule = { every, day: Number(from.slice(8, 10)) }
  let date = nextRecurringDate(schedule, from)
  while (date <= today) date = nextRecurringDate(schedule, date)
  return date
}

/** A recurring template from an invoice, its first draft dated `first`. */
export function templateFromInvoice(
  source: Invoice,
  id: string,
  every: number,
  first: string,
  until: string | null = null
): RecurringInvoice {
  return {
    id,
    customerId: source.customerId,
    customer: { ...source.customer },
    language: source.language,
    rows: source.rows.map((r) => ({ ...r })),
    ...discountField(source.discount),
    note: source.note,
    ...buyerRefs(source),
    every,
    day: Number(first.slice(8, 10)),
    next: first,
    until,
    paused: false,
  }
}

/** The most drafts one template makes at a time, so a book left closed for years does not fill with them. */
const MAX_CATCH_UP = 12

export interface RecurringRun {
  /** The drafts made, oldest first. */
  drafts: Invoice[]
  /** Every template, those that made a draft moved on to their next date. */
  templates: RecurringInvoice[]
}

/**
 * The drafts every template owes on `today` (§8.27): one for each of its
 * dates up to today, each dated that day and linked to the template. A
 * paused template, and dates after its `until`, make none. A template that
 * owes more than `MAX_CATCH_UP` makes the latest ones, and its next date
 * still moves past today.
 */
export function recurringDrafts(
  templates: readonly RecurringInvoice[],
  today: string,
  ctx: DraftContext
): RecurringRun {
  const drafts: Invoice[] = []
  const out = templates.map((t) => {
    if (t.paused) return t
    const dates: string[] = []
    let next = t.next
    while (next <= today && (t.until === null || next <= t.until)) {
      dates.push(next)
      next = nextRecurringDate(t, next)
    }
    if (dates.length === 0) return t
    for (const date of dates.slice(-MAX_CATCH_UP)) {
      drafts.push({ ...draftOf(t, date, ctx), recurring: t.id })
    }
    return { ...t, next }
  })
  drafts.sort((a, b) => a.date.localeCompare(b.date))
  return { drafts, templates: out }
}

/** Whether a template will make no more invoices. */
export function recurringEnded(template: RecurringInvoice): boolean {
  return template.until !== null && template.next > template.until
}

/** An invoice row from the product register, its rate following `date`. */
export function productRow(product: Product, date: string): InvoiceRow {
  return {
    description: product.name,
    quantityMilli: 1000,
    unit: product.unit,
    unitCents: product.unitCents,
    vatRate: rateOnDate(product.vatRate, date),
    catId: product.catId,
  }
}

/** A product from an invoice row, for keeping a row typed on an invoice. */
export function productFromRow(row: InvoiceRow, id: string): Product {
  return {
    id,
    name: row.description.trim(),
    unit: row.unit,
    unitCents: Math.abs(row.unitCents),
    vatRate: row.vatRate,
    catId: row.catId,
  }
}
