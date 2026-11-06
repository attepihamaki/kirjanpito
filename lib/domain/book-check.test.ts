import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { bookCheck, type BookCheckInput } from "@/lib/domain/book-check"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* "Check my book": every rule set over the whole book (§8.23). */

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

const input = (over: Partial<BookCheckInput> = {}): BookCheckInput => ({
  entries: [entry({})],
  cats,
  today: "2026-11-06",
  dirty: false,
  traderType: "professional",
  vatPeriod: "year",
  bookStart: "2025-03",
  vatFiled: { "2025": "2026-02-20" },
  changeLog: [],
  assetOpening: null,
  loanOpening: null,
  yearEnd: {},
  ...over,
})

const summary = (over?: Partial<BookCheckInput>) =>
  bookCheck(input(over)).map((b) => [b.year, b.finding.ruleId])

describe("bookCheck", () => {
  it("has nothing to say about an empty book", () => {
    expect(bookCheck(input({ entries: [] }))).toEqual([])
  })

  it("reports unsaved changes once, against no year", () => {
    const entries = [entry({}), entry({ id: "b", date: "2026-02-01" })]
    const found = summary({ entries, dirty: true }).filter(
      ([, id]) => id === "unsaved"
    )
    expect(found).toEqual([[null, "unsaved"]])
  })

  it("checks every year that has entries, newest first", () => {
    const entries = [
      entry({ id: "a", date: "2025-03-01", atts: [] }),
      entry({ id: "b", date: "2026-02-01", atts: [] }),
    ]
    const noReceipt = bookCheck(input({ entries })).filter(
      (b) =>
        b.set === "yearEnd" &&
        b.finding.ruleId === "entryCheck" &&
        b.finding.data.check === "noReceipt"
    )
    expect(noReceipt.map((b) => b.year)).toEqual([2026, 2025])
  })

  it("holds back what a year leaves behind until the year has ended", () => {
    const entries = [entry({}), entry({ id: "b", date: "2026-02-01" })]
    const forYear = (year: number) =>
      bookCheck(input({ entries }))
        .filter((b) => b.year === year)
        .map((b) => b.finding.ruleId)
    expect(forYear(2025)).toContain("yearEndFigures")
    expect(forYear(2026)).not.toContain("yearEndFigures")
  })

  it("never asks whether a year may be locked", () => {
    const all = bookCheck(
      input({ entries: [entry({ date: "2026-02-01" })], today: "2026-05-01" })
    ).map((b) => b.finding.ruleId)
    expect(all).not.toContain("yearOngoing")
    expect(all).not.toContain("noEntries")
  })

  it("puts blockers before warnings inside the book's own findings", () => {
    const sale = entry({
      type: "income",
      catId: "300-domestic",
      date: "2026-05-05",
      amount: 2_500_000,
      vatRate: 0,
      amountMode: "net",
    })
    const found = bookCheck(input({ entries: [sale], today: "2026-11-06" }))
    const own = found.filter((b) => b.year === null)
    expect(own[0]).toMatchObject({
      set: "vatLimits",
      finding: { ruleId: "vatThresholdOver", severity: "blocker" },
    })
  })

  it("finds nothing wrong with Verohallinto's own Form 5 checks on the sample year", () => {
    const entries = sampleEntries(createIdFactory())
    expect(
      bookCheck(input({ entries, bookStart: "2026-01", vatPeriod: "month" })).filter(
        (b) => b.set === "form5"
      )
    ).toEqual([])
  })
})
