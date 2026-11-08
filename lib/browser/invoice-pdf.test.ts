import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"

import { renderInvoicePdf } from "@/lib/browser/invoice-pdf"
import { createIdFactory } from "@/lib/domain/id"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
  type InvoiceRow,
} from "@/lib/domain/invoice"
import { buildIssue } from "@/lib/domain/invoice-calc"

const row = (n: number, over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  description: `Työ ${n} åäö €`,
  quantityMilli: 1500,
  unit: "h",
  unitCents: 8500,
  vatRate: 25.5,
  catId: "300-domestic",
  ...over,
})

function issued(rows: InvoiceRow[], over: Partial<Invoice> = {}): Invoice {
  const draft: Invoice = {
    id: "i1",
    number: null,
    date: "2026-11-01",
    dueDate: "2026-11-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: {
      ...emptyParty(),
      name: "Asiakas Oy",
      street: "Tie 1",
      postcode: "02100",
      city: "Espoo",
    },
    language: "fi",
    rows,
    note: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    credits: null,
    ...over,
  }
  return buildIssue({
    invoice: draft,
    settings: {
      ...DEFAULT_INVOICE_SETTINGS,
      street: "Katu 2",
      postcode: "00100",
      city: "Helsinki",
      iban: "FI2112345600000785",
    },
    business: { name: "Oma Yritys", businessId: "0112038-9", phone: null },
    invoices: [],
    now: "2026-11-01T09:00:00.000Z",
    makeId: createIdFactory("x"),
  }).invoice
}

async function pages(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

describe("renderInvoicePdf", () => {
  it("draws a short invoice on one page", async () => {
    const bytes = await renderInvoicePdf(
      issued([row(1), row(2, { vatRate: 14 })])
    )
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-")
    expect(await pages(bytes)).toBe(1)
  })

  it("carries the rows over to a second page and keeps the slip on the last", async () => {
    const rows = Array.from({ length: 70 }, (_, i) => row(i + 1))
    expect(await pages(await renderInvoicePdf(issued(rows)))).toBeGreaterThan(1)
  })

  it("draws an English invoice, a supply period and a customer abroad", async () => {
    const invoice = issued([row(1)], {
      language: "en",
      supplyFrom: "2026-10-01",
      supplyTo: "2026-10-31",
      note: "Thank you.",
      customer: {
        ...emptyParty(),
        name: "Kund AB",
        street: "Gatan 1",
        city: "Stockholm",
        country: "SE",
        vatId: "SE123",
      },
    })
    expect(await pages(await renderInvoicePdf(invoice))).toBe(1)
  })

  it("draws the invoice without a barcode when the account is not Finnish", async () => {
    const invoice = issued([row(1)])
    invoice.seller = { ...invoice.seller!, iban: "DE89370400440532013000" }
    expect((await renderInvoicePdf(invoice)).length).toBeGreaterThan(1000)
  })

  it("refuses a draft", async () => {
    const draft = { ...issued([row(1)]), number: null }
    await expect(renderInvoicePdf(draft)).rejects.toThrow()
  })
})
