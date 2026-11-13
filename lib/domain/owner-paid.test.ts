import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { bankEstimate } from "@/lib/domain/bank-balance"
import { calcEntry } from "@/lib/domain/calc"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import { carveSplit } from "@/lib/domain/split"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* A cost paid with the owner's own money (§6.7). */

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

const lunch = (over: Partial<Entry> = {}): Entry => ({
  id: "l",
  voucher: 1,
  date: "2026-03-10",
  description: "Työkalut, oma kortti",
  type: "expense",
  catId: "333",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  ownerPaid: true,
  ...over,
})

function readBack(entries: Entry[], lang: "fi" | "en") {
  const result = parseCsv(serializeCsv(entries, cats, { lang }), baseCats)
  if (!result.ok) throw new Error("did not parse")
  return result.entries
}

describe("a cost paid with the owner's own money", () => {
  it("round-trips in both languages", () => {
    for (const lang of ["fi", "en"] as const) {
      expect(readBack([lunch()], lang)[0].ownerPaid).toBe(true)
    }
  })

  it("is dropped on income, on an open cost and beside cash", () => {
    const [income, open, cash] = readBack(
      [
        lunch({ type: "income", catId: "300-domestic" }),
        lunch({ id: "o", voucher: 2, paidOn: null }),
        lunch({ id: "c", voucher: 3, cash: true }),
      ],
      "fi"
    )
    expect(income.ownerPaid).toBeUndefined()
    expect(open.ownerPaid).toBeUndefined()
    expect(cash.ownerPaid).toBeUndefined()
    expect(cash.cash).toBe(true)
  })

  it("counts as a cost but leaves the bank estimate alone", () => {
    expect(calcEntry(lunch()).net).toBe(10_000)
    const balance = { amount: 100_000, date: "2026-03-01" }
    const estimate = bankEstimate(
      balance,
      [lunch(), lunch({ id: "b", voucher: 2, ownerPaid: undefined })],
      cats,
      "2026-03-31"
    )
    expect(estimate.count).toBe(1)
    expect(estimate.estimate).toBe(100_000 - 12_550)
  })

  it("carries over to a part split off the receipt", () => {
    const result = carveSplit(
      lunch(),
      { amount: 2_000, catId: "344-meeting", vatRate: 13.5 },
      cats,
      { part: "p", split: "s" }
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.part.ownerPaid).toBe(true)
  })
})
