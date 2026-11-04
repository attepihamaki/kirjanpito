import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import {
  carryOverYearEnd,
  hasYearEndFigures,
  newYearDue,
  newYearTarget,
  newYearSummary,
} from "@/lib/domain/new-year"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry>): Entry {
  return {
    id: String(Math.random()),
    date: "2026-06-01",
    description: "",
    type: "expense",
    catId: "333",
    amount: 100_000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

const base = {
  cats,
  year: 2027,
  assetOpening: null,
  loanOpening: null,
  yearEnd: {},
  form5Filed: {},
  recurring: [],
}

describe("newYearSummary", () => {
  it("reads the previous year's closing figures", () => {
    const entries = [
      entry({ type: "income", catId: "301", amount: 500_000 }),
      entry({ catId: "333", amount: 120_000 }),
      entry({ catId: "asset-purchase", amount: 400_000 }),
      entry({ catId: "337", amount: 100_000, date: "2026-12-31" }),
      entry({ type: "income", catId: "loan-drawdown", amount: 300_000 }),
      entry({
        type: "income",
        catId: "300-domestic",
        amount: 250_000,
        date: "2026-12-20",
        paidOn: "2027-01-10",
      }),
    ]
    const s = newYearSummary({ ...base, entries })
    expect(s.previous).toBe(2026)
    expect(s.previousHasEntries).toBe(true)
    expect(s.previousResult).toBe(500_000 - 120_000 - 100_000)
    expect(s.assetPool).toBe(300_000)
    expect(s.loans).toBe(300_000)
    expect(s.receivables).toBe(250_000)
    expect(s.payables).toBe(0)
    expect(s.openCount).toBe(1)
    expect(s.previousFiledOn).toBeNull()
    expect(s.locked).toBe(false)
  })

  it("reports the filed mark and a locked new year", () => {
    const s = newYearSummary({
      ...base,
      entries: [entry({})],
      form5Filed: { "2026": "2027-03-01", "2027": "2028-03-01" },
    })
    expect(s.previousFiledOn).toBe("2027-03-01")
    expect(s.locked).toBe(true)
  })

  it("is empty for a book with nothing the year before", () => {
    const s = newYearSummary({
      ...base,
      entries: [entry({ date: "2027-02-01" })],
    })
    expect(s.previousHasEntries).toBe(false)
    expect(s.assetPool).toBe(0)
    expect(s.loans).toBe(0)
  })
})

describe("carryOverYearEnd", () => {
  const last = { ...EMPTY_YEAR_END, goods: 120_000, cash: 3_500 }

  it("copies the previous year's figures", () => {
    const out = carryOverYearEnd({ "2026": last }, 2027, false)
    expect(out?.values).toEqual(last)
    expect(out?.replaces).toBe(false)
  })

  it("says when it would replace figures already typed in", () => {
    const out = carryOverYearEnd(
      { "2026": last, "2027": { ...EMPTY_YEAR_END, goods: 1 } },
      2027,
      false
    )
    expect(out?.replaces).toBe(true)
  })

  it("offers nothing without figures, or in a locked year", () => {
    expect(carryOverYearEnd({}, 2027, false)).toBeNull()
    expect(carryOverYearEnd({ "2026": EMPTY_YEAR_END }, 2027, false)).toBeNull()
    expect(carryOverYearEnd({ "2026": last }, 2027, true)).toBeNull()
  })
})

describe("newYearTarget", () => {
  it("is this year until October and next year from November", () => {
    expect(newYearTarget("2026-10-31")).toBe(2026)
    expect(newYearTarget("2026-11-04")).toBe(2027)
    expect(newYearTarget("2027-01-04")).toBe(2027)
  })
})

describe("newYearDue", () => {
  it("nudges from November to February while the target year has no figures", () => {
    expect(newYearDue({}, "2026-11-04", true)).toBe(true)
    expect(newYearDue({}, "2027-02-28", true)).toBe(true)
    expect(newYearDue({}, "2027-03-01", true)).toBe(false)
    expect(newYearDue({}, "2026-10-31", true)).toBe(false)
  })

  it("stays quiet for an empty last year or typed figures", () => {
    expect(newYearDue({}, "2026-11-04", false)).toBe(false)
    expect(
      newYearDue({ "2027": { ...EMPTY_YEAR_END, cash: 1 } }, "2026-11-04", true)
    ).toBe(false)
  })
})

describe("hasYearEndFigures", () => {
  it("is false for nothing or all zeros", () => {
    expect(hasYearEndFigures(undefined)).toBe(false)
    expect(hasYearEndFigures(EMPTY_YEAR_END)).toBe(false)
    expect(hasYearEndFigures({ ...EMPTY_YEAR_END, otherLongDebt: 5 })).toBe(
      true
    )
  })
})
