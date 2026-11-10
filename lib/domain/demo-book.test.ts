import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { demoBook, demoYear } from "@/lib/domain/demo-book"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"

describe("demoYear", () => {
  it("shows this year from April, and last year before it", () => {
    expect(demoYear("2026-04-01")).toBe(2026)
    expect(demoYear("2026-11-10")).toBe(2026)
    expect(demoYear("2026-03-31")).toBe(2025)
  })
})

describe("demoBook", () => {
  const cats = defaultCategories()
  const catMap = indexCategories(cats)

  it("holds the year's entries up to today, in date order", () => {
    const { year, entries } = demoBook("2026-11-10")
    expect(year).toBe(2026)
    expect(entries.length).toBeGreaterThan(40)
    expect(entries.every((e) => e.date >= "2026-01-01")).toBe(true)
    expect(entries.every((e) => e.date <= "2026-11-10")).toBe(true)
    const dates = entries.map((e) => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it("books every entry to an enabled default category", () => {
    for (const e of demoBook("2026-12-31").entries) {
      expect(catMap.get(e.catId)?.enabled, e.catId).toBe(true)
    }
  })

  it("names only parties it registers, and leaves the latest sale open", () => {
    const { entries, customers } = demoBook("2026-11-10")
    const ids = new Set(customers.map((c) => c.id))
    for (const e of entries) if (e.party) expect(ids.has(e.party)).toBe(true)
    const sales = entries.filter((e) => e.type === "income")
    expect(sales.at(-1)?.paidOn).toBeNull()
    expect(sales.slice(0, -1).every((e) => e.paidOn === undefined)).toBe(true)
  })

  it("ends the year in a profit", () => {
    const { year, entries } = demoBook("2026-12-31")
    expect(incomeStatement(entries, catMap, year).result).toBeGreaterThan(0)
  })

  it("keeps a month-end day inside a short month", () => {
    const { entries } = demoBook("2026-03-05")
    // Before April the demo is last year's, with the whole of February.
    expect(entries.some((e) => e.date === "2025-02-28")).toBe(true)
    expect(entries.some((e) => e.date.startsWith("2025-02-3"))).toBe(false)
  })
})
