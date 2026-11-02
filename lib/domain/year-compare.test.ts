import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { sameTimeLastYear, yearComparison } from "@/lib/domain/year-compare"

const cats = indexCategories(defaultCategories())

const sale = (date: string, amount: number): Entry => ({
  id: date,
  date,
  description: "Myynti",
  type: "income",
  catId: "300-domestic",
  amount,
  vatRate: 0,
  amountMode: "net",
})

const entries = [
  sale("2025-03-10", 100_000),
  sale("2025-11-10", 500_000),
  sale("2026-03-10", 150_000),
]

describe("year comparison", () => {
  it("is null with no entries in the year before", () => {
    expect(yearComparison(entries, cats, 2025)).toBeNull()
    expect(sameTimeLastYear(entries, cats, 2025, "2025-12-31")).toBeNull()
  })

  it("sets each month beside the same month of the year before", () => {
    const compare = yearComparison(entries, cats, 2026)!
    expect(compare.previous).toBe(2025)
    expect(compare.months[2].income).toBe(150_000)
    expect(compare.months[2].incomePrev).toBe(100_000)
    expect(compare.months[2].result).toBe(150_000)
    expect(compare.months[2].resultPrev).toBe(100_000)
    expect(compare.totals.incomePrev).toBe(600_000)
    expect(compare.totals.resultPrev).toBe(600_000)
  })

  it("stops the year before at the same day", () => {
    const last = sameTimeLastYear(entries, cats, 2026, "2026-03-31")!
    expect(last.result).toBe(100_000)
    expect(last.month).toBe(3)
    expect(last.monthResult).toBe(100_000)
  })
})
