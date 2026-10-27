import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  DEFAULT_LAYOUT,
  moveWidget,
  normalizeLayout,
  stepWidget,
} from "@/lib/domain/overview-layout"
import {
  mergeCategories,
  parseSettings,
  serializeSettings,
  type BookSettings,
} from "@/lib/domain/settings-file"

function settings(): BookSettings {
  const categories = defaultCategories()
  categories[0] = { ...categories[0], enabled: false, vatRate: 24 }
  categories.push({
    id: "c-abc",
    line: "334",
    name: "Ohjelmistot",
    vatRate: 25.5,
    enabled: true,
    custom: true,
  })
  return {
    language: "en",
    theme: "dark",
    vatPeriod: "quarter",
    vatFiled: { "2026-Q2": "2026-08-10", "2026-Q1": "2026-05-11" },
    overviewLayout: normalizeLayout([
      { id: "checks", size: "L", hidden: false },
    ]),
    autosave: true,
    categories,
    pageSize: { ledger: 25, categories: 50 },
  }
}

describe("settings.json", () => {
  it("round-trips every field", () => {
    const s = settings()
    expect(parseSettings(serializeSettings(s))).toEqual(s)
  })

  it("writes a version and sorts the filed marks", () => {
    const text = serializeSettings(settings())
    const json = JSON.parse(text)
    expect(json.version).toBe(1)
    expect(Object.keys(json.vatFiled)).toEqual(["2026-Q1", "2026-Q2"])
    expect(text.endsWith("\n")).toBe(true)
  })

  it("reads nothing from a file that is not JSON or not an object", () => {
    expect(parseSettings("not json")).toEqual({})
    expect(parseSettings("[1, 2]")).toEqual({})
  })

  it("drops a bad value and keeps the rest", () => {
    const parsed = parseSettings(
      JSON.stringify({
        language: "sv",
        theme: "dark",
        vatPeriod: "week",
        vatFiled: { "2026-09": "2026-11-10", "2026-13": "2026-01-01", x: 1 },
        pageSize: { ledger: 7, categories: 25 },
      })
    )
    expect(parsed).toEqual({
      theme: "dark",
      vatFiled: { "2026-09": "2026-11-10" },
    })
  })

  it("ignores keys it does not know", () => {
    expect(parseSettings(JSON.stringify({ version: 9, future: true }))).toEqual(
      {}
    )
  })
})

describe("mergeCategories", () => {
  it("keeps the chart of accounts and takes only the user's choices", () => {
    const merged = mergeCategories([
      {
        id: "333",
        line: "301",
        name: "Renamed",
        vatRate: 14,
        enabled: false,
        custom: false,
      },
    ])
    const c333 = merged.find((c) => c.id === "333")
    const original = defaultCategories().find((c) => c.id === "333")
    expect(c333).toEqual({ ...original, enabled: false, vatRate: 14 })
    expect(merged).toHaveLength(defaultCategories().length)
  })

  it("brings custom categories across and puts back missing defaults", () => {
    const merged = mergeCategories([
      {
        id: "c-1",
        line: "334",
        name: "Ohjelmistot",
        vatRate: 25.5,
        enabled: true,
        custom: true,
      },
    ])
    expect(merged.at(-1)?.id).toBe("c-1")
    expect(merged).toHaveLength(defaultCategories().length + 1)
  })

  it("skips a category whose line is not in the chart of accounts", () => {
    const parsed = parseSettings(
      JSON.stringify({
        categories: [
          {
            id: "c-1",
            line: "999",
            name: "X",
            vatRate: 0,
            enabled: true,
            custom: true,
          },
        ],
      })
    )
    expect(parsed.categories).toEqual(defaultCategories())
  })
})

describe("overview layout", () => {
  it("fills in every widget once, in the stored order", () => {
    const layout = normalizeLayout([
      { id: "checks", size: "L", hidden: true },
      { id: "nope" },
      { id: "checks", size: "S" },
      { id: "vat", size: "huge" },
    ])
    expect(layout.slice(0, 2)).toEqual([
      { id: "checks", size: "L", hidden: true },
      { id: "vat", size: "S", hidden: false },
    ])
    expect(layout.map((w) => w.id).sort()).toEqual(
      DEFAULT_LAYOUT.map((w) => w.id).sort()
    )
  })

  it("returns the default for something that is not a list", () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
  })

  it("moves a widget onto another's place", () => {
    const ids = moveWidget(DEFAULT_LAYOUT, "checks", "result").map((w) => w.id)
    expect(ids.slice(0, 2)).toEqual(["checks", "result"])
  })

  it("steps over hidden widgets", () => {
    const layout = DEFAULT_LAYOUT.map((w) =>
      w.id === "vat" ? { ...w, hidden: true } : w
    )
    const ids = stepWidget(layout, "result", 1).map((w) => w.id)
    expect(ids.indexOf("months")).toBeLessThan(ids.indexOf("result"))
    expect(stepWidget(layout, "result", -1)).toEqual(layout)
  })
})
