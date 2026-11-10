import { describe, expect, it } from "vitest"

import {
  CUSTOMER_DEFAULTS,
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Customer,
  type Quote,
} from "@/lib/domain/invoice"
import { parseInvoiceSettings } from "@/lib/domain/invoice-file"
import {
  defaultValidUntil,
  invoiceFromQuote,
  nextQuoteNumber,
  quoteProblems,
  quoteStatus,
} from "@/lib/domain/quote"

const quote: Quote = {
  id: "q1",
  number: 4,
  date: "2026-11-02",
  validUntil: "2026-12-02",
  customerId: "c1",
  customer: { ...emptyParty(), name: "Vanha nimi Oy", city: "Espoo" },
  language: "fi",
  rows: [
    {
      description: "Asennus",
      quantityMilli: 7500,
      unit: "h",
      unitCents: 6_000,
      vatRate: 24,
      catId: "300-domestic",
    },
  ],
  note: "Hinta sisältää matkat.",
  outcome: null,
  invoiceId: null,
}

const customer: Customer = {
  ...CUSTOMER_DEFAULTS,
  ...emptyParty(),
  id: "c1",
  name: "Uusi nimi Oy",
  street: "Katu 1",
  postcode: "02100",
  city: "Espoo",
  language: "fi",
  termDays: 21,
}

const seller = { street: "Tie 2", postcode: "00100", city: "Helsinki" }

describe("quotes (§8.34)", () => {
  it("numbers from 1 in a series of their own", () => {
    expect(nextQuoteNumber([])).toBe(1)
    expect(nextQuoteNumber([quote, { ...quote, id: "q2", number: 2 }])).toBe(5)
  })

  it("stands for 30 days by default", () => {
    expect(defaultValidUntil("2026-11-02")).toBe("2026-12-02")
  })

  it("is open until its last valid day and expired after it", () => {
    expect(quoteStatus(quote, [], "2026-12-02")).toBe("open")
    expect(quoteStatus(quote, [], "2026-12-03")).toBe("expired")
  })

  it("shows the customer's answer over the date", () => {
    expect(
      quoteStatus({ ...quote, outcome: "declined" }, [], "2027-01-01")
    ).toBe("declined")
    expect(
      quoteStatus({ ...quote, outcome: "accepted" }, [], "2026-11-05")
    ).toBe("accepted")
  })

  it("is invoiced only while the invoice made from it exists", () => {
    const made = { ...quote, outcome: "accepted" as const, invoiceId: "i1" }
    expect(quoteStatus(made, [{ id: "i1" }], "2026-11-05")).toBe("invoiced")
    expect(quoteStatus(made, [], "2026-11-05")).toBe("accepted")
  })

  it("needs rows, a customer's name and the seller's address, not an IBAN", () => {
    expect(quoteProblems(quote, seller, { name: "Toiminimi" })).toEqual([])
    expect(
      quoteProblems(
        { ...quote, rows: [], customer: emptyParty() },
        { street: "", postcode: "", city: "" },
        { name: null }
      )
    ).toEqual(["noRows", "noCustomer", "sellerName", "sellerAddress"])
    expect(
      quoteProblems({ ...quote, validUntil: "2026-11-01" }, seller, {
        name: "Toiminimi",
      })
    ).toEqual(["validBeforeDate"])
  })

  it("becomes an invoice draft with the register's details and today's rate", () => {
    const draft = invoiceFromQuote(quote, "2026-11-10", {
      termDays: 14,
      customers: [customer],
      makeId: () => "i9",
    })
    expect(draft).toMatchObject({
      id: "i9",
      number: null,
      date: "2026-11-10",
      dueDate: "2026-12-01",
      customerId: "c1",
      note: "Hinta sisältää matkat.",
      issuedAt: null,
    })
    expect(draft.customer.name).toBe("Uusi nimi Oy")
    expect(draft.rows[0]).toMatchObject({ quantityMilli: 7500, vatRate: 25.5 })
  })

  it("survives settings.json, and a broken one is dropped", () => {
    const parsed = parseInvoiceSettings({
      ...DEFAULT_INVOICE_SETTINGS,
      quotes: [quote, { ...quote, id: "q2", number: 0 }, { id: "q3" }],
    })
    expect(parsed.quotes).toEqual([quote])
  })
})
