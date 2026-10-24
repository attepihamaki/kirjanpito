import { describe, expect, it } from "vitest"

import {
  BUCKETS,
  DEFAULT_EN_NAMES,
  LINES,
  LINE_BY_KEY,
  LINE_KEYS,
  RATES,
  SALES,
  categoryLabel,
  categoryName,
  defaultCategories,
  groupName,
  lineName,
} from "@/lib/domain/accounts"
import type { Category } from "@/lib/domain/types"

describe("LINES", () => {
  it("has the 29 income statement lines", () => {
    expect(LINES).toHaveLength(29)
  })

  // 354 precedes 346/349/353 on purpose: it belongs under the "Muut
  // vähennyskelpoiset kulut" heading, and sorting the list numerically would
  // orphan it from that heading. CLAUDE.md §5's table has the same order and
  // states the table order is the display order.
  it("is in the documented display order", () => {
    expect(LINE_KEYS).toEqual([
      "300",
      "301",
      "312",
      "313",
      "314",
      "315",
      "317",
      "318",
      "319",
      "323",
      "324",
      "333",
      "334",
      "335",
      "336",
      "337",
      "341",
      "343",
      "344-travel",
      "344-vehicle",
      "344-meeting",
      "344-other",
      "354",
      "346",
      "349",
      "353",
      "365",
      "366",
      "367",
    ])
  })

  it("marks exactly 365, 366 and 367 non-deductible", () => {
    const nd = LINES.filter((l) => l.nondeductible).map((l) => l.key)
    expect(nd).toEqual(["365", "366", "367"])
  })

  it("gives every expense line a bucket and no income line one", () => {
    for (const l of LINES) {
      if (l.side === "expense") expect(l.bucket).not.toBeNull()
      else expect(l.bucket).toBeNull()
    }
  })

  it("uses every bucket at least once", () => {
    const used = new Set(LINES.map((l) => l.bucket).filter(Boolean))
    for (const b of BUCKETS) expect(used.has(b)).toBe(true)
  })

  it("has unique keys and is indexed consistently", () => {
    expect(new Set(LINE_KEYS).size).toBe(LINES.length)
    expect(LINE_BY_KEY.size).toBe(LINES.length)
  })

  it("matches the §5 default rates", () => {
    expect(LINE_BY_KEY.get("333")!.vatRate).toBe(25.5)
    expect(LINE_BY_KEY.get("343")!.vatRate).toBe(25.5)
    expect(LINE_BY_KEY.get("344-travel")!.vatRate).toBe(25.5)
    expect(LINE_BY_KEY.get("354")!.vatRate).toBe(0)
    expect(LINE_BY_KEY.get("335")!.vatRate).toBe(0)
    expect(LINE_BY_KEY.get("336")!.vatRate).toBe(0)
  })
})

describe("RATES", () => {
  it("offers the six rates in the documented order", () => {
    expect(RATES).toEqual([25.5, 24, 14, 13.5, 10, 0])
  })
})

describe("SALES", () => {
  it("defines the four line-300 categories", () => {
    expect(SALES.map((s) => [s.id, s.vatRate, s.kind])).toEqual([
      ["300-domestic", 25.5, "domestic"],
      ["300-eu", 0, "eu"],
      ["300-other", 0, "nonEu"],
      ["300-reverse", 0, "reverse"],
    ])
  })
})

describe("defaultCategories", () => {
  const cats = defaultCategories()

  it("returns 32 categories: four sales plus one per remaining line", () => {
    expect(cats).toHaveLength(32)
    expect(cats).toHaveLength(SALES.length + LINES.length - 1)
  })

  it("enables all of them and marks none custom", () => {
    expect(cats.every((c) => c.enabled && !c.custom)).toBe(true)
  })

  it("gives them unique ids", () => {
    expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length)
  })

  it("points every category at a real line", () => {
    for (const c of cats) expect(LINE_BY_KEY.has(c.line)).toBe(true)
  })

  it("gives every income category a kind and no expense category one", () => {
    for (const c of cats) {
      const side = LINE_BY_KEY.get(c.line)!.side
      if (side === "income") expect(c.kind).toBeDefined()
      else expect(c.kind).toBeUndefined()
    }
  })

  it("gives every category an English name", () => {
    for (const c of cats) expect(DEFAULT_EN_NAMES[c.id]).toBeTruthy()
  })
})

describe("naming", () => {
  const cats = defaultCategories()
  const byId = (id: string) => cats.find((c) => c.id === id)!

  it("translates default category names", () => {
    expect(categoryName(byId("333"), "fi")).toBe(
      "Ostot ja varastojen muutokset"
    )
    expect(categoryName(byId("333"), "en")).toBe(
      "Purchases and change in inventory"
    )
    expect(categoryName(byId("300-eu"), "en")).toBe("Sales – EU")
  })

  it("never translates a custom category", () => {
    const custom: Category = {
      id: "c-1",
      line: "344-other",
      name: "Pilvipalvelut",
      vatRate: 25.5,
      enabled: true,
      custom: true,
    }
    expect(categoryName(custom, "en")).toBe("Pilvipalvelut")
  })

  it("prefixes the label with the account number", () => {
    expect(categoryLabel(byId("333"), "fi")).toBe(
      "333 Ostot ja varastojen muutokset"
    )
    expect(categoryLabel(undefined, "fi")).toBe("")
  })

  it("resolves line and group names per language", () => {
    const line = LINE_BY_KEY.get("343")!
    expect(lineName(line, "fi")).toBe("Vuokrat")
    expect(lineName(line, "en")).toBe("Rent")
    expect(groupName(line, "fi")).toBe("Poistot, edustuskulut ja vuokrat")
    expect(groupName(LINE_BY_KEY.get("300")!, "fi")).toBeNull()
  })
})
