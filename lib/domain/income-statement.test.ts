import { describe, expect, it } from "vitest"

import { LINE_KEYS, defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { incomeStatement, netByLine } from "@/lib/domain/income-statement"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())
const sample = sampleEntries(createIdFactory())

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 10000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

describe("netByLine", () => {
  it("aggregates the sample year onto eight lines", () => {
    expect(Object.fromEntries(netByLine(sample, cats))).toEqual({
      "300": 1250000,
      "333": 22821,
      "343": 107571,
      "336": 31000,
      "349": 850,
      "344-other": 11864,
      "344-vehicle": 7359,
      "344-meeting": 4282,
    })
  })

  it("books an unknown category to 301 or 344-other", () => {
    const m = netByLine(
      [
        entry({ id: "a", type: "income", catId: "nope", amount: 500 }),
        entry({ id: "b", type: "expense", catId: "nope", amount: 300 }),
      ],
      cats
    )
    expect(m.get("301")).toBe(500)
    expect(m.get("344-other")).toBe(300)
  })
})

describe("incomeStatement — sample 2026", () => {
  const s = incomeStatement(sample, cats, 2026)

  it("totals revenue at 1 250 000", () => {
    expect(s.revenueTotal).toBe(1250000)
  })

  it("totals deductible expenses at 185 747", () => {
    expect(s.deductibleTotal).toBe(185747)
  })

  it("has no non-deductible expenses", () => {
    expect(s.nonDeductibleTotal).toBe(0)
  })

  it("results in a profit of 1 064 253 on line 358", () => {
    expect(s.result).toBe(1064253)
    expect(s.resultLine).toBe("358")
    expect(s.resultMagnitude).toBe(1064253)
  })

  it("renders all 29 lines in display order, zeros included", () => {
    expect(s.lines.map((l) => l.line.key)).toEqual([...LINE_KEYS])
    expect(s.lines.find((l) => l.line.key === "312")!.net).toBe(0)
  })
})

describe("incomeStatement — §6.3 rules", () => {
  it("includes 353 and 354 in deductible expenses", () => {
    const s = incomeStatement(
      [
        entry({ id: "a", catId: "353", amount: 1000 }),
        entry({ id: "b", catId: "354", amount: 2000 }),
      ],
      cats,
      2026
    )
    expect(s.deductibleTotal).toBe(3000)
    expect(s.nonDeductibleTotal).toBe(0)
  })

  it("lists 365–367 but does not deduct them", () => {
    const s = incomeStatement(
      [
        entry({
          id: "a",
          type: "income",
          catId: "300-domestic",
          amount: 100000,
        }),
        entry({ id: "b", catId: "365", amount: 5000 }),
        entry({ id: "c", catId: "366", amount: 1000 }),
        entry({ id: "d", catId: "367", amount: 500 }),
      ],
      cats,
      2026
    )
    expect(s.deductibleTotal).toBe(0)
    expect(s.nonDeductibleTotal).toBe(6500)
    expect(s.result).toBe(100000)
    expect(s.lines.find((l) => l.line.key === "365")!.net).toBe(5000)
  })

  // Form 5 wants a positive figure on both 358 and 359; the prototype
  // printed a negative number on the loss line.
  it("reports a loss on 359 as a positive magnitude", () => {
    const s = incomeStatement(
      [
        entry({
          id: "a",
          type: "income",
          catId: "300-domestic",
          amount: 100000,
        }),
        entry({ id: "b", catId: "333", amount: 150000 }),
      ],
      cats,
      2026
    )
    expect(s.result).toBe(-50000)
    expect(s.resultLine).toBe("359")
    expect(s.resultMagnitude).toBe(50000)
  })

  it("treats a zero result as a profit", () => {
    const s = incomeStatement([], cats, 2026)
    expect(s.result).toBe(0)
    expect(s.resultLine).toBe("358")
  })

  it("excludes entries from other years", () => {
    const s = incomeStatement(
      [entry({ date: "2025-12-31", amount: 99999 })],
      cats,
      2026
    )
    expect(s.deductibleTotal).toBe(0)
  })
})
