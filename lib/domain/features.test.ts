import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  applyHiddenFeatures,
  featureInUse,
  featureOfCategory,
  shownFeatures,
} from "@/lib/domain/features"
import type { Entry } from "@/lib/domain/types"

function entry(catId: string): Entry {
  return {
    id: "e",
    date: "2026-11-05",
    description: "x",
    type: "expense",
    catId,
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross",
  }
}

const cats = defaultCategories()
const byId = (list: typeof cats, id: string) => list.find((c) => c.id === id)

describe("featureOfCategory", () => {
  it("maps the staff, car, EU sale and loan categories", () => {
    expect(featureOfCategory(byId(cats, "335")!)).toBe("employees")
    expect(featureOfCategory(byId(cats, "336")!)).toBe("employees")
    expect(featureOfCategory(byId(cats, "344-vehicle")!)).toBe("car")
    expect(featureOfCategory(byId(cats, "300-eu-goods")!)).toBe("euSales")
  })

  it("leaves ordinary categories alone", () => {
    expect(featureOfCategory(byId(cats, "333")!)).toBeNull()
  })
})

describe("shownFeatures", () => {
  it("shows everything for a book that hides nothing", () => {
    expect(shownFeatures([], [], cats).size).toBe(5)
  })

  it("drops a hidden feature the book does not use", () => {
    const shown = shownFeatures(["euSales", "employees"], [], cats)
    expect(shown.has("euSales")).toBe(false)
    expect(shown.has("employees")).toBe(false)
    expect(shown.has("car")).toBe(true)
  })

  it("keeps a hidden feature that has entries", () => {
    const shown = shownFeatures(["employees"], [entry("335")], cats)
    expect(shown.has("employees")).toBe(true)
  })

  it("counts an entry on the home office category as use", () => {
    expect(featureInUse("homeOffice", [entry("354")], cats)).toBe(true)
    expect(featureInUse("homeOffice", [], cats)).toBe(false)
  })
})

describe("applyHiddenFeatures", () => {
  it("disables the categories of a newly hidden feature", () => {
    const next = applyHiddenFeatures(cats, [], ["employees"])
    expect(byId(next, "335")?.enabled).toBe(false)
    expect(byId(next, "336")?.enabled).toBe(false)
    expect(byId(next, "333")?.enabled).toBe(true)
  })

  it("enables them again when the feature comes back", () => {
    const hidden = applyHiddenFeatures(cats, [], ["employees"])
    const back = applyHiddenFeatures(hidden, ["employees"], [])
    expect(byId(back, "335")?.enabled).toBe(true)
  })

  it("never enables the retired EU category", () => {
    const next = applyHiddenFeatures(cats, ["euSales"], [])
    expect(byId(next, "300-eu")?.enabled).toBe(false)
  })

  it("leaves categories alone when nothing changed", () => {
    const off = cats.map((c) => (c.id === "335" ? { ...c, enabled: false } : c))
    const next = applyHiddenFeatures(off, [], [])
    expect(byId(next, "335")?.enabled).toBe(false)
  })
})
