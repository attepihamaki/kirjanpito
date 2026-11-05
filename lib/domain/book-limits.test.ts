import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { BOOK_LIMIT_RULES, bookLimits } from "@/lib/domain/book-limits"
import { evaluate } from "@/lib/domain/rules/engine"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())
const TODAY = "2026-11-03"

function sale(date: string, euros: number): Entry {
  return {
    id: date,
    date,
    description: "",
    type: "income",
    catId: "300-domestic",
    amount: euros * 100,
    vatRate: 0,
    amountMode: "gross",
  }
}

const both = (euros: number) => [
  sale("2024-06-01", euros),
  sale("2025-06-01", euros),
]

describe("bookLimits", () => {
  it("says nothing below the limits", () => {
    const out = bookLimits(both(50_000), cats, () => 0, TODAY)
    expect(out).toEqual({ year: 2025, singleEntry: null, statements: null })
  })

  it("leaves it to staff when one limit is exceeded in both years", () => {
    const out = bookLimits(both(250_000), cats, () => 0, TODAY)
    expect(out.singleEntry).toBe("staff")
    expect(out.statements).toBeNull()
  })

  it("needs double-entry books when two are exceeded in both years", () => {
    const out = bookLimits(both(250_000), cats, () => 15_000_000, TODAY)
    expect(out.singleEntry).toBe("over")
  })

  it("does not count a limit exceeded in only one of the years", () => {
    const entries = [sale("2025-06-01", 250_000)]
    const out = bookLimits(entries, cats, () => 0, TODAY)
    expect(out.singleEntry).toBeNull()
  })

  it("requires financial statements only above the micro limits", () => {
    const out = bookLimits(both(1_000_000), cats, () => 50_000_000, TODAY)
    expect(out.statements).toBe("over")
  })
})

describe("BOOK_LIMIT_RULES", () => {
  const run = (entries: Entry[], assets: number) =>
    evaluate(BOOK_LIMIT_RULES, {
      entries,
      cats,
      assetsOf: () => assets,
      today: TODAY,
    }).map((f) => [f.ruleId, f.severity, f.data.year])

  it("has no breach below the limits", () => {
    expect(run(both(50_000), 0)).toEqual([])
  })

  it("reports one limit over as information on staff", () => {
    expect(run(both(250_000), 0)).toEqual([
      ["singleEntryStaff", "info", 2025],
    ])
  })

  it("reports two limits over as a blocker", () => {
    expect(run(both(250_000), 15_000_000)).toContainEqual([
      "singleEntryOver",
      "blocker",
      2025,
    ])
  })
})
