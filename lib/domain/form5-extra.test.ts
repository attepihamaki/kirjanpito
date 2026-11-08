import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END, type YearEnd } from "@/lib/domain/form5-balance"
import { carUse, interestCalc, ownerTransfers } from "@/lib/domain/form5-extra"
import { form5Report } from "@/lib/domain/form5-report"
import { form5Values } from "@/lib/domain/form5"
import { incomeStatement } from "@/lib/domain/income-statement"
import { evaluate } from "@/lib/domain/rules/engine"
import { FORM5_RULES } from "@/lib/domain/rules/form5-rules"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 10000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

function report(entries: Entry[], yearEnd: Partial<YearEnd> = {}) {
  const { sections, balance } = form5Report({
    statement: incomeStatement(entries, cats, 2026),
    entries,
    cats,
    year: 2026,
    yearEnd: { ...EMPTY_YEAR_END, ...yearEnd },
    assetOpening: null,
    loanOpening: null,
  })
  const values = form5Values(sections)
  const v = (code: number) => values.get(code) ?? 0
  return { v, balance, findings: evaluate(FORM5_RULES, v) }
}

describe("carUse", () => {
  it("has no figures until the private kilometres and the costs are given", () => {
    expect(carUse(EMPTY_YEAR_END)).toBeNull()
    expect(carUse({ ...EMPTY_YEAR_END, carKmPrivate: 100 })).toBeNull()
  })

  it("shares the costs by the kilometres", () => {
    expect(
      carUse({
        ...EMPTY_YEAR_END,
        carKmBusiness: 7500,
        carKmPrivate: 2500,
        carCosts: 400000,
      })
    ).toEqual({
      business: 7500,
      private: 2500,
      total: 10000,
      costs: 400000,
      perKm: 40,
      privateShare: 100000,
    })
  })
})

describe("interestCalc", () => {
  const y = { ...EMPTY_YEAR_END, interestRate: 315 }

  it("is inactive while the net worth is not negative", () => {
    const calc = interestCalc(5000, 100000, y)
    expect(calc.active).toBe(false)
    expect(calc.disallowed).toBe(0)
    expect(calc.deductible).toBe(5000)
  })

  it("takes the rate of the adjusted deficit, at most the interest paid", () => {
    expect(interestCalc(100000, -1000000, y)).toMatchObject({
      active: true,
      adjusted: 1000000,
      disallowed: 31500,
      deductible: 68500,
    })
    expect(interestCalc(10000, -1000000, y).disallowed).toBe(10000)
  })

  it("lowers the deficit by revaluations and losses", () => {
    const calc = interestCalc(100000, -1000000, {
      ...y,
      revaluations: 200000,
      yearLoss: 300000,
      priorLosses: 100000,
    })
    expect(calc.adjusted).toBe(400000)
    expect(calc.disallowed).toBe(12600)
  })

  it("asks for the rate when interest was paid on an adjusted deficit", () => {
    expect(interestCalc(5000, -100000, EMPTY_YEAR_END).rateMissing).toBe(true)
    expect(interestCalc(0, -100000, EMPTY_YEAR_END).rateMissing).toBe(false)
  })
})

describe("ownerTransfers", () => {
  it("sums the year's withdrawals and investments", () => {
    const out = ownerTransfers(
      [
        entry({ id: "a", catId: "owner-withdrawal", amount: 50000 }),
        entry({ id: "b", catId: "owner-withdrawal", amount: 20000 }),
        entry({
          id: "c",
          type: "income",
          catId: "owner-investment",
          amount: 90000,
        }),
        entry({
          id: "d",
          date: "2025-12-31",
          catId: "owner-withdrawal",
          amount: 1,
        }),
      ],
      cats,
      2026
    )
    expect(out).toEqual({ withdrawals: 70000, investments: 90000 })
  })
})

describe("form5Report", () => {
  it("passes the form's checks with the driving details booked on 313", () => {
    const car = {
      carKmBusiness: 7500,
      carKmPrivate: 2500,
      carCosts: 400000,
    }
    const { v, findings } = report(
      [
        entry({ id: "a", type: "income", catId: "300", amount: 1000000 }),
        entry({ id: "b", type: "income", catId: "313", amount: 100000 }),
      ],
      car
    )
    expect(v(313)).toBe(100000)
    expect(v(382)).toBe(100000)
    expect(v(396)).toBe(1)
    expect(v(274)).toBe(10000)
    expect(findings).toEqual([])
  })

  it("blocks a 313 that differs from the driving details", () => {
    const { findings } = report(
      [entry({ id: "b", type: "income", catId: "313", amount: 90000 })],
      { carKmBusiness: 7500, carKmPrivate: 2500, carCosts: 400000 }
    )
    expect(findings.map((f) => f.ruleId)).toContain("form5.carPrivateShare")
  })

  it("lowers 347 and 355 and raises the result by the non-deductible interest", () => {
    const entries = [
      entry({ id: "a", type: "income", catId: "300", amount: 1000000 }),
      entry({ id: "b", catId: "346", amount: 100000 }),
    ]
    const before = report(entries, { interestRate: 315 })
    expect(before.v(347)).toBe(100000)
    expect(before.v(358)).toBe(900000)

    // A loan of 5 000 € against nothing else makes the net worth negative.
    const loan = entry({
      id: "l",
      type: "income",
      catId: "loan-drawdown",
      amount: 500000,
    })
    const after = report([...entries, loan], { interestRate: 315 })
    expect(after.balance.interest.active).toBe(true)
    const disallowed = after.balance.interest.disallowed
    expect(disallowed).toBeGreaterThan(0)
    expect(after.v(347)).toBe(100000 - disallowed)
    expect(after.v(383)).toBe(disallowed)
    expect(after.v(355)).toBe(before.v(355) - disallowed)
    expect(after.v(358)).toBe(before.v(358) + disallowed)
    expect(after.findings).toEqual([])
  })
})
