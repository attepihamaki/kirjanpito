import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  safeToWithdraw,
  vatOwed,
  type SafeToWithdrawInput,
} from "@/lib/domain/safe-to-withdraw"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatTimeline } from "@/lib/domain/vat-deadline"

const cats = indexCategories(defaultCategories())

let n = 0
function entry(
  date: string,
  type: Entry["type"],
  catId: string,
  amount: number,
  extra: Partial<Entry> = {}
): Entry {
  n += 1
  return {
    id: `e${n}`,
    date,
    description: "x",
    type,
    catId,
    amount,
    vatRate: catId.startsWith("vat-") ? 0 : 25.5,
    amountMode: "gross",
    ...extra,
  }
}

/* A 1 255 € sale carries 255 € of VAT at 25.5 %. */
const sale = (date: string) => entry(date, "income", "300-domestic", 125_500)

describe("vatOwed", () => {
  const today = "2026-11-14"

  it("holds back every unfiled period with tax to pay", () => {
    const entries = [sale("2026-09-10"), sale("2026-10-10"), sale("2026-11-05")]
    const timeline = vatTimeline("month", "2026-09-01", today, {})
    const owed = vatOwed(timeline, entries, entries, cats, "month", today)
    expect(owed.map((o) => [o.key, o.status, o.amount])).toEqual([
      ["2026-09", "overdue", 25_500],
      ["2026-10", "due", 25_500],
      ["2026-11", "open", 25_500],
    ])
  })

  it("leaves out a period whose payment is booked", () => {
    const entries = [
      sale("2026-10-10"),
      entry("2026-11-12", "expense", "vat-payment", 25_500, {
        settles: "2026-10",
      }),
    ]
    const timeline = vatTimeline("month", "2026-10-01", today, {})
    const owed = vatOwed(timeline, entries, entries, cats, "month", today)
    expect(owed.map((o) => o.key)).toEqual([])
  })

  /* A monthly return is due on the 12th of the second month after it. */
  it("keeps a filed period due after the balance was read, and drops one due before", () => {
    const entries = [sale("2026-08-10"), sale("2026-09-10")]
    const timeline = vatTimeline("month", "2026-08-01", "2026-10-20", {
      "2026-08": "2026-10-01",
      "2026-09": "2026-10-15",
    })
    const owed = vatOwed(
      timeline,
      entries,
      entries,
      cats,
      "month",
      "2026-10-13"
    )
    expect(owed.map((o) => o.key)).toEqual(["2026-09"])
  })

  it("never counts a refund", () => {
    const entries = [entry("2026-10-10", "expense", "333", 125_500)]
    const timeline = vatTimeline("month", "2026-10-01", today, {})
    expect(vatOwed(timeline, entries, entries, cats, "month", today)).toEqual(
      []
    )
  })
})

describe("safeToWithdraw", () => {
  const input: SafeToWithdrawInput = {
    balance: 1_000_000,
    vat: 120_000,
    tax: 200_000,
    yel: 50_000,
    bills: 30_000,
    buffer: 100_000,
  }

  it("takes every line off the balance", () => {
    const result = safeToWithdraw(input)
    expect(result.reserved).toBe(500_000)
    expect(result.amount).toBe(500_000)
    expect(result.short).toBe(0)
    expect(result.lines.map((l) => l.kind)).toEqual([
      "vat",
      "tax",
      "yel",
      "bills",
      "buffer",
    ])
  })

  it("counts a missing estimate as 0 and marks it", () => {
    const result = safeToWithdraw({ ...input, tax: null, yel: null })
    expect(result.amount).toBe(750_000)
    expect(result.lines.filter((l) => l.missing).map((l) => l.kind)).toEqual([
      "tax",
      "yel",
    ])
  })

  it("counts advance tax paid ahead as 0, not as money free to take", () => {
    const result = safeToWithdraw({ ...input, tax: -80_000 })
    expect(result.lines.find((l) => l.kind === "tax")?.cents).toBe(0)
    expect(result.amount).toBe(700_000)
  })

  it("shows 0 and the shortfall when the reserves pass the balance", () => {
    const result = safeToWithdraw({ ...input, balance: 300_000 })
    expect(result.amount).toBe(0)
    expect(result.short).toBe(200_000)
  })
})
