/** The language an invoice is written in. */
export type InvoiceLang = "fi" | "en"

/**
 * What the book needs to know to write an invoice that can be paid (§8.27).
 * It lives in `settings.json`. The business's name, ID and phone are in the
 * book's other settings.
 */
export interface InvoiceSettings {
  street: string
  postcode: string
  city: string
  email: string
  /** The payee's IBAN in compact form, or "" while none is given. */
  iban: string
  /** Days from the invoice date to the due date when a customer sets none. */
  termDays: number
  /** Free text printed on every invoice, by invoice language. */
  terms: Record<InvoiceLang, string>
  /** The number the series starts from; later numbers are the highest used plus one. */
  firstNumber: number
  /** The fee a payment reminder charges, in cents. */
  reminderFee: number
  /** The late-payment rate in percent a reminder charges, or null for the statutory rate. */
  interestRate: number | null
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  street: "",
  postcode: "",
  city: "",
  email: "",
  iban: "",
  termDays: 14,
  terms: { fi: "", en: "" },
  firstNumber: 1001,
  reminderFee: 500,
  interestRate: null,
}

/** The postal address and contact of a party on an invoice. */
export interface Party {
  name: string
  street: string
  postcode: string
  city: string
  /** ISO 3166 alpha-2, e.g. "FI". */
  country: string
  /** The VAT number with its country prefix, e.g. "FI01120389", or "". */
  vatId: string
  email: string
}

/** A customer in the register (§8.27). */
export interface Customer extends Party {
  id: string
  language: InvoiceLang
  /** Days to the due date, or null to use the book's term. */
  termDays: number | null
}

/** The seller as it was when the invoice was issued, so a later change to the settings leaves the old invoice alone. */
export interface Seller extends Party {
  businessId: string
  phone: string
  iban: string
}

export interface InvoiceRow {
  description: string
  /** The quantity in thousandths, so 1.5 hours is 1500. */
  quantityMilli: number
  unit: string
  /** The price of one unit without VAT, in cents. */
  unitCents: number
  /** VAT in percent. */
  vatRate: number
  /** The income category the row books on. */
  catId: string
}

export interface Invoice {
  id: string
  /** The invoice number, or null while it is a draft. */
  number: number | null
  /** ISO date of the invoice. */
  date: string
  /** ISO date payment is due. */
  dueDate: string
  /** The day or the period the goods or services were supplied, or null if it is the invoice date. */
  supplyFrom: string | null
  supplyTo: string | null
  /** The register customer this was made for, or null for one typed in. */
  customerId: string | null
  /** The customer's details as they stand on this invoice. */
  customer: Party
  language: InvoiceLang
  rows: InvoiceRow[]
  /** A line of text for the customer, printed under the rows. */
  note: string
  /** The seller's standing terms in the invoice's language, copied from the settings when the invoice is issued. */
  terms: string
  /** Set on issue. A Finnish reference, or an RF reference. */
  reference: string | null
  /** Set on issue. */
  seller: Seller | null
  /** ISO date-time of the issue, or null for a draft. */
  issuedAt: string | null
  /** The entries an issued invoice booked. */
  entryIds: string[]
  /** The id of the invoice this one credits, or null. */
  credits: string | null
  /**
   * On a draft that was an issued invoice and is being corrected (§8.27): the
   * number it held, which issuing it again takes back. Absent otherwise.
   */
  reservedNumber?: number
  /** The payment reminders made for it, oldest first (§8.27). Absent while none was made. */
  reminders?: Reminder[]
}

/** One payment reminder, kept as a record of what the customer was asked to pay. */
export interface Reminder {
  id: string
  /** ISO date the reminder was made. */
  date: string
  /** The balance owed when it was made, in cents. */
  open: number
  /** The late-payment rate charged, in percent a year. */
  rate: number
  interest: number
  fee: number
  /** The due date the reminder gave. */
  newDueDate: string
}

/** A party with nothing filled in but the country, for the editor to start from. */
export function emptyParty(): Party {
  return {
    name: "",
    street: "",
    postcode: "",
    city: "",
    country: "FI",
    vatId: "",
    email: "",
  }
}
