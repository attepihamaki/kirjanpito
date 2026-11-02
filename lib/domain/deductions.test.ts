import { describe, expect, it } from "vitest"

import {
  additionalDeduction,
  calculatedEntryDate,
  homeOfficeAmounts,
  mileageAllowance,
  perDiemAllowance,
  travelRates,
} from "@/lib/domain/deductions"

describe("deductions", () => {
  it("has Vero's figures for each year", () => {
    expect(travelRates(2025)).toEqual({
      km: 59,
      fullPerDiem: 5300,
      partialPerDiem: 2400,
    })
    expect(travelRates(2026)).toEqual({
      km: 55,
      fullPerDiem: 5400,
      partialPerDiem: 2500,
    })
    expect(travelRates(2027)?.km).toBe(58)
    expect(homeOfficeAmounts(2026)?.full).toBe(98_000)
  })

  it("has no figures for a year without a decision", () => {
    expect(travelRates(2010)).toBeNull()
    expect(homeOfficeAmounts(2027)).toBeNull()
  })

  it("takes booked costs off the allowance, and never goes below zero", () => {
    const rates = travelRates(2026)!
    expect(mileageAllowance(1000, rates)).toBe(55_000)
    expect(additionalDeduction(55_000, 20_000)).toBe(35_000)
    expect(additionalDeduction(55_000, 60_000)).toBe(0)
    expect(additionalDeduction(55_000, -1)).toBe(55_000)
  })

  it("adds up full and partial days", () => {
    expect(perDiemAllowance(2, 3, travelRates(2026)!)).toBe(18_300)
  })

  it("dates a calculated entry today within its year, else on the last day", () => {
    expect(calculatedEntryDate(2026, "2026-11-02")).toBe("2026-11-02")
    expect(calculatedEntryDate(2025, "2026-11-02")).toBe("2025-12-31")
  })
})
