import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { filterPeriod } from "@/lib/domain/period"
import { taxFormSteps } from "@/lib/domain/tax-form"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { vatReturnSections, vatReturnValues } from "@/lib/domain/vat-return"

const cats = indexCategories(defaultCategories())
const sample = sampleEntries(createIdFactory("t"))

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "income",
    catId: "300-domestic",
    amount: 10000,
    vatRate: 25.5,
    amountMode: "net",
    ...over,
  }
}

function values(entries: readonly Entry[]) {
  const v = vatReturnValues(vatReturnSections(vatReport(entries, cats)))
  return (code: string) => v.get(code) ?? 0
}

describe("vatReturnSections", () => {
  it("gives the §10 figures for the whole year", () => {
    const v = values(sample)
    expect(v("301")).toBe(114750)
    expect(v("302")).toBe(0)
    expect(v("303")).toBe(0)
    expect(v("307")).toBe(38728)
    expect(v("308")).toBe(76022)
    expect(v("311")).toBe(320000)
    expect(v("312")).toBe(0)
    expect(v("319")).toBe(480000)
  })

  it("gives the §10 figures for October", () => {
    const v = values(
      filterPeriod(sample, { kind: "month", year: 2026, month: 10 })
    )
    expect(v("301")).toBe(38250)
    expect(v("307")).toBe(2032)
    expect(v("308")).toBe(36218)
  })

  // Verohallinto's check #1924 for tax years from 2025.
  it("makes 308 the tax fields minus the deductible tax", () => {
    const v = values(sample)
    const sum = ["301", "302", "303", "304", "305", "306", "318"].reduce(
      (acc, code) => acc + v(code),
      0
    )
    expect(v("308")).toBe(sum - v("307"))
  })

  it("puts a superseded rate in the field of the rate that replaced it", () => {
    const v = values([
      entry({ id: "a", vatRate: 25.5 }),
      entry({ id: "b", vatRate: 24 }),
      entry({ id: "c", vatRate: 14 }),
      entry({ id: "d", vatRate: 13.5 }),
      entry({ id: "e", vatRate: 10 }),
    ])
    expect(v("301")).toBe(2550 + 2400)
    expect(v("302")).toBe(1400 + 1350)
    expect(v("303")).toBe(1000)
  })

  it("counts exports and 0 % sales as zero-rated turnover", () => {
    const v = values([
      entry({ id: "a", catId: "300-other", vatRate: 0 }),
      entry({ id: "b", vatRate: 0, amount: 5000 }),
    ])
    expect(v("309")).toBe(15000)
  })

  it("leaves 0 % income outside line 300 off the return", () => {
    const v = values([entry({ catId: "318", vatRate: 0 })])
    expect(v("309")).toBe(0)
  })

  it("reports an import in 310 and 304 without changing the tax payable", () => {
    const base = values([entry({ id: "s" })])
    const v = values([
      entry({ id: "s" }),
      entry({
        id: "i",
        type: "expense",
        catId: "333-import",
        euPurchase: "import",
        vatRate: 25.5,
        amount: 20000,
      }),
    ])
    expect(v("310")).toBe(20000)
    expect(v("304")).toBe(5100)
    expect(v("307")).toBe(base("307") + 5100)
    expect(v("308")).toBe(base("308"))
  })

  it("reports reverse-charge purchases in 320 and 318", () => {
    const base = values([entry({ id: "s" })])
    const v = values([
      entry({ id: "s" }),
      entry({
        id: "r",
        type: "expense",
        catId: "334-reverse",
        euPurchase: "reverse",
        vatRate: 25.5,
        amount: 10000,
      }),
    ])
    expect(v("320")).toBe(10000)
    expect(v("318")).toBe(2550)
    expect(v("308")).toBe(base("308"))
  })

  it("reports EU goods and services in their own fields", () => {
    const v = values([
      entry({ id: "a", catId: "300-eu-goods", vatRate: 0 }),
      entry({ id: "b", catId: "300-eu-services", vatRate: 0, amount: 5000 }),
    ])
    expect(v("311")).toBe(10000)
    expect(v("312")).toBe(5000)
  })

  it("adds a row for the retired EU category only when it is in use", () => {
    const codes = (entries: readonly Entry[]) =>
      taxFormSteps(vatReturnSections(vatReport(entries, cats))).inputs.map(
        ({ row }) => row.code
      )
    expect(codes([entry({ catId: "300-eu", vatRate: 0 })])).toEqual(["311/312"])
    const all = vatReturnSections(vatReport([], cats)).flatMap((s) => s.rows)
    expect(all.some((r) => r.kind === "field" && r.code === "311/312")).toBe(
      false
    )
  })

  it("labels a negative result as a refund, in magnitude", () => {
    const sections = vatReturnSections(
      vatReport([entry({ type: "expense", catId: "333" })], cats)
    )
    const { totals } = taxFormSteps(sections)
    expect(totals).toHaveLength(1)
    expect(totals[0].label.fi).toBe("Palautukseen oikeuttava vero")
    expect(totals[0].value).toBe(2550)
  })

  it("has nothing to fill in for an empty period, only the total", () => {
    const { inputs, totals } = taxFormSteps(
      vatReturnSections(vatReport([], cats))
    )
    expect(inputs).toEqual([])
    expect(totals[0].label.fi).toBe("Maksettava vero")
  })
})
