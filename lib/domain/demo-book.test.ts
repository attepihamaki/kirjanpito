import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { billIban, billReference } from "@/lib/domain/bill-payment"
import { calcEntry } from "@/lib/domain/calc"
import { demoBook, demoYear, receiptPdf } from "@/lib/domain/demo-book"
import { invoiceTotals, nextInvoiceNumber } from "@/lib/domain/invoice-calc"
import { isFinnishReference } from "@/lib/domain/invoice-reference"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"

describe("demoYear", () => {
  it("shows this year from April, and last year before it", () => {
    expect(demoYear("2026-04-01")).toBe(2026)
    expect(demoYear("2026-11-10")).toBe(2026)
    expect(demoYear("2026-03-31")).toBe(2025)
  })
})

describe("demoBook", () => {
  const cats = defaultCategories()
  const catMap = indexCategories(cats)

  it("holds the year's entries up to today, in date order", () => {
    const { year, entries } = demoBook("2026-11-10")
    expect(year).toBe(2026)
    expect(entries.length).toBeGreaterThan(40)
    expect(entries.every((e) => e.date >= "2026-01-01")).toBe(true)
    expect(entries.every((e) => e.date <= "2026-11-10")).toBe(true)
    const dates = entries.map((e) => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it("books every entry to an enabled default category", () => {
    for (const e of demoBook("2026-12-31").entries) {
      expect(catMap.get(e.catId)?.enabled, e.catId).toBe(true)
    }
  })

  it("names only parties it registers, and leaves the latest sale open", () => {
    const { entries, customers } = demoBook("2026-11-10")
    const ids = new Set(customers.map((c) => c.id))
    for (const e of entries) if (e.party) expect(ids.has(e.party)).toBe(true)
    const sales = entries.filter((e) => e.type === "income")
    expect(sales.at(-1)?.paidOn).toBeNull()
    expect(sales.slice(0, -1).every((e) => e.paidOn === undefined)).toBe(true)
  })

  it("leaves the latest rent and phone bill to pay, with valid payment details", () => {
    const { entries } = demoBook("2026-11-10")
    const open = entries.filter(
      (e) => e.type === "expense" && e.paidOn === null
    )
    expect(open.map((e) => e.description).sort()).toEqual([
      "Puhelinliittymä, 10/2026",
      "Työtilan vuokra, 10/2026",
    ])
    for (const e of open) {
      expect(billIban(e.iban)).toBe(e.iban)
      expect(billReference(e.reference)).toBe(e.reference)
      expect(e.due! > e.date).toBe(true)
    }
  })

  it("has an issued invoice for every sale, with the entry's own figures", () => {
    const { entries, invoices, invoiceSettings } = demoBook("2026-11-10")
    const sales = entries.filter((e) => e.type === "income")
    expect(invoices).toHaveLength(sales.length)
    for (const invoice of invoices) {
      const entry = entries.find((e) => e.id === invoice.entryIds[0])
      expect(entry?.description).toContain(`Lasku ${invoice.number}`)
      expect(invoiceTotals(invoice.rows).gross).toBe(calcEntry(entry!).gross)
      expect(invoice.customerId).toBe(entry?.party)
      expect(invoice.reference && isFinnishReference(invoice.reference)).toBe(
        true
      )
    }
    // The next invoice continues the series.
    expect(nextInvoiceNumber(invoices, invoiceSettings.firstNumber)).toBe(
      Math.max(...invoices.map((i) => i.number ?? 0)) + 1
    )
    expect(billIban(invoiceSettings.iban)).toBe(invoiceSettings.iban)
  })

  it("has a quote that became an invoice and one still open", () => {
    const { invoices, invoiceSettings } = demoBook("2026-11-10")
    const [accepted, open] = invoiceSettings.quotes
    expect(accepted.outcome).toBe("accepted")
    expect(invoices.some((i) => i.id === accepted.invoiceId)).toBe(true)
    expect(open.outcome).toBeNull()
    expect(open.validUntil > "2026-11-10").toBe(true)
  })

  it("puts receipts in the inbox as PDFs with a text layer", () => {
    const { receipts } = demoBook("2026-11-10")
    expect(receipts.length).toBeGreaterThan(0)
    const bytes = receiptPdf(receipts[0].lines("2026-11-10"))
    const text = new TextDecoder("latin1").decode(bytes)
    expect(text.startsWith("%PDF-1.4")).toBe(true)
    expect(text).toContain("(Yhteensä 73,59 EUR) Tj")
    // The cross-reference table points at each object's first byte.
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1])
    expect(text.slice(xref, xref + 4)).toBe("xref")
    const offsets = [...text.matchAll(/^(\d{10}) 00000 n /gm)].map((m) =>
      Number(m[1])
    )
    offsets.forEach((offset, i) => {
      expect(text.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true)
    })
  })

  it("ends the year in a profit", () => {
    const { year, entries } = demoBook("2026-12-31")
    expect(incomeStatement(entries, catMap, year).result).toBeGreaterThan(0)
  })

  it("keeps a month-end day inside a short month", () => {
    const { entries } = demoBook("2026-03-05")
    // Before April the demo is last year's, with the whole of February.
    expect(entries.some((e) => e.date === "2025-02-28")).toBe(true)
    expect(entries.some((e) => e.date.startsWith("2025-02-3"))).toBe(false)
  })
})
