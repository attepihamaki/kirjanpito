import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { bankEstimate } from "@/lib/domain/bank-balance"
import { generalLedger, journal } from "@/lib/domain/books"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import { incomeStatement } from "@/lib/domain/income-statement"
import { summary } from "@/lib/domain/summary"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { ledgerTotals, vatReport } from "@/lib/domain/vat"

const cats = indexCategories(defaultCategories())

function transfer(date: string, amount: number, vatRate = 0): Entry {
  return {
    id: `${date}-${amount}`,
    date,
    description: amount > 0 ? "Oma raha yritykselle" : "Yksityisotto",
    type: amount > 0 ? "income" : "expense",
    catId: amount > 0 ? "owner-investment" : "owner-withdrawal",
    amount: Math.abs(amount),
    vatRate,
    amountMode: "gross",
  }
}

const entries = [
  transfer("2026-03-02", 500_000),
  transfer("2026-06-30", -120_000),
]

describe("the owner's transfers", () => {
  it("are neither on the VAT return nor in the totals, whatever the rate", () => {
    const withRate = [...entries, transfer("2026-07-01", 10_000, 25.5)]
    expect(vatReport(withRate, cats).due).toBe(0)
    expect(ledgerTotals(withRate, cats)).toEqual({
      incomeNet: 0,
      expenseNet: 0,
      due: 0,
    })
  })

  it("are not on the income statement or the summary", () => {
    expect(incomeStatement(entries, cats, 2026).result).toBe(0)
    const { totals } = summary(entries, cats, 2026)
    expect([totals.incomeNet, totals.expenseNet, totals.otherIncome]).toEqual([
      0, 0, 0,
    ])
  })

  it("are listed in the journal and the general ledger, outside the totals", () => {
    const j = journal(entries, cats, 2026)
    expect(j.months.flatMap((m) => m.rows)).toHaveLength(2)
    expect(j.income.net).toBe(0)
    expect(j.expense.net).toBe(0)
    const accounts = generalLedger(entries, cats, 2026)
    expect(accounts.map((a) => a.line.account)).toEqual([2000, 2000])
  })

  it("move the bank balance", () => {
    const r = bankEstimate(
      { amount: 0, date: "2026-01-01" },
      entries,
      cats,
      "2026-12-31"
    )
    expect(r.movement).toBe(380_000)
  })

  it("are not flagged as unusually large", () => {
    const small = Array.from({ length: 5 }, (_, i) => ({
      ...transfer(`2026-02-0${i + 1}`, 1_000),
      id: `s${i}`,
      catId: "300-domestic",
    }))
    const flagged = flaggedEntryIds(
      "largeAmount",
      [...small, ...entries],
      cats,
      "2026-12-31"
    )
    expect(flagged.size).toBe(0)
  })
})
