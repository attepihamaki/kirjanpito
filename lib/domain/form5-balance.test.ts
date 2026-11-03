import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
  inventoryChange,
  loanBalance,
  wagesPaid,
} from "@/lib/domain/form5-balance"
import { taxFormSteps } from "@/lib/domain/tax-form"
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
    amountMode: "gross",
    ...over,
  }
}

const drawdown = entry({ type: "income", catId: "loan-drawdown" })
const repayment = entry({ catId: "loan-repayment", amount: 30_000 })

describe("loanBalance", () => {
  it("adds drawdowns, takes off repayments and starts from the opening", () => {
    const opening = { year: 2026, amount: 50_000 }
    expect(loanBalance([drawdown, repayment], cats, opening, 2026)).toBe(
      120_000
    )
  })

  it("does not count what happens after the year", () => {
    expect(loanBalance([drawdown], cats, null, 2025)).toBe(0)
  })

  it("does not go below zero", () => {
    expect(loanBalance([repayment], cats, null, 2026)).toBe(0)
  })
})

describe("wagesPaid", () => {
  it("counts wages by the year they were paid", () => {
    const wage = entry({
      catId: "335",
      date: "2026-12-20",
      paidOn: "2027-01-05",
    })
    expect(wagesPaid([wage], cats, 2026)).toBe(0)
    expect(wagesPaid([wage], cats, 2027)).toBe(100_000)
  })

  it("does not count wages not yet paid", () => {
    expect(wagesPaid([entry({ catId: "335", paidOn: null })], cats, 2026)).toBe(
      0
    )
  })
})

describe("inventoryChange", () => {
  it("lowers the cost when stock grows", () => {
    const opening = { ...EMPTY_YEAR_END, goods: 100_000 }
    const closing = { ...EMPTY_YEAR_END, goods: 150_000 }
    expect(inventoryChange(opening, closing)).toBe(-50_000)
    expect(inventoryChange(closing, opening)).toBe(50_000)
  })
})

describe("form5Balance", () => {
  const input = {
    cats,
    year: 2026,
    assetOpening: { year: 2026, amount: 400_000 },
    loanOpening: null,
    yearEnd: {
      ...EMPTY_YEAR_END,
      goods: 20_000,
      cash: 5_000,
      loanCurrent: 10_000,
    },
    entries: [
      drawdown,
      entry({
        type: "income",
        catId: "300-domestic",
        amount: 60_000,
        paidOn: null,
      }),
      entry({ catId: "333", amount: 40_000, paidOn: "2027-01-02" }),
    ],
  }

  it("meets Verohallinto's rule for 718", () => {
    const b = form5Balance(input)
    expect(b.machinery).toBe(400_000)
    expect(b.receivables).toBe(60_000)
    expect(b.assets).toBe(400_000 + 20_000 + 5_000 + 60_000)
  })

  it("splits the loan and adds payables to 749", () => {
    const b = form5Balance(input)
    expect(b.current).toBe(40_000 + 10_000)
    expect(b.nonCurrent).toBe(90_000)
    expect(b.liabilities).toBe(b.current + b.nonCurrent)
    expect(b.netWorth).toBe(b.assets - b.liabilities)
  })

  it("uses only the net worth line that applies", () => {
    const sections = form5BalanceSections(form5Balance(input), input.yearEnd)
    const { totals } = taxFormSteps(sections)
    expect(totals.map((t) => t.code)).toEqual(["718", "725", "733"])
  })

  it("has no totals to check without assets or liabilities", () => {
    const sections = form5BalanceSections(
      form5Balance({
        entries: [],
        cats,
        year: 2026,
        yearEnd: EMPTY_YEAR_END,
        assetOpening: null,
        loanOpening: null,
      }),
      EMPTY_YEAR_END
    )
    expect(taxFormSteps(sections).totals).toEqual([])
  })

  it("never moves more of a loan to 749 than there is", () => {
    const b = form5Balance({
      ...input,
      entries: [drawdown],
      yearEnd: { ...EMPTY_YEAR_END, loanCurrent: 500_000 },
    })
    expect(b.current).toBe(100_000)
    expect(b.nonCurrent).toBe(0)
  })
})
