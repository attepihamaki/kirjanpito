import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"

import {
  renderInvoicePdf,
  renderQuotePdf,
  renderReminderPdf,
} from "@/lib/browser/invoice-pdf"
import { createIdFactory } from "@/lib/domain/id"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
  type InvoiceRow,
  type Quote,
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

function issued(
  rows: InvoiceRow[],
  over: Partial<Invoice> = {},
  vatRegistered = true
): Invoice {
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
    terms: "",
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
      vatRegistered,
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

  it("draws the customer's reference and order number, a long one included", async () => {
    const invoice = issued([row(1)], {
      buyerReference: "Kustannuspaikka 4410, Liisa Laine",
      orderNumber: "PO-2026-0007",
    })
    const plain = await renderInvoicePdf(issued([row(1)]))
    const bytes = await renderInvoicePdf(invoice)
    expect(await pages(bytes)).toBe(1)
    expect(bytes.length).toBeGreaterThan(plain.length)
  })

  it("draws the invoice without a barcode when the account is not Finnish", async () => {
    const invoice = issued([row(1)])
    invoice.seller = { ...invoice.seller!, iban: "DE89370400440532013000" }
    expect((await renderInvoicePdf(invoice)).length).toBeGreaterThan(1000)
  })

  it("draws a credit note with a credited invoice number and no payment slip", async () => {
    const plain = await renderInvoicePdf(issued([row(1)]))
    const note = issued([row(1, { quantityMilli: -1500 })], {
      credits: "orig",
    })
    const bytes = await renderInvoicePdf(note, 1001)
    expect(await pages(bytes)).toBe(1)
    /* No barcode or QR code to draw, so the file is smaller. */
    expect(bytes.length).toBeLessThan(plain.length)
  })

  it("draws zero-rated rows with their notes, and an unregistered seller's invoice without VAT", async () => {
    const abroad = { ...emptyParty(), name: "Köpare AB", country: "SE" }
    const eu = issued(
      [
        row(1, { catId: "300-eu-goods", vatRate: 0 }),
        row(2, { catId: "300-eu-services", vatRate: 0 }),
        row(3, { catId: "300-other", vatRate: 0 }),
        row(4, { catId: "300-reverse", vatRate: 0 }),
      ],
      { customer: { ...abroad, vatId: "SE556677889901" }, language: "en" }
    )
    expect(await pages(await renderInvoicePdf(eu))).toBe(1)
    const small = issued([row(1, { vatRate: 0 })], {}, false)
    expect(small.seller?.vatId).toBe("")
    expect(await pages(await renderInvoicePdf(small))).toBe(1)
  })

  it("refuses a draft", async () => {
    const draft = { ...issued([row(1)]), number: null }
    await expect(renderInvoicePdf(draft)).rejects.toThrow()
  })
})

describe("renderReminderPdf", () => {
  const reminder = {
    id: "r1",
    date: "2026-11-20",
    open: 12_550,
    rate: 9.5,
    interest: 71,
    fee: 500,
    newDueDate: "2026-11-27",
  }

  it("draws a Finnish and an English reminder on one page with the slip", async () => {
    for (const language of ["fi", "en"] as const) {
      const bytes = await renderReminderPdf(
        issued([row(1)], { language }),
        reminder
      )
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-")
      expect(await pages(bytes)).toBe(1)
    }
  })

  it("refuses a draft", async () => {
    await expect(
      renderReminderPdf(
        { ...issued([row(1)]), number: null, reference: null },
        reminder
      )
    ).rejects.toThrow()
  })
})

describe("renderQuotePdf (§8.34)", () => {
  it("draws a quote titled by its own number, with no payment slip", async () => {
    const invoice = issued([row(1), row(2)])
    const quote: Quote = {
      id: "q1",
      number: 3,
      date: "2026-11-01",
      validUntil: "2026-12-01",
      customerId: null,
      customer: invoice.customer,
      language: "en",
      rows: invoice.rows,
      note: "Prices include travel.",
      outcome: null,
      invoiceId: null,
    }
    const bytes = await renderQuotePdf(quote, invoice.seller!)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe("Quotation 3")
    /* No barcode or QR code to draw, so the file is smaller than the invoice. */
    expect(bytes.length).toBeLessThan((await renderInvoicePdf(invoice)).length)
  })
})
