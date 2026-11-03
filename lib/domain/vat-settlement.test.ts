import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { ledgerTotals, vatReport } from "@/lib/domain/vat"
import { periodFromKey, type VatPeriod } from "@/lib/domain/vat-deadline"
import {
  defaultSettledKey,
  settledKey,
  settlementSummary,
} from "@/lib/domain/vat-settlement"

const cats = indexCategories(defaultCategories())
const period = (key: string) => periodFromKey(key) as VatPeriod

function settlement(date: string, amount: number, settles?: string): Entry {
  return {
    id: `${date}-${amount}`,
    date,
    description: "ALV",
    type: amount < 0 ? "income" : "expense",
    catId: amount < 0 ? "vat-refund" : "vat-payment",
    amount: Math.abs(amount),
    vatRate: 0,
    amountMode: "gross",
    ...(settles ? { settles } : {}),
  }
}

describe("periodFromKey", () => {
  it("reads all three kinds of key", () => {
    expect(period("2026-09").to).toBe("2026-09-30")
    expect(period("2026-Q3").to).toBe("2026-09-30")
    expect(period("2026").to).toBe("2026-12-31")
  })

  it("refuses a key that names no period", () => {
    expect(periodFromKey("2026-13")).toBeNull()
    expect(periodFromKey("2026-Q5")).toBeNull()
    expect(periodFromKey("soon")).toBeNull()
  })
})

describe("the period a payment settles", () => {
  it("defaults to the period before the payment's own", () => {
    expect(defaultSettledKey("month", "2026-11-12")).toBe("2026-10")
    expect(defaultSettledKey("month", "2026-01-12")).toBe("2025-12")
    expect(defaultSettledKey("quarter", "2027-02-12")).toBe("2026-Q4")
    expect(defaultSettledKey("year", "2027-02-28")).toBe("2026")
  })

  it("keeps the period the entry records", () => {
    expect(settledKey(settlement("2026-11-12", 100, "2026-09"), "month")).toBe(
      "2026-09"
    )
  })
})

describe("a VAT payment as an entry", () => {
  const entries = [
    settlement("2026-11-12", 36_218, "2026-10"),
    settlement("2026-11-20", -5_000, "2026-09"),
  ]

  it("is neither on the VAT return nor in the totals", () => {
    expect(vatReport(entries, cats).due).toBe(0)
    expect(ledgerTotals(entries, cats)).toEqual({
      incomeNet: 0,
      expenseNet: 0,
      due: 0,
    })
  })

  it("is not on the income statement", () => {
    expect(incomeStatement(entries, cats, 2026).result).toBe(0)
  })
})

describe("settlementSummary", () => {
  it("has nothing to compare without a settlement", () => {
    const s = settlementSummary(period("2026-09"), [], cats, "month", 10_000)

    expect(s.rows).toEqual([])
    expect(s.difference).toBeNull()
  })

  it("matches a payment of the amount due", () => {
    const s = settlementSummary(
      period("2026-09"),
      [settlement("2026-11-12", 10_000, "2026-09")],
      cats,
      "month",
      10_000
    )

    expect(s.difference).toBe(0)
  })

  it("matches a refund of a refundable amount", () => {
    const s = settlementSummary(
      period("2026-09"),
      [settlement("2026-11-20", -4_000, "2026-09")],
      cats,
      "month",
      -4_000
    )

    expect(s.rows[0].amount).toBe(-4_000)
    expect(s.difference).toBe(0)
  })

  it("reports what a part payment leaves", () => {
    const s = settlementSummary(
      period("2026-09"),
      [settlement("2026-11-12", 6_000, "2026-09")],
      cats,
      "month",
      10_000
    )

    expect(s.difference).toBe(-4_000)
  })

  it("adds up the months of a quarter", () => {
    const s = settlementSummary(
      period("2026-Q3"),
      [
        settlement("2026-09-14", 1_000, "2026-07"),
        settlement("2026-10-12", 2_000, "2026-08"),
        settlement("2026-12-14", 9_000, "2026-10"),
      ],
      cats,
      "quarter",
      3_000
    )

    expect(s.rows.map((r) => r.period.key)).toEqual(["2026-07", "2026-08"])
    expect(s.difference).toBe(0)
  })

  it("lists a quarter's payment under its month without comparing it", () => {
    const s = settlementSummary(
      period("2026-08"),
      [settlement("2026-11-12", 3_000, "2026-Q3")],
      cats,
      "month",
      1_000
    )

    expect(s.rows).toHaveLength(1)
    expect(s.wider).toBe(true)
    expect(s.difference).toBeNull()
  })

  it("places an entry without a period by its date", () => {
    const s = settlementSummary(
      period("2026-10"),
      [settlement("2026-11-12", 36_218)],
      cats,
      "month",
      36_218
    )

    expect(s.difference).toBe(0)
  })
})
