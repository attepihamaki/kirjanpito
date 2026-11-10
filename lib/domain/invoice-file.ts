import { parseIban } from "@/lib/domain/iban"
import {
  DEFAULT_INVOICE_SETTINGS,
  PARTY_ROLES,
  type Customer,
  type Invoice,
  type InvoiceLang,
  type InvoiceRow,
  type InvoiceSettings,
  RECURRING_EVERY,
  type Party,
  type PartyRole,
  type Product,
  type RecurringInvoice,
  type Reminder,
  type Seller,
} from "@/lib/domain/invoice"

/*
 * `invoices.json` and `customers.json` (§7.6): two files at the root of the
 * ZIP beside `settings.json`. Reading is lenient like the CSV and the
 * settings. A record that cannot be read is dropped and counted, and the rest
 * is kept.
 */

export const INVOICES_FILE_NAME = "invoices.json"
export const CUSTOMERS_FILE_NAME = "customers.json"

/** Version of the shapes below. A reader ignores keys it does not know. */
const INVOICE_FILE_VERSION = 1

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : ""
}

function lang(value: unknown): InvoiceLang {
  return value === "en" ? "en" : "fi"
}

function isoDate(value: unknown): string | null {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null
}

function days(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 365
    ? value
    : null
}

function parseParty(value: unknown): Party | null {
  if (!isRecord(value)) return null
  const country = text(value.country, 2).toUpperCase()
  return {
    name: text(value.name, 200),
    street: text(value.street, 200),
    postcode: text(value.postcode, 20),
    city: text(value.city, 100),
    country: /^[A-Z]{2}$/.test(country) ? country : "FI",
    vatId: text(value.vatId, 20).replace(/\s/g, "").toUpperCase(),
    email: text(value.email, 200),
  }
}

/* -------------------------------------------------------------------------
 * Invoice settings
 * ---------------------------------------------------------------------- */

function cents(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100_000
    ? value
    : null
}

function percentOrNull(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null
}

/** The invoice settings from a parsed `settings.json` value. A missing or unreadable field keeps its default. */
export function parseInvoiceSettings(value: unknown): InvoiceSettings {
  const base = DEFAULT_INVOICE_SETTINGS
  if (!isRecord(value)) return { ...base, terms: { ...base.terms } }
  const terms = isRecord(value.terms) ? value.terms : {}
  const first = value.firstNumber
  return {
    street: text(value.street, 200),
    postcode: text(value.postcode, 20),
    city: text(value.city, 100),
    email: text(value.email, 200),
    iban: parseIban(text(value.iban, 40)) ?? "",
    termDays: days(value.termDays) ?? base.termDays,
    terms: { fi: text(terms.fi, 2000), en: text(terms.en, 2000) },
    firstNumber:
      typeof first === "number" &&
      Number.isInteger(first) &&
      first >= 100 &&
      first <= 999_999_999
        ? first
        : base.firstNumber,
    reminderFee: cents(value.reminderFee) ?? base.reminderFee,
    interestRate: percentOrNull(value.interestRate),
    products: list(value.products, parseProduct),
    recurring: list(value.recurring, parseRecurringInvoice),
  }
}

/** The readable records of a list, the first of each id kept. */
function list<T extends { id: string }>(
  value: unknown,
  parse: (item: unknown) => T | null
): T[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((item) => {
    const record = parse(item)
    if (!record || seen.has(record.id)) return []
    seen.add(record.id)
    return [record]
  })
}

function parseProduct(value: unknown): Product | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const name = text(value.name, 500).trim()
  const row = parseRow({ ...value, description: name, quantityMilli: 1000 })
  if (!row || name === "" || row.unitCents < 0) return null
  return {
    id: value.id,
    name,
    unit: row.unit,
    unitCents: row.unitCents,
    vatRate: row.vatRate,
    catId: row.catId,
  }
}

function parseRecurringInvoice(value: unknown): RecurringInvoice | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const customer = parseParty(value.customer)
  const next = isoDate(value.next)
  const { every, day } = value
  if (!customer || !next || !Array.isArray(value.rows)) return null
  if (!(RECURRING_EVERY as readonly unknown[]).includes(every)) return null
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31)
    return null
  const rows = value.rows.map(parseRow)
  if (rows.length === 0 || rows.some((r) => r === null)) return null
  return {
    id: value.id,
    customerId:
      typeof value.customerId === "string" && value.customerId !== ""
        ? value.customerId
        : null,
    customer,
    language: lang(value.language),
    rows: rows as InvoiceRow[],
    note: text(value.note, 2000),
    every: every as number,
    day: day as number,
    next,
    until: isoDate(value.until),
    paused: value.paused === true,
  }
}

/* -------------------------------------------------------------------------
 * Customers
 * ---------------------------------------------------------------------- */

function parseCustomer(value: unknown): Customer | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const party = parseParty(value)
  if (!party || party.name === "") return null
  return {
    ...party,
    id: value.id,
    /* A register written before suppliers existed held customers only. */
    role: PARTY_ROLES.includes(value.role as PartyRole)
      ? (value.role as PartyRole)
      : "customer",
    language: lang(value.language),
    termDays: days(value.termDays),
    incomeCat: catId(value.incomeCat),
    expenseCat: catId(value.expenseCat),
    vatRate: rate(value.vatRate),
  }
}

function catId(value: unknown): string | null {
  return typeof value === "string" && value !== "" && value.length <= 64
    ? value
    : null
}

/** A VAT rate in percent with at most one decimal, or null. */
function rate(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < 100 &&
    Math.round(value * 10) === value * 10
    ? value
    : null
}

export interface ParsedCustomers {
  customers: Customer[]
  /** How many records were dropped. */
  skipped: number
}

export function parseCustomers(source: string): ParsedCustomers {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    return { customers: [], skipped: 0 }
  }
  const list =
    isRecord(raw) && Array.isArray(raw.customers) ? raw.customers : []
  const seen = new Set<string>()
  const customers: Customer[] = []
  for (const item of list) {
    const customer = parseCustomer(item)
    if (customer && !seen.has(customer.id)) {
      seen.add(customer.id)
      customers.push(customer)
    }
  }
  return { customers, skipped: list.length - customers.length }
}

/** Pretty-printed with a trailing newline, in name order, so the same register always gives the same text. */
export function serializeCustomers(customers: readonly Customer[]): string {
  const sorted = [...customers].sort(
    (a, b) => a.name.localeCompare(b.name, "fi") || a.id.localeCompare(b.id)
  )
  return `${JSON.stringify({ version: INVOICE_FILE_VERSION, customers: sorted }, null, 2)}\n`
}

/* -------------------------------------------------------------------------
 * Invoices
 * ---------------------------------------------------------------------- */

function parseRow(value: unknown): InvoiceRow | null {
  if (!isRecord(value)) return null
  const { quantityMilli, unitCents, vatRate } = value
  if (!Number.isInteger(quantityMilli) || !Number.isInteger(unitCents))
    return null
  if (
    typeof vatRate !== "number" ||
    !Number.isFinite(vatRate) ||
    vatRate < 0 ||
    vatRate > 100
  )
    return null
  if (typeof value.catId !== "string" || value.catId === "") return null
  return {
    description: text(value.description, 500),
    quantityMilli: quantityMilli as number,
    unit: text(value.unit, 20),
    unitCents: unitCents as number,
    vatRate,
    catId: value.catId,
  }
}

function parseSeller(value: unknown): Seller | null {
  if (!isRecord(value)) return null
  const party = parseParty(value)
  if (!party) return null
  return {
    ...party,
    businessId: text(value.businessId, 20),
    phone: text(value.phone, 40),
    iban: parseIban(text(value.iban, 40)) ?? "",
  }
}

function parseReminder(value: unknown): Reminder | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const date = isoDate(value.date)
  const newDueDate = isoDate(value.newDueDate)
  const open = value.open
  const interest = cents(value.interest)
  const fee = cents(value.fee)
  const rate = percentOrNull(value.rate)
  if (
    !date ||
    !newDueDate ||
    !Number.isInteger(open) ||
    interest === null ||
    fee === null ||
    rate === null
  )
    return null
  return {
    id: value.id,
    date,
    open: open as number,
    rate,
    interest,
    fee,
    newDueDate,
  }
}

function parseInvoice(value: unknown): Invoice | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const date = isoDate(value.date)
  const dueDate = isoDate(value.dueDate)
  const customer = parseParty(value.customer)
  if (!date || !dueDate || !customer || !Array.isArray(value.rows)) return null
  const rows = value.rows.map(parseRow)
  /* A row that cannot be read would change the total, so the whole invoice is dropped. */
  if (rows.some((r) => r === null)) return null
  const number =
    typeof value.number === "number" &&
    Number.isInteger(value.number) &&
    value.number > 0
      ? value.number
      : null
  const issuedAt =
    typeof value.issuedAt === "string" && value.issuedAt !== ""
      ? value.issuedAt
      : null
  /* An issued invoice has all three; a draft has none. A half-issued one is not trusted. */
  const seller = parseSeller(value.seller)
  const reference =
    typeof value.reference === "string" && value.reference !== ""
      ? value.reference
      : null
  const issued =
    number !== null &&
    issuedAt !== null &&
    seller !== null &&
    reference !== null
  const draft =
    number === null &&
    issuedAt === null &&
    seller === null &&
    reference === null
  if (!issued && !draft) return null
  const reserved =
    draft &&
    typeof value.reservedNumber === "number" &&
    Number.isInteger(value.reservedNumber) &&
    value.reservedNumber > 0
      ? value.reservedNumber
      : undefined
  const reminders =
    issued && Array.isArray(value.reminders)
      ? value.reminders.flatMap((r) => parseReminder(r) ?? [])
      : []
  return {
    id: value.id,
    number,
    date,
    dueDate,
    supplyFrom: isoDate(value.supplyFrom),
    supplyTo: isoDate(value.supplyTo),
    customerId: typeof value.customerId === "string" ? value.customerId : null,
    customer,
    language: lang(value.language),
    rows: rows as InvoiceRow[],
    note: text(value.note, 2000),
    terms: text(value.terms, 2000),
    reference,
    seller,
    issuedAt,
    entryIds: Array.isArray(value.entryIds)
      ? value.entryIds.filter((id): id is string => typeof id === "string")
      : [],
    credits:
      typeof value.credits === "string" && value.credits !== ""
        ? value.credits
        : null,
    ...(reserved !== undefined ? { reservedNumber: reserved } : {}),
    ...(reminders.length > 0 ? { reminders } : {}),
    ...(typeof value.recurring === "string" && value.recurring !== ""
      ? { recurring: value.recurring }
      : {}),
  }
}

export interface ParsedInvoices {
  invoices: Invoice[]
  /** How many records were dropped. */
  skipped: number
}

export function parseInvoices(source: string): ParsedInvoices {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    return { invoices: [], skipped: 0 }
  }
  const list = isRecord(raw) && Array.isArray(raw.invoices) ? raw.invoices : []
  const seen = new Set<string>()
  const invoices: Invoice[] = []
  for (const item of list) {
    const invoice = parseInvoice(item)
    if (invoice && !seen.has(invoice.id)) {
      seen.add(invoice.id)
      invoices.push(invoice)
    }
  }
  return { invoices, skipped: list.length - invoices.length }
}

/** Pretty-printed with a trailing newline. Issued invoices come in number order, drafts after them by date. */
export function serializeInvoices(invoices: readonly Invoice[]): string {
  const sorted = [...invoices].sort((a, b) => {
    if (a.number !== null && b.number !== null) return a.number - b.number
    if (a.number !== null) return -1
    if (b.number !== null) return 1
    return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  })
  return `${JSON.stringify({ version: INVOICE_FILE_VERSION, invoices: sorted }, null, 2)}\n`
}
