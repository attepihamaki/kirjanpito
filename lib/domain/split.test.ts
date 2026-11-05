import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { sharePayment, splitSiblings } from "@/lib/domain/split"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())
const open = { form5Filed: {} }

function part(id: string, over: Partial<Entry> = {}): Entry {
  return {
    id,
    voucher: 1,
    date: "2026-10-10",
    description: "Kuitti",
    type: "expense",
    catId: "333",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    split: "g1",
    ...over,
  }
}

describe("splitSiblings", () => {
  it("lists the other parts, and nothing for an ordinary entry", () => {
    const a = part("a")
    const b = part("b")
    const c = part("c", { split: "g2" })
    const d = part("d", { split: undefined })
    expect(splitSiblings(a, [a, b, c, d]).map((e) => e.id)).toEqual(["b"])
    expect(splitSiblings(d, [a, b, c, d])).toEqual([])
  })
})

describe("sharePayment", () => {
  const share = (before: Entry[], after: Entry[], marks = open) =>
    sharePayment(before, after, cats, marks)

  it("carries a later payment date to the other parts", () => {
    const before = [part("a"), part("b", { catId: "344-meeting" })]
    const after = [{ ...before[0], paidOn: "2026-11-02" }, before[1]]
    expect(share(before, after).map((e) => e.paidOn)).toEqual([
      "2026-11-02",
      "2026-11-02",
    ])
  })

  it("carries open, and then paid on the date again", () => {
    const base = [part("a"), part("b")]
    const opened = share(base, [{ ...base[0], paidOn: null }, base[1]])
    expect(opened.map((e) => e.paidOn)).toEqual([null, null])

    const paid = share(opened, [{ ...opened[0], paidOn: undefined }, opened[1]])
    expect(paid.map((e) => e.paidOn)).toEqual([undefined, undefined])
  })

  it("keeps a sibling on its own date when it was paid the same day", () => {
    const before = [part("a"), part("b", { date: "2026-10-12" })]
    const after = [{ ...before[0], paidOn: "2026-10-12" }, before[1]]
    const [, b] = share(before, after)
    expect(b.paidOn).toBeUndefined()
  })

  it("carries the cash flag, and drops it when the part goes open", () => {
    const base = [part("a"), part("b")]
    const cash = share(base, [{ ...base[0], cash: true }, base[1]])
    expect(cash.map((e) => e.cash)).toEqual([true, true])

    const opened = share(cash, [
      { ...cash[0], paidOn: null, cash: undefined },
      cash[1],
    ])
    expect(opened.map((e) => e.cash)).toEqual([undefined, undefined])
  })

  it("leaves the siblings alone when only another field changed", () => {
    const before = [part("a"), part("b", { paidOn: "2026-11-02" })]
    const after = [{ ...before[0], amount: 5_000 }, before[1]]
    const result = share(before, after)
    expect(result[1]).toBe(before[1])
  })

  it("does not touch an entry outside the split or a new entry", () => {
    const outsider = part("c", { split: undefined })
    const before = [part("a"), outsider]
    const after = [{ ...before[0], paidOn: null }, outsider]
    expect(share(before, after)[1]).toBe(outsider)
    expect(share(before, [...after, part("n", { paidOn: null })])[1]).toBe(
      outsider
    )
  })

  it("skips a sibling the move would take into a filed Form 5 year", () => {
    const before = [part("a"), part("b")]
    const after = [{ ...before[0], paidOn: "2027-01-05" }, before[1]]
    const marks = { form5Filed: { "2026": "2027-03-01" } }
    expect(share(before, after, marks)[1]).toBe(before[1])
  })

  it("skips a sibling on a line that cannot be unpaid", () => {
    const before = [
      part("a"),
      part("b", { catId: "owner-withdrawal", vatRate: 0 }),
    ]
    const after = [{ ...before[0], paidOn: null }, before[1]]
    expect(share(before, after)[1]).toBe(before[1])
  })
})
