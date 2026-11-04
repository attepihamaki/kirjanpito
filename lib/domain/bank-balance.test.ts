import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { bankEstimate } from "@/lib/domain/bank-balance"
import { indexCategories, type Entry } from "@/lib/domain/types"

const catMap = indexCategories(defaultCategories())

function entry(
  date: string,
  type: Entry["type"],
  catId: string,
  amount: number
) {
  const e: Entry = {
    id: `${date}-${catId}`,
    date,
    description: "x",
    type,
    catId,
    amount,
    vatRate: 25.5,
    amountMode: "gross",
  }
  return e
}

const balance = { amount: 100_000, date: "2026-10-15" }
const today = "2026-10-31"

describe("bankEstimate", () => {
  it("adds income and takes off expenses at their gross amounts", () => {
    const result = bankEstimate(
      balance,
      [
        entry("2026-10-20", "income", "300-domestic", 25_100),
        entry("2026-10-21", "expense", "333", 10_000),
      ],
      catMap,
      today
    )
    expect(result).toEqual({
      count: 2,
      movement: 15_100,
      estimate: 115_100,
    })
  })

  it("leaves out entries up to the balance date and after today", () => {
    const result = bankEstimate(
      balance,
      [
        entry("2026-10-14", "income", "300-domestic", 1_000),
        entry("2026-10-15", "income", "300-domestic", 1_000),
        entry("2026-11-01", "income", "300-domestic", 1_000),
      ],
      catMap,
      today
    )
    expect(result).toEqual({ count: 0, movement: 0, estimate: 100_000 })
  })

  it("counts today's entries", () => {
    const result = bankEstimate(
      balance,
      [entry(today, "expense", "333", 1_000)],
      catMap,
      today
    )
    expect(result.estimate).toBe(99_000)
  })

  it("skips lines where no money moves", () => {
    const result = bankEstimate(
      balance,
      [
        entry("2026-10-20", "expense", "337", 50_000),
        entry("2026-10-20", "expense", "354", 20_000),
        entry("2026-10-20", "income", "313", 5_000),
      ],
      catMap,
      today
    )
    expect(result).toEqual({ count: 0, movement: 0, estimate: 100_000 })
  })

  it("counts a fixed asset purchase, which leaves the statement but not the bank", () => {
    const cat = defaultCategories().find((c) => c.line === "asset-purchase")
    const result = bankEstimate(
      balance,
      [entry("2026-10-20", "expense", cat?.id ?? "", 40_000)],
      catMap,
      today
    )
    expect(result.movement).toBe(-40_000)
  })
})

describe("bankEstimate and cash", () => {
  it("leaves out a payment made in cash", () => {
    const cash = {
      ...entry("2026-10-20", "expense", "333", 5_000),
      cash: true as const,
    }
    const result = bankEstimate(balance, [cash], catMap, today)
    expect(result).toEqual({ count: 0, movement: 0, estimate: 100_000 })
  })
})
