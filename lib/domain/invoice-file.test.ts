import { describe, expect, it } from "vitest"

import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
  type Invoice,
  type Seller,
} from "@/lib/domain/invoice"
import {
  parseCustomers,
  parseInvoiceSettings,
  parseInvoices,
  serializeCustomers,
  serializeInvoices,
} from "@/lib/domain/invoice-file"

const buyer = { ...emptyParty(), name: "Asiakas Oy", city: "Espoo" }
const seller: Seller = {
  ...emptyParty(),
  name: "Oma Yritys",
  businessId: "0112038-9",
  phone: "09 1234567",
  iban: "FI2112345600000785",
  vatRegistered: true,
}

function draft(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: null,
    date: "2026-11-01",
    dueDate: "2026-11-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: buyer,
    language: "fi",
    rows: [
      {
        description: "Työ",
        quantityMilli: 1500,
        unit: "h",
        unitCents: 6000,
        vatRate: 25.5,
        catId: "300-domestic",
      },
    ],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    credits: null,
    ...over,
  }
}

function issued(over: Partial<Invoice> = {}): Invoice {
  return draft({
    number: 1001,
    reference: "10016",
    seller,
    issuedAt: "2026-11-01T09:00:00.000Z",
    entryIds: ["e1"],
    ...over,
  })
}

describe("invoices.json", () => {
  it("round-trips a draft and an issued invoice", () => {
    const list = [issued(), draft({ id: "i2" })]
    const parsed = parseInvoices(serializeInvoices(list))
    expect(parsed.skipped).toBe(0)
    expect(parsed.invoices).toEqual(list)
  })

  it("round-trips the customer's references and drops blank ones", () => {
    const list = [
      issued({ buyerReference: "Liisa Laine", orderNumber: "PO-2026-7" }),
    ]
    expect(parseInvoices(serializeInvoices(list)).invoices).toEqual(list)
    const blank = draft({ buyerReference: "  ", orderNumber: "" })
    const read = parseInvoices(serializeInvoices([blank])).invoices[0]
    expect(read).not.toHaveProperty("buyerReference")
    expect(read).not.toHaveProperty("orderNumber")
  })

  it("round-trips row and invoice discounts and drops unreadable ones", () => {
    const list = [
      issued({
        discount: 12.5,
        rows: [{ ...issued().rows[0], discount: 10 }],
      }),
    ]
    expect(parseInvoices(serializeInvoices(list)).invoices).toEqual(list)
    const broken = JSON.parse(serializeInvoices(list))
    broken.invoices[0].discount = 0
    broken.invoices[0].rows[0].discount = 150
    const read = parseInvoices(JSON.stringify(broken)).invoices[0]
    expect(read).not.toHaveProperty("discount")
    expect(read.rows[0]).not.toHaveProperty("discount")
  })

  it("round-trips an invoice's tags and leaves the field out when none can be read", () => {
    const list = [issued({ tags: ["Projekti A", "messut"] })]
    expect(parseInvoices(serializeInvoices(list)).invoices).toEqual(list)
    const broken = JSON.parse(serializeInvoices(list))
    broken.invoices[0].tags = "Projekti A"
    expect(
      parseInvoices(JSON.stringify(broken)).invoices[0]
    ).not.toHaveProperty("tags")
  })

  it("round-trips the reminders of an issued invoice and drops unreadable ones", () => {
    const reminder = {
      id: "r1",
      date: "2026-11-20",
      open: 12_550,
      rate: 9.5,
      interest: 120,
      fee: 500,
      newDueDate: "2026-11-27",
    }
    const list = [issued({ reminders: [reminder] })]
    expect(parseInvoices(serializeInvoices(list)).invoices).toEqual(list)

    const broken = JSON.parse(serializeInvoices(list))
    broken.invoices[0].reminders.push({ id: "r2", date: "nope" })
    expect(parseInvoices(JSON.stringify(broken)).invoices[0].reminders).toEqual(
      [reminder]
    )
  })

  it("keeps the number a reopened draft reserves, and drops it from an issued invoice", () => {
    const reopened = draft({ id: "r", reservedNumber: 1001 })
    const stray = issued({ id: "s", reservedNumber: 1001 })
    const parsed = parseInvoices(serializeInvoices([reopened, stray]))
    expect(parsed.invoices.find((i) => i.id === "r")?.reservedNumber).toBe(1001)
    expect(
      parsed.invoices.find((i) => i.id === "s")?.reservedNumber
    ).toBeUndefined()
  })

  it("writes issued invoices in number order and drafts after them", () => {
    const text = serializeInvoices([
      draft({ id: "d" }),
      issued({ id: "b", number: 1002, reference: "10029" }),
      issued({ id: "a" }),
    ])
    expect(parseInvoices(text).invoices.map((i) => i.id)).toEqual([
      "a",
      "b",
      "d",
    ])
  })

  it("is lenient about the file", () => {
    expect(parseInvoices("not json")).toEqual({
      invoices: [],
      skipped: 0,
      filePaths: new Map(),
    })
    expect(parseInvoices("[]")).toEqual({
      invoices: [],
      skipped: 0,
      filePaths: new Map(),
    })
    expect(parseInvoices("{}")).toEqual({
      invoices: [],
      skipped: 0,
      filePaths: new Map(),
    })
  })

  it("drops and counts an invoice it cannot trust", () => {
    const good = issued()
    const text = JSON.stringify({
      invoices: [
        good,
        { ...good, id: "x", date: "1.11.2026" },
        { ...good, id: "y", number: null },
        { ...good, id: "z", rows: [{ description: "no price" }] },
        { ...good, id: "r", rows: [{ ...good.rows[0], vatRate: 250 }] },
        { ...good, id: good.id },
        "junk",
      ],
    })
    const parsed = parseInvoices(text)
    expect(parsed.invoices.map((i) => i.id)).toEqual([good.id])
    expect(parsed.skipped).toBe(6)
  })

  it("reads a half-issued invoice as untrustworthy, not as a draft", () => {
    const half = JSON.stringify({ invoices: [draft({ number: 1001 })] })
    expect(parseInvoices(half).invoices).toEqual([])
  })

  it("normalises the customer's VAT number and country", () => {
    const text = JSON.stringify({
      invoices: [
        draft({ customer: { ...buyer, vatId: "fi 0112 0389", country: "fi" } }),
      ],
    })
    expect(parseInvoices(text).invoices[0].customer).toMatchObject({
      vatId: "FI01120389",
      country: "FI",
    })
  })
})

describe("customers.json", () => {
  const customer = (over: Partial<Customer> = {}): Customer => ({
    ...CUSTOMER_DEFAULTS,
    ...buyer,
    id: "c1",
    language: "en",
    termDays: 30,
    ...over,
  })

  it("round-trips, sorted by name", () => {
    const list = [customer({ id: "c2", name: "Östman" }), customer()]
    const parsed = parseCustomers(serializeCustomers(list))
    expect(parsed.customers.map((c) => c.name)).toEqual([
      "Asiakas Oy",
      "Östman",
    ])
    expect(parsed.customers[0]).toEqual(customer())
  })

  it("keeps a customer's default reference, and none when it is blank", () => {
    const list = [customer({ reference: "Ostoreskontra" })]
    expect(parseCustomers(serializeCustomers(list)).customers).toEqual(list)
    const blank = parseCustomers(
      serializeCustomers([customer({ reference: " " })])
    ).customers[0]
    expect(blank).not.toHaveProperty("reference")
  })

  it("drops a customer with no id or no name, and a repeated id", () => {
    const text = JSON.stringify({
      customers: [
        customer(),
        customer({ id: "" }),
        customer({ id: "c3", name: "" }),
        customer(),
      ],
    })
    const parsed = parseCustomers(text)
    expect(parsed.customers).toHaveLength(1)
    expect(parsed.skipped).toBe(3)
  })

  it("keeps a term only between 0 and 365 days", () => {
    const text = JSON.stringify({
      customers: [
        customer({ termDays: 400 }),
        customer({ id: "c2", termDays: 0 }),
      ],
    })
    expect(parseCustomers(text).customers.map((c) => c.termDays)).toEqual([
      null,
      0,
    ])
  })
})

describe("parseInvoiceSettings", () => {
  it("gives the defaults for a value that is not an object", () => {
    expect(parseInvoiceSettings(null)).toMatchObject({
      termDays: 14,
      firstNumber: 1001,
      iban: "",
      reminderFee: 500,
      interestRate: null,
    })
  })

  it("reads the reminder fee and rate, and refuses what makes no sense", () => {
    expect(
      parseInvoiceSettings({ reminderFee: 700, interestRate: 11.5 })
    ).toMatchObject({ reminderFee: 700, interestRate: 11.5 })
    expect(
      parseInvoiceSettings({ reminderFee: -1, interestRate: 250 })
    ).toMatchObject({ reminderFee: 500, interestRate: null })
  })

  it("compacts a valid IBAN and refuses one with a bad check", () => {
    expect(parseInvoiceSettings({ iban: "fi21 1234 5600 0007 85" }).iban).toBe(
      "FI2112345600000785"
    )
    expect(parseInvoiceSettings({ iban: "FI21 1234 5600 0007 86" }).iban).toBe(
      ""
    )
  })

  it("does not share the default terms object between calls", () => {
    const a = parseInvoiceSettings(null)
    a.terms.fi = "changed"
    expect(parseInvoiceSettings(null).terms.fi).toBe("")
  })

  it("reads the documents' look and leaves out what cannot be read (§8.27)", () => {
    const logo = {
      type: "image/png",
      data: "iVBORw0KGgo=",
      width: 40,
      height: 20,
    }
    expect(
      parseInvoiceSettings({
        logo,
        accent: "#1F6FEB",
        footer: "  www.example.fi ",
      })
    ).toMatchObject({ logo, accent: "#1f6feb", footer: "www.example.fi" })
    const bad = parseInvoiceSettings({
      logo: { ...logo, type: "image/gif" },
      accent: "blue",
      footer: "   ",
    })
    expect(bad).not.toHaveProperty("logo")
    expect(bad).not.toHaveProperty("accent")
    expect(bad).not.toHaveProperty("footer")
    expect(
      parseInvoiceSettings({ logo: { ...logo, data: "not base64!" } })
    ).not.toHaveProperty("logo")
  })
})
