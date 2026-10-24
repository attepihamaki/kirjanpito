import { describe, expect, it } from "vitest"

import { RATES, defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { salesTotal, summary } from "@/lib/domain/summary"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)
const sample = sampleEntries(createIdFactory())
const s = summary(sample, cats, 2026)

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "income",
    catId: "300-domestic",
    amount: 10000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

describe("summary — sample 2026", () => {
  it("returns twelve month rows, January first", () => {
    expect(s.months).toHaveLength(12)
    expect(s.months.map((m) => m.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
  })

  it("reports income by month", () => {
    expect(s.months.map((m) => m.incomeNet)).toEqual([
      200000, 100000, 320000, 0, 480000, 0, 0, 0, 0, 150000, 0, 0,
    ])
  })

  it("reports expenses by month", () => {
    expect(s.months.map((m) => m.expenseNet)).toEqual([
      17235, 35857, 43216, 40139, 0, 31000, 0, 0, 9482, 8818, 0, 0,
    ])
  })

  it("totals the year", () => {
    expect(s.totals.incomeNet).toBe(1250000)
    expect(s.totals.expenseNet).toBe(185747)
  })

  it("splits expenses into buckets", () => {
    expect(s.totals.byBucket).toEqual({
      purchases: 22821,
      personnel: 31000,
      depreciation: 107571,
      otherDeductible: 23505,
      financial: 850,
      provisions: 0,
      nondeductible: 0,
    })
  })

  it("places sales in the right columns", () => {
    expect(s.months[9].salesByRate.get(25.5)).toBe(150000)
    expect(s.months[2].eu).toBe(320000)
    expect(s.months[4].reverse).toBe(480000)
    expect(s.months.every((m) => m.otherIncome === 0)).toBe(true)
  })

  it("sums the totals row column-wise", () => {
    expect(s.totals.eu).toBe(320000)
    expect(s.totals.reverse).toBe(480000)
    expect(s.totals.salesByRate.get(25.5)).toBe(450000)
  })
})

describe("summary — column integrity", () => {
  // Without rateColumns covering the rates actually used, a sale at an
  // unlisted rate would raise the row total while appearing in no column.
  it("keeps every row's sales total equal to the sum of its visible columns", () => {
    const check = (sum: ReturnType<typeof summary>) => {
      for (const row of [...sum.months, sum.totals]) {
        const visible =
          row.eu +
          row.nonEu +
          row.reverse +
          sum.rateColumns.reduce((a, r) => a + (row.salesByRate.get(r) ?? 0), 0)
        expect(visible).toBe(salesTotal(row))
      }
    }
    check(s)
    check(summary([entry({ vatRate: 9, amount: 5000 })], cats, 2026))
  })

  it("adds a column for a rate that is used but not standard", () => {
    const custom = summary([entry({ vatRate: 9 })], cats, 2026)
    expect(custom.rateColumns).toContain(9)
    expect(custom.rateColumns).toEqual(
      [...custom.rateColumns].sort((a, b) => b - a)
    )
  })

  it("always keeps the six standard rates, even when unused", () => {
    for (const r of RATES) expect(s.rateColumns).toContain(r)
  })
})

describe("summary — classification", () => {
  it("puts income on lines 301–324 into otherIncome, not a sales column", () => {
    const r = summary([entry({ catId: "318", amount: 7000 })], cats, 2026)
    expect(r.totals.otherIncome).toBe(7000)
    expect(salesTotal(r.totals)).toBe(0)
    expect(r.totals.incomeNet).toBe(7000)
  })

  it("buckets an expense whose line has no bucket under muut", () => {
    const orphan: Category = {
      id: "c-orphan",
      line: "nope",
      name: "Tuntematon",
      vatRate: 0,
      enabled: true,
      custom: true,
    }
    const withOrphan = indexCategories([...baseCats, orphan])
    const r = summary(
      [entry({ type: "expense", catId: "c-orphan", amount: 1200 })],
      withOrphan,
      2026
    )
    expect(r.totals.byBucket.otherDeductible).toBe(1200)
  })

  it("ignores entries from other years", () => {
    const r = summary([entry({ date: "2025-05-05" })], cats, 2026)
    expect(r.totals.incomeNet).toBe(0)
  })
})
