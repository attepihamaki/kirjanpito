import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  allTags,
  hasTag,
  normalizeTags,
  parseTagsInput,
  readTags,
  tagReport,
  tagsField,
  TAG_MAX_LENGTH,
  TAGS_MAX,
} from "@/lib/domain/tags"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

let n = 0
function entry(over: Partial<Entry>): Entry {
  return {
    id: `e${++n}`,
    date: "2026-05-10",
    description: "x",
    type: "income",
    catId: "300-domestic",
    amount: 12_550,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("normalizeTags", () => {
  it("trims, collapses spaces and keeps the first spelling of each tag", () => {
    expect(normalizeTags(["  Projekti   A ", "projekti a", "", "B|C"])).toEqual(
      ["Projekti A", "B C"]
    )
  })

  it("cuts a long tag and stops at the most a voucher keeps", () => {
    expect(normalizeTags(["x".repeat(60)])[0]).toHaveLength(TAG_MAX_LENGTH)
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`)
    expect(normalizeTags(many)).toHaveLength(TAGS_MAX)
  })

  it("reads comma-separated input", () => {
    expect(parseTagsInput("Projekti A, messut,")).toEqual([
      "Projekti A",
      "messut",
    ])
  })
})

describe("tagsField and readTags", () => {
  it("leaves the field out when there are no tags", () => {
    expect(tagsField([])).toEqual({})
    expect(tagsField(undefined)).toEqual({})
    expect(tagsField(["a"])).toEqual({ tags: ["a"] })
  })

  it("reads only an array of strings from a file", () => {
    expect(readTags(["a", 1, "b"])).toEqual({ tags: ["a", "b"] })
    expect(readTags("a")).toEqual({})
    expect(readTags(null)).toEqual({})
  })
})

describe("hasTag and allTags", () => {
  it("matches a tag whatever its case", () => {
    expect(hasTag({ tags: ["Projekti A"] }, "projekti a")).toBe(true)
    expect(hasTag({}, "a")).toBe(false)
  })

  it("lists each tag once in its most common spelling, most used first", () => {
    expect(
      allTags([
        { tags: ["messut", "Projekti A"] },
        { tags: ["projekti a"] },
        { tags: ["Projekti A"] },
        {},
      ])
    ).toEqual(["Projekti A", "messut"])
  })
})

describe("tagReport (§8.37)", () => {
  it("sums income, expenses and the result per tag, net of VAT, for the year", () => {
    const rows = tagReport(
      [
        entry({ tags: ["A"], amount: 12_550 }),
        entry({
          tags: ["A", "B"],
          type: "expense",
          catId: "344-other",
          amount: 2_510,
        }),
        entry({ tags: ["a"], date: "2025-12-31", amount: 99_999 }),
        entry({ amount: 50_000 }),
      ],
      cats,
      2026
    )
    expect(rows).toEqual([
      { tag: "A", income: 10_000, expenses: 2_000, result: 8_000, count: 2 },
      { tag: "B", income: 0, expenses: 2_000, result: -2_000, count: 1 },
    ])
  })

  it("counts only the business share of a cost used partly privately", () => {
    const [row] = tagReport(
      [
        entry({
          tags: ["auto"],
          type: "expense",
          catId: "344-other",
          amount: 10_000,
          vatRate: 0,
          share: 40,
        }),
      ],
      cats,
      2026
    )
    expect(row.expenses).toBe(4_000)
  })

  it("leaves out a VAT payment and an owner's withdrawal", () => {
    expect(
      tagReport(
        [
          entry({
            tags: ["x"],
            type: "expense",
            catId: "owner-withdrawal",
            vatRate: 0,
          }),
        ],
        cats,
        2026
      )
    ).toEqual([])
  })
})
