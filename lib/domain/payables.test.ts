import { describe, expect, it } from "vitest"

import { payableGroup, payablesReport } from "@/lib/domain/payables"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"

const cats = indexCategories([
  {
    id: "333",
    line: "333",
    name: "Ostot",
    vatRate: 25.5,
    enabled: true,
    custom: false,
  },
  {
    id: "300-domestic",
    line: "300",
    name: "Myynti",
    vatRate: 25.5,
    kind: "domestic",
    enabled: true,
    custom: false,
  },
] satisfies Category[])

const bill = (over: Partial<Entry>): Entry => ({
  id: "e1",
  date: "2026-11-01",
  description: "Bill",
  type: "expense",
  catId: "333",
  amount: 10_000,
  vatRate: 0,
  amountMode: "gross",
  paidOn: null,
  ...over,
})

describe("payableGroup", () => {
  it("puts a due date in its group", () => {
    expect(payableGroup("2026-11-09", "2026-11-10")).toBe("overdue")
    expect(payableGroup("2026-11-10", "2026-11-10")).toBe("soon")
    expect(payableGroup("2026-11-17", "2026-11-10")).toBe("soon")
    expect(payableGroup("2026-11-18", "2026-11-10")).toBe("later")
    expect(payableGroup(undefined, "2026-11-10")).toBe("noDue")
  })
})

describe("payablesReport", () => {
  it("lists open expenses only, due first and undated last", () => {
    const report = payablesReport(
      [
        bill({ id: "a", due: "2026-11-20" }),
        bill({ id: "b" }),
        bill({ id: "c", due: "2026-11-05", amount: 5_000 }),
        bill({ id: "paid", paidOn: "2026-11-02" }),
        bill({ id: "same-day", paidOn: undefined }),
        bill({ id: "sale", type: "income", catId: "300-domestic" }),
      ],
      cats,
      "2026-11-10"
    )
    expect(report.items.map((i) => i.lead.id)).toEqual(["c", "a", "b"])
    expect(report.items[0].daysLate).toBe(5)
    expect(report.totals).toEqual({
      overdue: 5_000,
      soon: 0,
      later: 10_000,
      noDue: 10_000,
    })
    expect(report.total).toBe(25_000)
  })

  it("keeps the parts of a split receipt together as one bill", () => {
    const report = payablesReport(
      [
        bill({ id: "p1", split: "s", voucher: 2, due: "2026-11-12" }),
        bill({ id: "p2", split: "s", voucher: 3, amount: 2_000 }),
      ],
      cats,
      "2026-11-10"
    )
    expect(report.items).toHaveLength(1)
    expect(report.items[0].lead.id).toBe("p1")
    expect(report.items[0].open).toBe(12_000)
    expect(report.items[0].due).toBe("2026-11-12")
  })
})
