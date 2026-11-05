import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import { indexCategories, type Entry } from "@/lib/domain/types"
import {
  canLockYear,
  yearEndItems,
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
  yearEndItems(input(over)).map((i) => i.id)

describe("yearEndItems", () => {
  it("has nothing to say about a finished, tidy year", () => {
    const items = yearEndItems(input({ bookStart: "2025-03" }))
    expect(items.filter((i) => i.severity !== "info")).toEqual([])
    expect(canLockYear(items)).toBe(true)
  })

  it("blocks locking a year that has not ended", () => {
    const items = yearEndItems(input({ year: 2026, today: "2026-10-04" }))
    expect(items[0]).toEqual({ id: "yearOngoing", severity: "blocker" })
    expect(canLockYear(items)).toBe(false)
  })

  it("blocks the year that is just ending too", () => {
    expect(ids({ today: "2025-12-31" })).toContain("yearOngoing")
  })

  it("counts the entries a check flags, within the year only", () => {
    const noReceipt = entry({ date: "2025-05-05", atts: undefined })
    const lastYear = entry({ date: "2024-05-05", atts: undefined })
    const found = yearEndItems(
      input({ entries: [entry({}), noReceipt, lastYear] })
    ).find((i) => i.id === "entryCheck" && i.check === "noReceipt")
    expect(found).toMatchObject({ n: 1, severity: "warn" })
  })

  it("lists closed VAT periods that are not marked as filed", () => {
    const found = yearEndItems(input({ vatFiled: {} })).find(
      (i) => i.id === "vatUnfiled"
    )
    expect(found).toMatchObject({ keys: ["2025"] })
  })

  it("warns about a depreciation allowance left unused", () => {
    const purchase = entry({
      date: "2025-06-01",
      catId: "asset-purchase",
      amount: 200_000,
      vatRate: 0,
    })
    const found = yearEndItems(input({ entries: [purchase] })).find(
      (i) => i.id === "depreciation"
    )
    // A quarter of the 2 000 € base (EVL 30 §).
    expect(found).toMatchObject({ maximum: 50_000 })
  })

  it("warns that private use of a car needs the driving details (#1882)", () => {
    const use = entry({
      date: "2025-12-31",
      type: "income",
      catId: "313",
      amount: 80_000,
      vatRate: 0,
    })
    const found = yearEndItems(input({ entries: [use] })).find(
      (i) => i.id === "privateCar"
    )
    expect(found).toMatchObject({ severity: "warn", amount: 80_000 })
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
    const items = yearEndItems(input({ entries: [] }))
    expect(items.map((i) => i.id)).toContain("noEntries")
    expect(canLockYear(items)).toBe(true)
  })

  it("lists empty months after the first entry, from the start month on", () => {
    const found = yearEndItems(
      input({
        entries: [entry({ date: "2025-10-01" }), entry({ date: "2025-12-01" })],
      })
    ).find((i) => i.id === "emptyMonths")
    expect(found).toMatchObject({ months: [11] })
  })
})
