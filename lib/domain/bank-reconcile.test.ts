import { describe, expect, it } from "vitest"

import type { BankRow } from "@/lib/domain/bank-csv"
import { reconcile } from "@/lib/domain/bank-reconcile"
import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

const row = (date: string, amount: number, over: Partial<BankRow> = {}) => ({
  date,
  amount,
  counterparty: "",
  message: "",
  reference: "",
  kind: "",
  ...over,
})

const entry = (id: string, over: Partial<Entry>): Entry => ({
  id,
  date: "2026-10-01",
  description: id,
  type: "expense",
  catId: "333",
  amount: 1_000,
  vatRate: 0,
  amountMode: "gross",
  ...over,
})

describe("reconcile", () => {
  const statement = {
    opening: { amount: 10_000, date: "2026-10-01" },
    closing: { amount: 13_000, date: "2026-10-31" },
  }

  it("pairs rows with payments and finds what each side lacks", () => {
    const rows = [
      row("2026-10-05", 5_000),
      row("2026-10-07", -1_000),
      row("2026-10-09", -1_000),
    ]
    const entries = [
      entry("sale", {
        type: "income",
        catId: "300-domestic",
        amount: 5_000,
        date: "2026-10-05",
      }),
      entry("cost", { date: "2026-10-07" }),
      entry("cash", { date: "2026-10-08", cash: true }),
      entry("elsewhere", { date: "2026-10-20", amount: 700 }),
      entry("open", { date: "2026-10-09", paidOn: null }),
      entry("outside", { date: "2026-11-02" }),
    ]
    const r = reconcile(rows, statement, entries, cats, new Set())!
    expect(r.from).toBe("2026-10-01")
    expect(r.to).toBe("2026-10-31")
    expect(r.statementMovement).toBe(3_000)
    expect(r.statementGap).toBe(0)
    expect(r.rowsNotInBook).toEqual([2])
    expect(r.paymentsNotOnStatement.map((p) => p.entries[0].id)).toEqual([
      "elsewhere",
    ])
    expect(r.bookMovement).toBe(5_000 - 1_000 - 700)
    expect(r.difference).toBe(3_000 - 3_300)
  })

  it("counts a planned row as booked", () => {
    const rows = [row("2026-10-09", -1_000)]
    const r = reconcile(rows, undefined, [], cats, new Set([0]))!
    expect(r.rowsNotInBook).toEqual([])
    expect(r.bookMovement).toBe(-1_000)
    expect(r.difference).toBe(0)
    expect(r.statementGap).toBeNull()
    expect([r.from, r.to]).toEqual(["2026-10-09", "2026-10-09"])
  })

  it("takes a split receipt paid at once as one payment, also on the value date", () => {
    const rows = [row("2026-10-12", -3_000, { valueDate: "2026-10-11" })]
    const entries = [
      entry("a", { date: "2026-10-11", split: "s", amount: 2_000 }),
      entry("b", { date: "2026-10-11", split: "s", amount: 1_000 }),
    ]
    const r = reconcile(rows, undefined, entries, cats, new Set())!
    expect(r.rowsNotInBook).toEqual([])
    expect(r.paymentsNotOnStatement).toEqual([])
  })

  it("reports a statement whose rows do not reach its closing balance", () => {
    const r = reconcile(
      [row("2026-10-05", 1_000)],
      statement,
      [],
      cats,
      new Set()
    )!
    expect(r.statementGap).toBe(-2_000)
  })
})
