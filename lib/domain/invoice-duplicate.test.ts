import { describe, expect, it } from "vitest"

import { emptyParty, type Invoice, type InvoiceRow } from "@/lib/domain/invoice"
import { duplicateInvoice } from "@/lib/domain/invoice-duplicate"

const row: InvoiceRow = {
  description: "Konsultointi",
  quantityMilli: 10_000,
  unit: "h",
  unitCents: 8000,
  vatRate: 25.5,
  catId: "300-domestic",
}

function invoice(over: Partial<Invoice>): Invoice {
  return {
    id: "i1",
    number: 1,
    date: "2026-10-10",
    dueDate: "2026-10-24",
    supplyFrom: null,
    supplyTo: null,
    customerId: "c1",
    customer: { ...emptyParty(), name: "Asiakas Oy" },
    language: "fi",
    rows: [row],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: "2026-10-10T10:00:00",
    entryIds: [],
    credits: null,
    ...over,
  }
}

const draft = (over: Partial<Invoice> = {}) => ({
  id: "d",
  date: "2026-10-12",
  customerId: "c1",
  customer: { ...emptyParty(), name: "Asiakas Oy" },
  rows: [row],
  ...over,
})

describe("duplicateInvoice", () => {
  it("finds an issued invoice with the same customer, rows and a near date", () => {
    const issued = invoice({})
    expect(duplicateInvoice(draft(), [issued])).toBe(issued)
  })

  it("knows a customer typed in by name, however it is written", () => {
    const issued = invoice({ customerId: null })
    const typed = draft({
      customerId: null,
      customer: { ...emptyParty(), name: "asiakas" },
    })
    expect(duplicateInvoice(typed, [issued])).toBe(issued)
  })

  it("leaves a monthly invoice alone", () => {
    expect(
      duplicateInvoice(draft({ date: "2026-11-10" }), [invoice({})])
    ).toBeUndefined()
  })

  it("leaves other customers, rows and quantities alone", () => {
    expect(
      duplicateInvoice(draft({ customerId: "c2", customer: emptyParty() }), [
        invoice({}),
      ])
    ).toBeUndefined()
    expect(
      duplicateInvoice(draft({ rows: [{ ...row, quantityMilli: 5000 }] }), [
        invoice({}),
      ])
    ).toBeUndefined()
  })

  it("ignores drafts, credit notes, itself and a cancelled invoice", () => {
    const issued = invoice({})
    expect(
      duplicateInvoice(draft(), [invoice({ number: null })])
    ).toBeUndefined()
    expect(
      duplicateInvoice(draft(), [invoice({ credits: "i0" })])
    ).toBeUndefined()
    expect(duplicateInvoice(draft({ id: "i1" }), [issued])).toBeUndefined()
    expect(
      duplicateInvoice(draft(), [
        issued,
        invoice({ id: "i2", number: 2, credits: "i1" }),
      ])
    ).toBeUndefined()
  })

  it("never flags a credit note or an empty invoice", () => {
    expect(
      duplicateInvoice({ ...draft(), credits: "i1" }, [invoice({})])
    ).toBeUndefined()
    expect(duplicateInvoice(draft({ rows: [] }), [invoice({})])).toBeUndefined()
  })
})
