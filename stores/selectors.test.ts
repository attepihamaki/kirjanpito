import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { filterAndSortEntries, selectionRange } from "@/stores/selectors"

describe("selectionRange (§8.4)", () => {
  const ids = ["a", "b", "c", "d"]

  it("takes every row between the two, whichever comes first", () => {
    expect(selectionRange(ids, "b", "d")).toEqual(["b", "c", "d"])
    expect(selectionRange(ids, "d", "b")).toEqual(["b", "c", "d"])
    expect(selectionRange(ids, "c", "c")).toEqual(["c"])
  })

  it("gives null when a row is no longer on the page", () => {
    expect(selectionRange(ids, "x", "b")).toBeNull()
  })
})

describe("filterAndSortEntries by tag (§8.37)", () => {
  const cats = indexCategories(defaultCategories())
  const base: Entry = {
    id: "a",
    date: "2026-05-10",
    description: "Myynti",
    type: "income",
    catId: "300-domestic",
    amount: 100,
    vatRate: 25.5,
    amountMode: "gross",
  }
  const entries: Entry[] = [
    { ...base, id: "a", tags: ["Projekti A"] },
    { ...base, id: "b", tags: ["messut"] },
    { ...base, id: "c" },
  ]
  const run = (tag: string, query = "") =>
    filterAndSortEntries(
      entries,
      cats,
      { query, type: "all", catId: "all", tag, flagged: null, sort: null },
      "fi",
      new Intl.Collator("fi")
    ).map((e) => e.id)

  it("keeps the entries carrying the tag, whatever its case", () => {
    expect(run("projekti a")).toEqual(["a"])
    expect(run("all")).toEqual(["a", "b", "c"])
  })

  it("finds a tag through the search too", () => {
    expect(run("all", "messu")).toEqual(["b"])
  })
})
