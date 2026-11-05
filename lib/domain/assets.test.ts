import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  assetEntries,
  assetSchedule,
  maximumDepreciation,
} from "@/lib/domain/assets"
import { journal } from "@/lib/domain/books"
import { incomeStatement } from "@/lib/domain/income-statement"
import { summary } from "@/lib/domain/summary"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { ledgerTotals, vatReport } from "@/lib/domain/vat"

const cats = indexCategories(defaultCategories())

const entry = (
  date: string,
  catId: string,
  amount: number,
  over: Partial<Entry> = {}
): Entry => ({
  id: `${date}-${catId}`,
  date,
  description: catId,
  type: "expense",
  catId,
  amount,
  vatRate: 0,
  amountMode: "net",
  ...over,
})

describe("asset schedule", () => {
  it("is empty with no purchase and no opening balance", () => {
    expect(assetSchedule([], cats, null, 2026)).toEqual([])
  })

  it("follows Vero's example of a trade-in", () => {
    // 16 931,25 + 10 000 − 2 000 = 24 931,25, and 25 % of that is 6 232,81.
    const [year] = assetSchedule(
      [
        entry("2026-03-01", "asset-purchase", 1_000_000),
        entry("2026-03-01", "asset-sale", 200_000, { type: "income" }),
      ],
      cats,
      { year: 2026, amount: 1_693_125 },
      2026
    )
    expect(year.base).toBe(2_493_125)
    expect(year.maximum).toBe(623_281)
  })

  it("carries what is left forward, and the whole balance after no depreciation", () => {
    const schedule = assetSchedule(
      [
        entry("2024-05-01", "asset-purchase", 1_000_000),
        entry("2024-12-31", "337", 250_000),
      ],
      cats,
      null,
      2026
    )
    expect(schedule.map((y) => y.year)).toEqual([2024, 2025, 2026])
    expect(schedule[0].closing).toBe(750_000)
    expect(schedule[1].opening).toBe(750_000)
    expect(schedule[1].taken).toBe(0)
    expect(schedule[2].opening).toBe(750_000)
  })

  it("allows all of a balance of 1 200 € or less", () => {
    expect(maximumDepreciation(120_000, 2026)).toBe(120_000)
    expect(maximumDepreciation(120_001, 2026)).toBe(30_000)
  })

  it("keeps depreciation above the maximum out of the pool", () => {
    const [year] = assetSchedule(
      [
        entry("2026-01-01", "asset-purchase", 400_000),
        entry("2026-12-31", "337", 300_000),
      ],
      cats,
      null,
      2026
    )
    expect(year.maximum).toBe(100_000)
    expect(year.taken).toBe(300_000)
    expect(year.closing).toBe(300_000)
  })

  it("reports a sale above the balance", () => {
    const [year] = assetSchedule(
      [entry("2026-01-01", "asset-sale", 50_000, { type: "income" })],
      cats,
      null,
      2026
    )
    expect(year.base).toBe(0)
    expect(year.saleExcess).toBe(50_000)
    expect(year.closing).toBe(0)
  })

  it("lists the year's purchases and sales in date order", () => {
    const rows = assetEntries(
      [
        entry("2026-06-01", "asset-purchase", 1),
        entry("2026-02-01", "asset-sale", 1, { type: "income" }),
        entry("2026-03-01", "333", 1),
        entry("2025-03-01", "asset-purchase", 1),
      ],
      cats,
      2026
    )
    expect(rows.map((e) => e.date)).toEqual(["2026-02-01", "2026-06-01"])
  })
})

describe("a fixed asset purchase", () => {
  const purchase = entry("2026-03-01", "asset-purchase", 125_500, {
    vatRate: 25.5,
    amountMode: "gross",
  })
  const sale = entry("2026-04-01", "asset-sale", 25_100, {
    type: "income",
    vatRate: 25.5,
    amountMode: "gross",
  })

  it("counts for VAT", () => {
    const report = vatReport([purchase, sale], cats)
    expect(report.purchases.total.vat).toBe(25_500)
    expect(report.sales.total.vat).toBe(5_100)
  })

  it("stays out of the result and the income and expense figures", () => {
    const statement = incomeStatement([purchase, sale], cats, 2026)
    expect(statement.result).toBe(0)
    expect(statement.lines).toHaveLength(33)
    const grid = summary([purchase, sale], cats, 2026)
    expect(grid.totals.incomeNet).toBe(0)
    expect(grid.totals.expenseNet).toBe(0)
    const totals = ledgerTotals([purchase, sale], cats)
    expect(totals.incomeNet).toBe(0)
    expect(totals.expenseNet).toBe(0)
    expect(totals.due).toBe(5_100 - 25_500)
  })

  it("is listed in the journal but left out of its totals", () => {
    const book = journal([purchase], cats, 2026)
    expect(book.months[0].rows).toHaveLength(1)
    expect(book.expense.net).toBe(0)
  })
})
