import { describe, expect, it } from "vitest"

import { LINE_BY_KEY, defaultCategories } from "@/lib/domain/accounts"
import { entryLock, lockOn } from "@/lib/domain/period-lock"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { countsOnVatReturn, vatReport } from "@/lib/domain/vat"

const cats = indexCategories(defaultCategories())

const none = { vatFiled: {}, yearsArchived: {} }

describe("lockOn", () => {
  it("leaves an unmarked date open", () => {
    expect(lockOn("2026-03-10", none)).toBeNull()
  })

  it("locks a date in a filed month, and only that month", () => {
    const marks = { ...none, vatFiled: { "2026-03": "2026-05-12" } }
    expect(lockOn("2026-03-10", marks)).toEqual({
      kind: "filed",
      key: "2026-03",
      since: "2026-05-12",
    })
    expect(lockOn("2026-04-10", marks)).toBeNull()
  })

  it("locks a date in a filed quarter or year", () => {
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026-Q2": "2026-08-12" } })
        ?.key
    ).toBe("2026-Q2")
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026": "2027-03-01" } })?.key
    ).toBe("2026")
  })

  it("names a stored year first", () => {
    const marks = {
      vatFiled: { "2026-03": "2026-05-12" },
      yearsArchived: { "2026": "2027-01-20" },
    }
    expect(lockOn("2026-03-10", marks)?.kind).toBe("year")
  })
})

describe("entryLock", () => {
  const marks = { ...none, vatFiled: { "2026-03": "2026-05-12" } }
  const entry = (over: Partial<Entry>): Entry => ({
    id: "x",
    date: "2026-03-10",
    description: "",
    type: "expense",
    catId: "333",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  })

  it("locks what the filed return counts", () => {
    expect(entryLock(entry({}), marks, cats)?.kind).toBe("filed")
    const sale = entry({ type: "income", catId: "300-eu-goods", vatRate: 0 })
    expect(entryLock(sale, marks, cats)?.kind).toBe("filed")
  })

  it.each([
    ["YEL", { catId: "336", vatRate: 0 }],
    ["a bank fee", { catId: "349", vatRate: 0 }],
    ["a grant", { type: "income" as const, catId: "318", vatRate: 0 }],
    ["an owner's withdrawal", { catId: "owner-withdrawal", vatRate: 0 }],
    ["a loan", { catId: "loan-repayment", vatRate: 0 }],
    ["a VAT payment", { catId: "vat-payment", vatRate: 0 }],
  ])("leaves %s open", (_, over) => {
    expect(entryLock(entry(over), marks, cats)).toBeNull()
  })

  it("locks every entry of a stored year", () => {
    const stored = { ...none, yearsArchived: { "2026": "2027-01-20" } }
    const yel = entry({ catId: "336", vatRate: 0 })
    expect(entryLock(yel, stored, cats)?.kind).toBe("year")
  })

  it("agrees with the VAT report on every line and rate", () => {
    for (const cat of defaultCategories()) {
      for (const vatRate of [0, 25.5]) {
        const e = entry({
          type: LINE_BY_KEY.get(cat.line)?.side,
          catId: cat.id,
          vatRate,
        })
        const r = vatReport([e], cats)
        const reported =
          r.sales.total.net !== 0 ||
          r.purchases.total.net !== 0 ||
          Object.values(r.otherSales).some((v) => v !== 0)
        expect([cat.id, vatRate, countsOnVatReturn(e, cats)]).toEqual([
          cat.id,
          vatRate,
          reported,
        ])
      }
    }
  })
})
