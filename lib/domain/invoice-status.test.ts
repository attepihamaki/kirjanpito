import { describe, expect, it } from "vitest"

import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import {
  invoiceStatus,
  openAmount,
  openEntries,
} from "@/lib/domain/invoice-status"
import type { Entry } from "@/lib/domain/types"

const entry = (
  id: string,
  paidOn: Entry["paidOn"],
  amount = 10_000
): Entry => ({
  id,
  date: "2026-11-01",
  description: "Lasku",
  type: "income",
  catId: "300-domestic",
  amount,
  vatRate: 25.5,
  amountMode: "net",
  paidOn,
})

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: emptyParty(),
  language: "fi",
  rows: [],
  note: "",
  terms: "",
  reference: "10016",
  seller: null,
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: ["a", "b"],
  credits: null,
  ...over,
})

const byId = (...entries: Entry[]) => new Map(entries.map((e) => [e.id, e]))

describe("invoiceStatus", () => {
  it("is draft until the invoice has a number", () => {
    expect(invoiceStatus(invoice({ number: null }), byId(), "2026-11-02")).toBe(
      "draft"
    )
  })

  it("is open before the due date and on it", () => {
    const entries = byId(entry("a", null), entry("b", null))
    expect(invoiceStatus(invoice(), entries, "2026-11-10")).toBe("open")
    expect(invoiceStatus(invoice(), entries, "2026-11-15")).toBe("open")
  })

  it("is overdue the day after the due date", () => {
    const entries = byId(entry("a", null), entry("b", null))
    expect(invoiceStatus(invoice(), entries, "2026-11-16")).toBe("overdue")
  })

  it("stays open while any entry is unpaid", () => {
    const entries = byId(entry("a", "2026-11-05"), entry("b", null))
    expect(invoiceStatus(invoice(), entries, "2026-11-06")).toBe("open")
  })

  it("is paid once every entry has a payment date, including the entry's own date", () => {
    const entries = byId(entry("a", "2026-11-05"), entry("b", undefined))
    expect(invoiceStatus(invoice(), entries, "2027-01-01")).toBe("paid")
  })

  it("counts a deleted entry as nothing owed", () => {
    expect(
      invoiceStatus(invoice(), byId(entry("a", "2026-11-05")), "2027-01-01")
    ).toBe("paid")
  })
})

describe("openAmount", () => {
  it("adds the gross of the unpaid entries only", () => {
    const entries = byId(
      entry("a", null, 10_000),
      entry("b", "2026-11-05", 20_000)
    )
    expect(openEntries(invoice(), entries).map((e) => e.id)).toEqual(["a"])
    expect(openAmount(invoice(), entries)).toBe(12_550)
  })
})
