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

  it("names the specification check each rule implements", () => {
    for (const rule of FORM5_RULES.rules) {
      expect(rule.source).toMatch(/^Form 5 spec 2026 #\d+$/)
    }
  })
})
