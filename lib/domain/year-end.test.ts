import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import { indexCategories, type Entry } from "@/lib/domain/types"
import {
  canLockYear,
  topicFindings,
  topicStatus,
  yearEndFindings,
  yearWideFindings,
  YEAR_END_TOPICS,
  type YearEndInput,
} from "@/lib/domain/year-end"

/* What stands between a year and its Form 5 (§8.8). */

const cats = indexCategories(defaultCategories())

const entry = (over: Partial<Entry>): Entry => ({
  id: over.date ?? "e",
  date: "2025-03-01",
  description: "Osto",
  type: "expense",
  catId: "333",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  atts: [{ id: "a", name: "k.pdf", type: "application/pdf", size: 1 }],
  ...over,
})

const input = (over: Partial<YearEndInput> = {}): YearEndInput => ({
  entries: [
    entry({}),
    entry({
      id: "b",
      date: "2025-04-01",
      amount: 9_900,
      atts: [{ id: "b", name: "l.pdf", type: "application/pdf", size: 2 }],
    }),
  ],
  cats,
  year: 2025,
  today: "2026-02-10",
  dirty: false,
  vatPeriod: "year",
  bookStart: null,
  vatFiled: { "2025": "2026-02-20" },
  changeLog: [],
  assetOpening: null,
  yearEnd: { ...EMPTY_YEAR_END },
  ...over,
})

const ids = (over?: Partial<YearEndInput>) =>
  yearEndFindings(input(over)).map((i) => i.ruleId)

describe("yearEndFindings", () => {
  it("has nothing to say about a finished, tidy year", () => {
    const items = yearEndFindings(input({ bookStart: "2025-03" }))
    expect(items.filter((i) => i.severity !== "info")).toEqual([])
    expect(canLockYear(items)).toBe(true)
  })

  it("blocks locking a year that has not ended", () => {
    const items = yearEndFindings(input({ year: 2026, today: "2026-10-04" }))
    expect(items[0]).toMatchObject({
      ruleId: "yearOngoing",
      severity: "blocker",
    })
    expect(canLockYear(items)).toBe(false)
  })

  it("blocks the year that is just ending too", () => {
    expect(ids({ today: "2025-12-31" })).toContain("yearOngoing")
  })

  it("counts the entries a check flags, within the year only", () => {
    const noReceipt = entry({ date: "2025-05-05", atts: undefined })
    const lastYear = entry({ date: "2024-05-05", atts: undefined })
    const found = yearEndFindings(
      input({ entries: [entry({}), noReceipt, lastYear] })
    ).find((i) => i.ruleId === "entryCheck" && i.data.check === "noReceipt")
    expect(found).toMatchObject({ data: { n: 1 }, severity: "warn" })
  })

  it("lists closed VAT periods that are not marked as filed", () => {
    const found = yearEndFindings(input({ vatFiled: {} })).find(
      (i) => i.ruleId === "vatUnfiled"
    )
    expect(found).toMatchObject({ data: { keys: ["2025"] } })
  })

  it("warns about a depreciation allowance left unused", () => {
    const purchase = entry({
      date: "2025-06-01",
      catId: "asset-purchase",
      amount: 200_000,
      vatRate: 0,
    })
    const found = yearEndFindings(input({ entries: [purchase] })).find(
      (i) => i.ruleId === "depreciation"
    )
    // A quarter of the 2 000 € base (EVL 30 §).
    expect(found).toMatchObject({ data: { maximum: 50_000 } })
  })

  it("warns that private use of a car needs the driving details (#1882)", () => {
    const use = entry({
      date: "2025-12-31",
      type: "income",
      catId: "313",
      amount: 80_000,
      vatRate: 0,
    })
    const found = yearEndFindings(input({ entries: [use] })).find(
      (i) => i.ruleId === "privateCar"
    )
    expect(found).toMatchObject({ severity: "warn", data: { amount: 80_000 } })
    expect(ids()).not.toContain("privateCar")
  })

  it("notes year-end figures that were never typed in", () => {
    expect(ids({ yearEnd: undefined })).toContain("yearEndFigures")
    expect(ids()).not.toContain("yearEndFigures")
  })

  it("warns about unsaved changes", () => {
    expect(ids({ dirty: true })).toContain("unsaved")
  })

  it("reports a nil year as information", () => {
    const items = yearEndFindings(input({ entries: [] }))
    expect(items.map((i) => i.ruleId)).toContain("noEntries")
    expect(canLockYear(items)).toBe(true)
  })

  it("lists empty months after the first entry, from the start month on", () => {
    const found = yearEndFindings(
      input({
        entries: [entry({ date: "2025-10-01" }), entry({ date: "2025-12-01" })],
      })
    ).find((i) => i.ruleId === "emptyMonths")
    expect(found).toMatchObject({ data: { months: [11] } })
  })
})

describe("stock rules (§8.28)", () => {
  const row = (over = {}) => ({
    id: "s1",
    name: "Kahvi",
    sku: "",
    unit: "kpl",
    kind: "goods" as const,
    quantityMilli: 10_000,
    unitCents: 500,
    layers: [],
    lowerUnitCents: null,
    lowerReason: "",
    ...over,
  })
  const counted = (rows: ReturnType<typeof row>[]) => ({
    method: "average" as const,
    years: { "2025": rows },
  })
  /* Purchases of 100 + 79,15 = 179,15 € net: 12 550 and 9 900 gross at 25,5 %. */
  const purchases = 10_000 + 7_888

  it("says goods were bought when no stock is recorded", () => {
    const found = yearEndFindings(input()).find(
      (i) => i.ruleId === "stockMissing"
    )
    expect(found?.severity).toBe("info")
    expect(found?.data).toEqual({ purchases })
  })

  it("is quiet once a stock figure is recorded", () => {
    expect(ids({ yearEnd: { ...EMPTY_YEAR_END, goods: 1 } })).not.toContain(
      "stockMissing"
    )
  })

  it("warns when the counted stock is more than opening plus purchases", () => {
    const found = yearEndFindings(
      input({
        inventory: counted([row({ quantityMilli: 100_000 })]),
        openingStock: 1_000,
      })
    ).find((i) => i.ruleId === "stockTooHigh")
    expect(found?.severity).toBe("warn")
    expect(found?.data).toEqual({
      closing: 50_000,
      available: 1_000 + purchases,
    })
  })

  it("accepts a stock the purchases and opening stock cover", () => {
    expect(ids({ inventory: counted([row()]), openingStock: 0 })).not.toContain(
      "stockTooHigh"
    )
  })

  it("counts the rows that need attention", () => {
    const found = yearEndFindings(
      input({
        inventory: counted([row({ unitCents: 0 }), row({ id: "s2" })]),
      })
    ).find((i) => i.ruleId === "stockRows")
    expect(found?.data).toEqual({ n: 1 })
  })

  it("says nothing about a count when there is no stocktake", () => {
    const rules = ids({ openingStock: 5 })
    expect(rules).not.toContain("stockTooHigh")
    expect(rules).not.toContain("stockRows")
  })
})

describe("the year-end walk-through (§8.8)", () => {
  it("puts every finding in one topic, or above them all when the year runs", () => {
    const items = yearEndFindings(
      input({
        year: 2026,
        today: "2026-10-04",
        dirty: true,
        yearEnd: undefined,
      })
    )
    const placed = YEAR_END_TOPICS.flatMap((t) => topicFindings(items, t))
    expect(placed.length + yearWideFindings(items).length).toBe(items.length)
    expect(yearWideFindings(items).map((i) => i.ruleId)).toEqual([
      "yearOngoing",
    ])
  })

  it("rates a topic by its worst finding, and info alone as done enough", () => {
    const items = yearEndFindings(
      input({ dirty: true, vatFiled: {}, yearEnd: undefined })
    )
    expect(topicStatus(items, "entries")).toBe("warn")
    expect(topicStatus(items, "vat")).toBe("warn")
    expect(topicStatus(items, "balance")).toBe("info")
    expect(topicStatus(items, "assets")).toBe("clear")
  })
})
