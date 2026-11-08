import { describe, expect, it } from "vitest"

import { evaluate } from "@/lib/domain/rules/engine"
import { FORM5_RULES } from "@/lib/domain/rules/form5-rules"

function breaches(fields: Record<number, number>) {
  return evaluate(FORM5_RULES, (code) => fields[code] ?? 0).map((f) => f.ruleId)
}

describe("FORM5_RULES", () => {
  it("accepts an empty return and a consistent one", () => {
    expect(breaches({})).toEqual([])
    expect(
      breaches({ 300: 1000, 316: 1000, 333: 400, 355: 400, 358: 600 })
    ).toEqual([])
  })

  it("flags a revenue total that does not add up (#1411)", () => {
    expect(breaches({ 300: 1000, 316: 900, 358: 900 })).toContain("form5.316")
  })

  it("requires 342 to be at most half of 341 (#834) and present with it (#399)", () => {
    expect(
      breaches({ 341: 100, 342: 51, 343: 0, 355: 51, 358: 0, 359: 51, 316: 0 })
    ).toContain("form5.entertainmentHalf")
    expect(breaches({ 341: 100, 316: 0 })).toContain(
      "form5.entertainmentPortion"
    )
  })

  it("lets only one of 358 and 359 carry an amount (#802)", () => {
    expect(breaches({ 316: 500, 355: 200, 358: 300, 359: 300 })).toContain(
      "form5.resultOnce"
    )
  })

  it("checks the pool's closing balance (#1456) and the 25 % cap (#1410)", () => {
    expect(
      breaches({
        800: 1000,
        801: 0,
        804: 250,
        806: 750,
        338: 250,
        355: 250,
        359: 250,
      })
    ).toEqual([])
    expect(
      breaches({ 800: 1000, 804: 250, 806: 700, 338: 250, 355: 250, 359: 250 })
    ).toContain("form5.depreciationClosing")
    expect(
      breaches({ 800: 1000, 804: 300, 806: 700, 338: 300, 355: 300, 359: 300 })
    ).toContain("form5.depreciationMaximum")
  })

  it("does not flag a pool that a sale emptied (#1410)", () => {
    expect(breaches({ 800: 100, 802: 500, 804: 0, 806: 0 })).not.toContain(
      "form5.depreciationMaximum"
    )
  })

  it("asks for the driving details when 313 is booked (#1882)", () => {
    const base = { 316: 500, 358: 500 }
    expect(breaches({ ...base, 313: 500 })).toContain("form5.carDetail")
    expect(
      breaches({ ...base, 313: 500, 273: 10, 381: 900, 396: 2 })
    ).toContain("form5.carDetail")
    expect(
      breaches({ ...base, 313: 500, 382: 500, 273: 10, 381: 900, 396: 1 })
    ).toEqual([])
  })

  it("requires 313 to equal 382 when the private costs were deducted (#824)", () => {
    expect(
      breaches({
        313: 500,
        382: 400,
        273: 10,
        381: 900,
        396: 1,
        316: 500,
        358: 500,
      })
    ).toContain("form5.carPrivateShare")
    expect(breaches({ 396: 1 })).toContain("form5.carPrivateShare")
  })

  it("keeps the business kilometres within the total (#825)", () => {
    expect(breaches({ 389: 100, 390: 120 })).toContain("form5.carTotalDistance")
    expect(breaches({ 389: 120, 390: 120 })).not.toContain(
      "form5.carTotalDistance"
    )
  })

  it("wants the shares to make 100 % once given (#408, #409)", () => {
    expect(breaches({ 369: 6000, 370: 3000 })).toContain("form5.netWorthShares")
    expect(breaches({ 369: 6000, 370: 4000 })).not.toContain(
      "form5.netWorthShares"
    )
    expect(breaches({ 371: 10_000 })).not.toContain("form5.workShares")
    expect(breaches({ 371: 5000 })).toContain("form5.workShares")
  })

  it("takes no minus sign on an R or + field", () => {
    expect(breaches({ 364: -5 })).toContain("form5.unsigned")
    expect(breaches({ 344: -5, 355: -5, 358: 5 })).not.toContain(
      "form5.unsigned"
    )
  })

  it("remarks on listed co-operative surplus (#2048)", () => {
    expect(breaches({ 325: 100 })).toContain("form5.listedCooperative")
  })

  it("names the specification check each rule implements", () => {
    for (const rule of FORM5_RULES.rules) {
      expect(rule.source).toMatch(/^Form 5 spec 2026 (#\d+|section 7, format)$/)
    }
  })
})
