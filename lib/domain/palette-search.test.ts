import { describe, expect, it } from "vitest"

import {
  matchesWords,
  queryWords,
  searchItems,
} from "@/lib/domain/palette-search"

describe("palette search", () => {
  it("matches every word in any order, case and without the Finnish letters", () => {
    const words = queryWords("  Paiva KIRJA ")
    expect(words).toEqual(["paiva", "kirja"])
    expect(matchesWords(words, "Kirjanpito päivä")).toBe(true)
    expect(matchesWords(words, "Kirjanpito")).toBe(false)
  })

  it("keeps the given order, stops at the limit and finds nothing for nothing", () => {
    const items = ["Lasku 1", "Lasku 2", "Muu", "Lasku 3"]
    expect(searchItems(items, queryWords("lasku"), (s) => s, 2)).toEqual([
      "Lasku 1",
      "Lasku 2",
    ])
    expect(searchItems(items, queryWords(""), (s) => s, 5)).toEqual([])
  })
})
