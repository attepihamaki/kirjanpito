import { describe, expect, it } from "vitest"

import {
  matchesWords,
  queryWords,
  searchItems,
  searchesReceipts,
  snippetAround,
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

  it("searches receipts only once the query has three letters", () => {
    expect(searchesReceipts(queryWords("k"))).toBe(false)
    expect(searchesReceipts(queryWords("a b"))).toBe(false)
    expect(searchesReceipts(queryWords("abc"))).toBe(true)
    expect(searchesReceipts(queryWords("ab c"))).toBe(true)
  })

  it("cuts a snippet around the earliest word and marks the cuts", () => {
    const text = `${"x ".repeat(40)}kuitti clas ohlson oy porakone ${"y ".repeat(40)}`
    const s = snippetAround(text, queryWords("porakone clas"), 10)
    expect(s.startsWith("…")).toBe(true)
    expect(s.endsWith("…")).toBe(true)
    expect(s).toContain("clas ohlson")
    expect(snippetAround("lyhyt", ["lyhyt"])).toBe("lyhyt")
    expect(snippetAround("lyhyt", ["muu"])).toBe("")
  })

  it("keeps the Finnish letters in a snippet", () => {
    expect(snippetAround("päivän kahvit", queryWords("paivan"))).toBe(
      "päivän kahvit"
    )
  })
})
