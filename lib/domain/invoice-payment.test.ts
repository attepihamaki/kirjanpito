import { describe, expect, it } from "vitest"

import { calcEntry } from "@/lib/domain/calc"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import {
  applyInvoicePayment,
  owedOn,
  partlyPaid,
} from "@/lib/domain/invoice-payment"
import type { Entry } from "@/lib/domain/types"

function entry(id: string, amount: number, vatRate: number): Entry {
  return {
    id,
    date: "2026-09-01",
    description: "Lasku 1",
    type: "income",
    catId: "300-domestic",
    amount,
    vatRate,
    amountMode: "net",
    paidOn: null,
    split: "s1",
    atts: [{ id: "a1", name: "Lasku 1.pdf", type: "application/pdf", size: 9 }],
  }
}

function invoice(entryIds: string[]): Invoice {
  return {
    id: "i1",
    number: 1,
    date: "2026-09-01",
    dueDate: "2026-09-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: emptyParty(),
    language: "fi",
    rows: [],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: "2026-09-01T10:00:00",
    entryIds,
    credits: null,
  }
}

const book = (entries: Entry[]) => new Map(entries.map((e) => [e.id, e]))
let n = 0
const newId = () => `p${++n}`

describe("applyInvoicePayment", () => {
  it("splits the entry into a paid part and what is still owed", () => {
    const e = entry("e1", 10_000, 25.5) // gross 12 550
    const out = applyInvoicePayment(
      invoice(["e1"]),
      book([e]),
      5020,
      "2026-10-01",
      newId
    )!
    expect(out.added).toHaveLength(1)
    const [part] = out.added
    const [rest] = out.updated
    expect(calcEntry(part).gross).toBe(5020)
    expect(part.paidOn).toBe("2026-10-01")
    expect(part.split).toBeUndefined()
    expect(part.atts).toEqual(e.atts)
    expect(rest.paidOn).toBeNull()
    expect(part.amount + rest.amount).toBe(10_000)
    expect(out.entryIds).toEqual(["e1", part.id])
  })

  it("keeps the VAT of the parts within a cent of the whole", () => {
    const e = entry("e1", 33_333, 25.5)
    const out = applyInvoicePayment(
      invoice(["e1"]),
      book([e]),
      12_345,
      "2026-10-01",
      newId
    )!
    const vat = [...out.added, ...out.updated].reduce(
      (s, x) => s + calcEntry(x).vat,
      0
    )
    expect(Math.abs(vat - calcEntry(e).vat)).toBeLessThanOrEqual(1)
  })

  it("pays whole entries first and splits the one the money stops in", () => {
    const a = entry("e1", 10_000, 25.5) // 12 550
    const b = entry("e2", 10_000, 14) // 11 400
    const out = applyInvoicePayment(
      invoice(["e1", "e2"]),
      book([a, b]),
      15_000,
      "2026-10-01",
      newId
    )!
    expect(out.updated[0].id).toBe("e1")
    expect(out.updated[0].paidOn).toBe("2026-10-01")
    expect(out.added).toHaveLength(1)
    expect(calcEntry(out.added[0]).gross).toBe(15_000 - 12_550)
  })

  it("marks everything paid when the amount is the whole debt", () => {
    const e = entry("e1", 10_000, 25.5)
    const out = applyInvoicePayment(
      invoice(["e1"]),
      book([e]),
      12_550,
      "2026-10-01",
      newId
    )!
    expect(out.added).toEqual([])
    expect(out.updated[0].paidOn).toBe("2026-10-01")
  })

  it("refuses nothing, too little and too much", () => {
    const e = entry("e1", 10_000, 25.5)
    const inv = invoice(["e1"])
    for (const amount of [0, -5, 12_551, 1.5])
      expect(
        applyInvoicePayment(inv, book([e]), amount, "2026-10-01", newId)
      ).toBeNull()
  })

  it("owes the rest and reads as partly paid afterwards", () => {
    const e = entry("e1", 10_000, 25.5)
    const inv = invoice(["e1"])
    const out = applyInvoicePayment(inv, book([e]), 5000, "2026-10-01", newId)!
    const after = book([...out.updated, ...out.added])
    const paid = { ...inv, entryIds: out.entryIds }
    expect(owedOn(paid, after)).toBe(12_550 - 5000)
    expect(partlyPaid(paid, after)).toBe(true)
    expect(partlyPaid(inv, book([e]))).toBe(false)
  })
})
