import { describe, expect, it } from "vitest"

import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import {
  carryOver,
  goodsMargin,
  inventoryOfEntries,
  inventoryTotals,
  stockFigures,
  syncYearEnd,
  itemCost,
  itemValue,
  lineValue,
  stockProblems,
  type StockItem,
} from "@/lib/domain/inventory"

function item(over: Partial<StockItem> = {}): StockItem {
  return {
    id: "s1",
    name: "Kahvipaketti",
    sku: "",
    unit: "kpl",
    kind: "goods",
    quantityMilli: 10_000,
    unitCents: 500,
    layers: [],
    lowerUnitCents: null,
    lowerReason: "",
    ...over,
  }
}

/* 10 bought at 4,00 €, then 10 at 6,00 €. */
const layers = [
  { date: "2026-03-01", quantityMilli: 10_000, unitCents: 400 },
  { date: "2026-09-01", quantityMilli: 10_000, unitCents: 600 },
]

describe("lineValue", () => {
  it("rounds quantity × unit cost to whole cents", () => {
    expect(lineValue(10_000, 500)).toBe(5000)
    expect(lineValue(2_500, 333)).toBe(833)
    expect(lineValue(0, 500)).toBe(0)
  })
})

describe("itemCost", () => {
  it("multiplies by the unit cost when there are no layers, under either method", () => {
    expect(itemCost(item(), "fifo")).toBe(5000)
    expect(itemCost(item(), "average")).toBe(5000)
  })

  it("FIFO values the newest purchases first", () => {
    const i = item({ quantityMilli: 15_000, layers })
    /* 10 at 6,00 + 5 at 4,00 */
    expect(itemCost(i, "fifo")).toBe(8000)
  })

  it("average prices every unit at the mean of the layers", () => {
    const i = item({ quantityMilli: 15_000, layers })
    /* mean 5,00 × 15 */
    expect(itemCost(i, "average")).toBe(7500)
  })

  it("prices units beyond the layers at the unit cost", () => {
    const i = item({ quantityMilli: 25_000, unitCents: 700, layers })
    expect(itemCost(i, "fifo")).toBe(4000 + 6000 + 5 * 700 * 1)
    expect(itemCost(i, "average")).toBe(10_000 + 3500)
  })

  it("is zero for a count of zero", () => {
    expect(itemCost(item({ quantityMilli: 0, layers }), "fifo")).toBe(0)
  })
})

describe("itemValue", () => {
  it("writes down to the lower value when it is below cost", () => {
    const v = itemValue(
      item({ lowerUnitCents: 300, lowerReason: "Vanhenee" }),
      "fifo"
    )
    expect(v).toEqual({ cost: 5000, writeDown: 2000, value: 3000 })
  })

  it("ignores a lower value above cost", () => {
    const v = itemValue(item({ lowerUnitCents: 900, lowerReason: "x" }), "fifo")
    expect(v).toEqual({ cost: 5000, writeDown: 0, value: 5000 })
  })
})

describe("inventoryTotals", () => {
  it("splits 708 and 709 by kind and skips empty rows", () => {
    const totals = inventoryTotals(
      [
        item(),
        item({ id: "s2", kind: "materials", quantityMilli: 2_000 }),
        item({ id: "s3", quantityMilli: 0 }),
        item({
          id: "s4",
          lowerUnitCents: 100,
          lowerReason: "Rikki",
          quantityMilli: 1_000,
        }),
      ],
      "fifo"
    )
    expect(totals).toEqual({
      rows: 3,
      cost: 5000 + 1000 + 500,
      writeDown: 400,
      goods: 5000 + 100,
      materials: 1000,
      value: 5000 + 1000 + 100,
    })
  })
})

describe("carryOver", () => {
  let n = 0
  const newId = () => `n${++n}`

  it("drops empty rows and the lower value", () => {
    const next = carryOver(
      [
        item({ lowerUnitCents: 300, lowerReason: "x" }),
        item({ id: "s2", quantityMilli: 0 }),
      ],
      "fifo",
      newId
    )
    expect(next).toHaveLength(1)
    expect(next[0].lowerUnitCents).toBeNull()
    expect(next[0].lowerReason).toBe("")
    expect(next[0].id).not.toBe("s1")
  })

  it("keeps only the layers still in stock under FIFO", () => {
    const [next] = carryOver(
      [item({ quantityMilli: 15_000, layers })],
      "fifo",
      newId
    )
    expect(next.layers).toEqual([
      { date: "2026-03-01", quantityMilli: 5_000, unitCents: 400 },
      { date: "2026-09-01", quantityMilli: 10_000, unitCents: 600 },
    ])
    expect(itemCost(next, "fifo")).toBe(8000)
  })

  it("folds the layers into one unit cost under average", () => {
    const [next] = carryOver(
      [item({ quantityMilli: 15_000, layers })],
      "average",
      newId
    )
    expect(next.layers).toEqual([])
    expect(next.unitCents).toBe(500)
    expect(itemCost(next, "average")).toBe(7500)
  })
})

describe("stockProblems", () => {
  it("flags a row with no name, no cost, or a lower value with no reason", () => {
    expect(stockProblems(item())).toEqual([])
    expect(stockProblems(item({ name: " " }))).toEqual(["no-name"])
    expect(stockProblems(item({ unitCents: 0 }))).toEqual(["no-cost"])
    expect(stockProblems(item({ lowerUnitCents: 100 }))).toEqual([
      "lower-without-reason",
    ])
  })
})

describe("inventoryOfEntries", () => {
  it("keeps only the years the entries fall in", () => {
    const inv = {
      method: "fifo" as const,
      years: { "2025": [item()], "2026": [item({ id: "s2" })] },
    }
    const out = inventoryOfEntries([{ date: "2026-02-01" }], inv)
    expect(Object.keys(out.years)).toEqual(["2026"])
    expect(out.method).toBe("fifo")
  })
})

describe("syncYearEnd", () => {
  const inv = {
    method: "fifo" as const,
    years: {
      "2026": [
        item(),
        item({ id: "s2", kind: "materials", quantityMilli: 2_000 }),
      ],
      "2025": [item({ quantityMilli: 0 })],
    },
  }

  it("has no figures for a year with no counted rows", () => {
    expect(stockFigures(inv, 2025)).toBeNull()
    expect(stockFigures(inv, 2024)).toBeNull()
    expect(stockFigures(inv, "2026")).toEqual({
      goods: 5000,
      otherCurrent: 1000,
    })
  })

  it("sets 708 and 709 and keeps every other figure", () => {
    const out = syncYearEnd({ "2026": { ...EMPTY_YEAR_END, cash: 700 } }, inv)
    expect(out["2026"]).toMatchObject({
      goods: 5000,
      otherCurrent: 1000,
      cash: 700,
    })
    expect(out["2025"]).toBeUndefined()
  })

  it("leaves typed figures of an uncounted year alone", () => {
    const typed = { "2025": { ...EMPTY_YEAR_END, goods: 123 } }
    const uncounted = { ...inv, years: { "2025": inv.years["2025"] } }
    expect(syncYearEnd(typed, uncounted)).toBe(typed)
  })

  it("returns the same object when nothing moved", () => {
    const once = syncYearEnd({}, inv)
    expect(syncYearEnd(once, inv)).toBe(once)
  })

  it("never rewrites a year whose Form 5 is filed", () => {
    const filed = { "2026": { ...EMPTY_YEAR_END, goods: 1 } }
    expect(syncYearEnd(filed, inv, { "2026": "2027-03-01" })).toBe(filed)
  })
})

describe("goodsMargin", () => {
  it("works out the cost of goods sold, the margin and the days of stock", () => {
    const m = goodsMargin({
      sales: 100_000,
      purchases: 60_000,
      opening: 10_000,
      closing: 30_000,
    })
    expect(m.cogs).toBe(40_000)
    expect(m.gross).toBe(60_000)
    expect(m.percent).toBe(60)
    expect(m.stockDays).toBe(Math.round((20_000 / 40_000) * 365))
  })

  it("has no percentage without sales and no days without a cost", () => {
    const m = goodsMargin({
      sales: 0,
      purchases: 0,
      opening: 0,
      closing: 5_000,
    })
    expect(m.cogs).toBe(-5_000)
    expect(m.percent).toBeNull()
    expect(m.stockDays).toBeNull()
  })
})
