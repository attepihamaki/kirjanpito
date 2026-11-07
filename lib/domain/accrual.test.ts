import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  accrueEntry,
  isPeriod,
  periodDays,
  spreadByDays,
} from "@/lib/domain/accrual"
import { incomeStatement } from "@/lib/domain/income-statement"
import { taxBasisEntries } from "@/lib/domain/open-items"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function insurance(over: Partial<Entry> = {}): Entry {
  return {
    id: "i",
    date: "2026-11-05",
    description: "Vakuutus",
    type: "expense",
    catId: "333",
    amount: 36_500,
    vatRate: 0,
    amountMode: "net",
    periodFrom: "2026-11-01",
    periodTo: "2027-10-31",
    ...over,
  }
}

const result = (rows: Entry[], year: number) =>
  incomeStatement(taxBasisEntries(rows, "business"), cats, year).result

describe("isPeriod", () => {
  it("takes a real period whose end is not before its start", () => {
    expect(isPeriod("2026-11-01", "2027-10-31")).toBe(true)
    expect(isPeriod("2026-11-01", "2026-11-01")).toBe(true)
  })

  it.each([
    ["2026-11-02", "2026-11-01"],
    ["2026-02-30", "2026-03-01"],
    ["", "2026-03-01"],
  ])("refuses %s to %s", (from, to) => {
    expect(isPeriod(from, to)).toBe(false)
  })
})

describe("spreadByDays", () => {
  it("splits by the days in each calendar year", () => {
    const period = periodDays(insurance())!
    expect(spreadByDays(36_500, period)).toEqual([
      { date: "2026-11-01", amount: 6_100 },
      { date: "2027-01-01", amount: 30_400 },
    ])
  })

  it("always adds up to the whole, down to the cent", () => {
    const period = periodDays({
      periodFrom: "2026-12-15",
      periodTo: "2029-02-10",
    })!
    for (const amount of [1, 99_999, -12_345]) {
      const parts = spreadByDays(amount, period)
      expect(parts.reduce((sum, p) => sum + p.amount, 0)).toBe(amount)
      expect(parts).toHaveLength(4)
    }
  })
})

describe("accrueEntry", () => {
  it("leaves an entry without a period alone", () => {
    const e = insurance({ periodFrom: undefined, periodTo: undefined })
    expect(accrueEntry(e)).toEqual([e])
  })

  it("moves an entry whose period lies in one year to that year", () => {
    const e = insurance({ periodFrom: "2027-01-01", periodTo: "2027-03-31" })
    expect(accrueEntry(e).map((p) => p.date)).toEqual(["2027-01-01"])
  })

  it("spreads the net of a gross entry", () => {
    const e = insurance({
      amount: 125_500,
      vatRate: 25.5,
      amountMode: "gross",
    })
    const parts = accrueEntry(e)
    expect(parts.reduce((sum, p) => sum + p.amount, 0)).toBe(100_000)
  })

  it("spreads only the business share of a partly private cost", () => {
    const parts = accrueEntry(insurance({ share: 50 }))
    expect(parts.reduce((sum, p) => sum + p.amount, 0)).toBe(18_250)
  })

  it("ignores an invalid period", () => {
    const e = insurance({ periodFrom: "2027-01-01", periodTo: "2026-01-01" })
    expect(accrueEntry(e)).toEqual([e])
  })
})

describe("taxBasisEntries with a period", () => {
  it("puts each year's share in that year's result for a liikkeenharjoittaja", () => {
    const rows = [insurance()]
    expect(result(rows, 2026)).toBe(-6_100)
    expect(result(rows, 2027)).toBe(-30_400)
  })

  it("spreads an open entry too", () => {
    const rows = [insurance({ paidOn: null })]
    expect(result(rows, 2026)).toBe(-6_100)
  })

  it("is ignored by an ammatinharjoittaja, who is taxed on payment", () => {
    const rows = [insurance()]
    const professional = (y: number) =>
      incomeStatement(taxBasisEntries(rows, "professional"), cats, y).result
    expect(professional(2026)).toBe(-36_500)
    expect(professional(2027)).toBe(0)
  })
})
