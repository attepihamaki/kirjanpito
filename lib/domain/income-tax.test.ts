import { describe, expect, it } from "vitest"

import {
  NO_TAX_PROFILE,
  estimateIncomeTax,
  estimateYel,
  incomeTaxRow,
  stateTax,
  yearPace,
  type TaxProfile,
} from "@/lib/domain/income-tax"
import { RULES, parseRuleTables } from "@/lib/domain/rule-tables"
import rulesJson from "@/data/rules.json"

const row = incomeTaxRow(2026)!

const profile = (over: Partial<TaxProfile> = {}): TaxProfile => ({
  ...NO_TAX_PROFILE,
  municipalRate: 7.5,
  ...over,
})

describe("the 2026 figures", () => {
  it("are in the tables, and no other year is assumed", () => {
    expect(row.year).toBe(2026)
    expect(incomeTaxRow(2024)).toBeNull()
  })

  it("follow the state scale at and between its brackets", () => {
    expect(stateTax(0, row)).toBe(0)
    expect(stateTax(2_200_000, row)).toBe(278_080)
    expect(stateTax(4_500_000, row)).toBe(869_280)
    expect(stateTax(5_210_000, row)).toBe(1_105_355)
  })

  it("must have bases that agree with the rates", () => {
    const raw = structuredClone(rulesJson) as {
      incomeTax: { stateScale: { base: number }[] }[]
    }
    raw.incomeTax[0].stateScale[2].base += 100
    expect(() => parseRuleTables(raw)).toThrow("stateScale[2].base")
    expect(RULES.incomeTax.length).toBeGreaterThan(0)
  })
})

describe("estimateIncomeTax", () => {
  it("needs a municipal rate", () => {
    expect(estimateIncomeTax(4_000_000, NO_TAX_PROFILE, row)).toBeNull()
  })

  it("works out a profit of 40 000 € with YEL and no other income", () => {
    const e = estimateIncomeTax(
      4_000_000,
      profile({ yelIncome: 2_000_000 }),
      row
    )!
    expect(e.entrepreneurDeduction).toBe(200_000)
    expect(e.parts).toEqual({
      pure: 3_800_000,
      municipalBase: 3_800_000,
      state: 642_830,
      municipal: 285_000,
      church: 0,
      healthCare: 41_800,
      dailyAllowance: 22_200,
      credit: 337_000,
      total: 654_830,
    })
    expect(e.withoutBusiness).toBe(0)
    expect(e.businessTax).toBe(654_830)
    expect(e.rate).toBe(16.4)
  })

  it("gives a small profit the basic deduction and no tax beyond what the credit covers", () => {
    const e = estimateIncomeTax(400_000, profile(), row)!
    expect(e.parts.municipalBase).toBe(0)
    expect(e.businessTax).toBe(0)
  })

  it("counts only what the business adds on top of wages", () => {
    const wages = profile({ otherIncome: 3_000_000, churchRate: 1.4 })
    const e = estimateIncomeTax(1_000_000, wages, row)!
    expect(e.withoutBusiness).toBeGreaterThan(0)
    expect(e.businessTax).toBe(e.parts.total - e.withoutBusiness)
    /* Added on top of 30 000 € of wages, the profit is taxed at the margin. */
    expect(e.rate).toBeGreaterThan(30)
  })

  it("taxes nothing for a loss", () => {
    const e = estimateIncomeTax(-500_000, profile(), row)!
    expect(e.profit).toBe(0)
    expect(e.businessTax).toBe(0)
  })
})

describe("estimateYel", () => {
  it("applies the rate and the starter discount", () => {
    expect(estimateYel(profile({ yelIncome: 2_000_000 }), row)).toEqual({
      yearly: 488_000,
      monthly: 40_667,
      rate: 24.4,
      belowMinimum: false,
    })
    const starter = estimateYel(
      profile({ yelIncome: 900_000, yelStarter: true }),
      row
    )!
    expect(starter.rate).toBe(19.03)
    expect(starter.belowMinimum).toBe(true)
  })

  it("is absent without a work income", () => {
    expect(estimateYel(profile(), row)).toBeNull()
  })
})

describe("yearPace", () => {
  it("carries the profit to date over twelve months", () => {
    expect(yearPace(1_000_000, 4)).toBe(3_000_000)
    expect(yearPace(1_000_000, 12)).toBe(1_000_000)
    expect(yearPace(1_000_000, 0)).toBe(1_000_000)
  })
})
