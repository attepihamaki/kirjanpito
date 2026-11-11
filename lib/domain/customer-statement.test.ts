import { describe, expect, it } from "vitest"

import { customerStatement } from "@/lib/domain/customer-statement"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import type { Entry } from "@/lib/domain/types"

const entry = (id: string, amount: number, paid: boolean): Entry => ({
  id,
  date: "2026-09-01",
  description: id,
  type: "income",
  catId: "300-domestic",
  amount,
  vatRate: 0,
  amountMode: "gross",
  paidOn: paid ? "2026-09-10" : null,
})

const invoice = (over: Partial<Invoice>): Invoice => ({
  id: "i1",
  number: 1001,
  date: "2026-09-01",
  dueDate: "2026-09-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: "c1",
  customer: { ...emptyParty(), name: "Asiakas Oy" },
  language: "fi",
  rows: [],
  note: "",
  terms: "",
  reference: "10016",
  seller: null,
  issuedAt: "2026-09-01T08:00:00.000Z",
  entryIds: [],
  credits: null,
  ...over,
})

const entries = [
  entry("a", 10_000, true),
  /* A part payment: 300 € paid, 200 € open, plus a reminder fee of 5 €. */
  entry("b1", 30_000, true),
  entry("b2", 20_000, false),
  entry("b3", 500, false),
  entry("c", 4000, false),
  entry("credit", -1000, false),
]
const byId = new Map(entries.map((e) => [e.id, e]))
const invoices = [
  invoice({ id: "paid", number: 1001, entryIds: ["a"] }),
  invoice({
    id: "part",
    number: 1002,
    date: "2026-10-01",
    dueDate: "2026-10-15",
    entryIds: ["b1", "b2", "b3"],
  }),
  invoice({
    id: "later",
    number: 1003,
    date: "2026-11-01",
    dueDate: "2026-11-30",
    entryIds: ["c"],
  }),
  invoice({
    id: "cn",
    number: 1004,
    date: "2026-11-05",
    entryIds: ["credit"],
    credits: "later",
  }),
  invoice({ id: "other", customerId: "c2", entryIds: ["c"] }),
  invoice({ id: "draft", number: null, entryIds: [] }),
]

describe("customerStatement (§8.29)", () => {
  it("lists what is open, with part payments, reminder charges and credits", () => {
    const s = customerStatement("c1", invoices, byId, {
      today: "2026-11-10",
      includePaid: false,
      from: null,
      to: null,
    })
    expect(s.lines.map((l) => l.number)).toEqual([1002, 1003, 1004])
    const part = s.lines[0]
    expect([part.total, part.paid, part.open]).toEqual([50_500, 30_000, 20_500])
    expect(part.overdueDays).toBe(26)
    expect(s.lines[1].overdueDays).toBe(0)
    expect(s.lines[2]).toMatchObject({
      credit: true,
      dueDate: null,
      open: -1000,
    })
    expect(s.open).toBe(20_500 + 4000 - 1000)
    expect(s.overdue).toBe(20_500)
  })

  it("lists every invoice of a period, paid ones included", () => {
    const s = customerStatement("c1", invoices, byId, {
      today: "2026-11-10",
      includePaid: true,
      from: "2026-09-01",
      to: "2026-10-31",
    })
    expect(s.lines.map((l) => l.number)).toEqual([1001, 1002])
    expect(s.paid).toBe(40_000)
    expect(s.total).toBe(60_500)
  })
})
