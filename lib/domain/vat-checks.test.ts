import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import {
  canMarkFiled,
  vatCheckItems,
  type VatCheckInput,
} from "@/lib/domain/vat-checks"

/* What stands between a VAT period and its return (§8.7). */

const cats = indexCategories(defaultCategories())

const entry = (over: Partial<Entry>): Entry => ({
  id: over.date ?? "e",
  date: "2026-09-10",
  description: "Osto",
  type: "expense",
  catId: "333",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  atts: [{ id: "a", name: "k.pdf", type: "application/pdf", size: 1 }],
  ...over,
})

const input = (over: Partial<VatCheckInput> = {}): VatCheckInput => ({
  entries: [
    entry({}),
    entry({
      id: "b",
      date: "2026-09-20",
      amount: 9_900,
      atts: [{ id: "b", name: "l.pdf", type: "application/pdf", size: 2 }],
    }),
  ],
  cats,
  period: periodFromKey("2026-09")!,
  status: "due",
  today: "2026-10-20",
  dirty: false,
  vatPeriod: "month",
  bookStart: "2026-09",
  vatFiled: {},
  changeLog: [],
  ...over,
})

const ids = (over?: Partial<VatCheckInput>) =>
  vatCheckItems(input(over)).map((i) => i.id)

describe("vatCheckItems", () => {
  it("has nothing to say about a closed, tidy period", () => {
    const items = vatCheckItems(input())
    expect(items).toEqual([])
    expect(canMarkFiled(items)).toBe(true)
  })

  it("blocks a period that has not closed", () => {
    const items = vatCheckItems(input({ status: "open", today: "2026-09-25" }))
    expect(items[0]).toEqual({ id: "periodOngoing", severity: "blocker" })
    expect(canMarkFiled(items)).toBe(false)
  })

  it("blocks a period that has not started", () => {
    expect(ids({ status: "future", today: "2026-08-01" })).toContain(
      "periodOngoing"
    )
  })

  it("notes a nil return", () => {
    const items = vatCheckItems(input({ entries: [] }))
    expect(items.map((i) => i.id)).toEqual(["noEntries"])
    expect(canMarkFiled(items)).toBe(true)
  })

  it("warns about unsaved changes", () => {
    expect(ids({ dirty: true })).toEqual(["unsaved"])
  })

  it("counts only the period's own flagged entries", () => {
    const entries = [
      entry({ date: "2026-09-10", atts: [] }),
      entry({ id: "b", date: "2026-08-10", amount: 9_900, atts: [] }),
    ]
    const item = vatCheckItems(input({ entries })).find(
      (i) => i.id === "entryCheck"
    )
    expect(item).toMatchObject({ check: "noReceipt", n: 1 })
  })

  it("counts receipt files missing from the period", () => {
    const entries = [
      entry({
        atts: [{ id: null, name: "k.pdf", type: "application/pdf", size: 1, missing: true }],
      }),
    ]
    expect(
      vatCheckItems(input({ entries })).find((i) => i.id === "missingFiles")
    ).toMatchObject({ n: 1 })
  })

  it("lists earlier closed periods that are not marked as filed", () => {
    const item = vatCheckItems(
      input({
        entries: [entry({ date: "2026-08-10" }), entry({ id: "b", date: "2026-09-10", amount: 9_900 })],
        bookStart: "2026-07",
        vatFiled: { "2026-07": "2026-09-01" },
      })
    ).find((i) => i.id === "earlierUnfiled")
    expect(item).toEqual({
      id: "earlierUnfiled",
      severity: "warn",
      keys: ["2026-08"],
    })
  })

  it("ignores later periods and ones before the book began", () => {
    expect(ids({ bookStart: "2026-09" })).not.toContain("earlierUnfiled")
  })

  it("puts blockers before warnings before information", () => {
    const items = vatCheckItems(
      input({ entries: [], dirty: true, status: "open", today: "2026-09-25" })
    )
    expect(items.map((i) => i.severity)).toEqual(["blocker", "warn", "info"])
  })
})
