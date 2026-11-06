import { describe, expect, it } from "vitest"

import {
  advanceTaxPaid,
  estimateTax,
  instalmentAmounts,
  paidMonths,
} from "@/lib/domain/advance-tax"
import { defaultCategories } from "@/lib/domain/accounts"
import { taxCalendar, NO_PAY_MONTHS } from "@/lib/domain/tax-calendar"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry>): Entry {
  return {
    id: over.id ?? "e",
    date: "2026-03-10",
    description: "",
    type: "expense",
    catId: "365",
    amount: 50_000,
    vatRate: 0,
    amountMode: "gross",
    ...over,
  }
}

describe("instalmentAmounts", () => {
  it("splits evenly and puts the odd cents on the last instalment", () => {
    const parts = instalmentAmounts(100_000, [2, 7, 11])
    expect([...parts.values()]).toEqual([33_333, 33_333, 33_334])
    expect([...parts.values()].reduce((a, b) => a + b, 0)).toBe(100_000)
  })

  it("gives nothing without an amount or without months", () => {
    expect(instalmentAmounts(0, [3]).size).toBe(0)
    expect(instalmentAmounts(50_000, []).size).toBe(0)
  })
})

describe("paid instalments", () => {
  const entries = [
    entry({ id: "a", date: "2026-03-20" }),
    entry({ id: "b", date: "2025-03-20" }),
    entry({ id: "c", date: "2026-05-02", catId: "344-other" }),
    entry({
      id: "d",
      date: "2026-06-01",
      type: "income",
      catId: "300-domestic",
    }),
  ]

  it("counts only line 365 expenses of the year", () => {
    expect([...paidMonths(entries, 2026)]).toEqual([3])
    expect(advanceTaxPaid(entries, 2026)).toBe(50_000)
  })
})

describe("estimateTax", () => {
  const sale = entry({
    id: "s",
    type: "income",
    catId: "300-domestic",
    amount: 1_000_000,
    amountMode: "net",
  })

  it("is null without a rate", () => {
    expect(estimateTax([sale], cats, 2026, null, 0)).toBeNull()
  })

  it("applies the flat rate to the profit and compares with the decision", () => {
    const est = estimateTax([sale], cats, 2026, 20, 150_000)
    expect(est).toEqual({ profit: 1_000_000, tax: 200_000, gap: 50_000 })
  })

  it("taxes a loss at nothing", () => {
    const cost = entry({ id: "c", catId: "344-other", amount: 100_000 })
    expect(estimateTax([cost], cats, 2026, 30, 0)?.tax).toBe(0)
  })
})

describe("advance tax in the calendar", () => {
  const base = {
    year: 2026,
    today: "2026-11-06",
    vatPeriod: "month" as const,
    startDate: null,
    vatFiled: {},
    form5Filed: {},
    cats,
  }

  it("carries each instalment's amount and marks a booked month paid", () => {
    const events = taxCalendar({
      ...base,
      payMonths: {
        ...NO_PAY_MONTHS,
        advanceTax: [3, 9],
        advanceTaxYearly: { "2026": 100_001 },
      },
      entries: [entry({ date: "2026-03-23" })],
    }).filter((e) => e.kind === "advanceTax")
    expect(events.map((e) => [e.ref, e.amount, e.done])).toEqual([
      ["2026-03", 50_000, true],
      ["2026-09", 50_001, false],
    ])
  })

  it("has no amount without a decision for the year", () => {
    const [event] = taxCalendar({
      ...base,
      payMonths: { ...NO_PAY_MONTHS, advanceTax: [3] },
      entries: [],
    }).filter((e) => e.kind === "advanceTax")
    expect(event.amount).toBeUndefined()
  })
})
