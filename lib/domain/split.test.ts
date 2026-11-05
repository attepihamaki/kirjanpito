import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  canSplitLine,
  carveSplit,
  sharePayment,
  shareReceipts,
  splitSiblings,
} from "@/lib/domain/split"
import {
  indexCategories,
  type Attachment,
  type Entry,
} from "@/lib/domain/types"

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

describe("shareReceipts", () => {
  const file = (id: string): Attachment => ({
    id,
    name: `${id}.pdf`,
    type: "application/pdf",
    size: 10,
  })

  it("adds a file attached to one part to the others, with the same id", () => {
    const before = [part("a"), part("b")]
    const after = [{ ...before[0], atts: [file("f1")] }, before[1]]
    const [, b] = shareReceipts(before, after)
    expect(b.atts?.map((x) => x.id)).toEqual(["f1"])
  })

  it("removes a file taken off one part from the others", () => {
    const before = [
      part("a", { atts: [file("f1"), file("f2")] }),
      part("b", { atts: [file("f1"), file("f2")] }),
    ]
    const after = [{ ...before[0], atts: [file("f2")] }, before[1]]
    const [, b] = shareReceipts(before, after)
    expect(b.atts?.map((x) => x.id)).toEqual(["f2"])
  })

  it("drops the list when the last file goes", () => {
    const before = [
      part("a", { atts: [file("f1")] }),
      part("b", { atts: [file("f1")] }),
    ]
    const after = [{ ...before[0], atts: undefined }, before[1]]
    expect(shareReceipts(before, after)[1].atts).toBeUndefined()
  })

  it("keeps a file a sibling holds on its own", () => {
    const before = [part("a"), part("b", { atts: [file("own")] })]
    const after = [{ ...before[0], atts: [file("f1")] }, before[1]]
    const [, b] = shareReceipts(before, after)
    expect(b.atts?.map((x) => x.id)).toEqual(["own", "f1"])
  })

  it("leaves everything alone when no receipt changed", () => {
    const before = [part("a", { atts: [file("f1")] }), part("b")]
    const after = [{ ...before[0], amount: 1 }, before[1]]
    expect(shareReceipts(before, after)[1]).toBe(before[1])
  })

  it("does not touch an ordinary entry", () => {
    const outsider = part("c", { split: undefined })
    const before = [part("a"), outsider]
    const after = [{ ...before[0], atts: [file("f1")] }, outsider]
    expect(shareReceipts(before, after)[1]).toBe(outsider)
  })
})

describe("carveSplit", () => {
  const ids = { part: "new", split: "g9" }
  const base = () =>
    part("a", {
      split: undefined,
      amount: 10_000,
      paidOn: "2026-11-02",
      cash: true,
      atts: [{ id: "f1", name: "f1.pdf", type: "application/pdf", size: 10 }],
    })

  it("leaves the rest on the original and links both", () => {
    const result = carveSplit(
      base(),
      { amount: 2_500, catId: "344-meeting", vatRate: 13.5 },
      cats,
      ids
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.original.amount).toBe(7_500)
    expect(result.original.split).toBe("g9")
    expect(result.part).toMatchObject({
      id: "new",
      amount: 2_500,
      catId: "344-meeting",
      vatRate: 13.5,
      date: "2026-10-10",
      description: "Kuitti",
      type: "expense",
      amountMode: "gross",
      split: "g9",
      paidOn: "2026-11-02",
      cash: true,
    })
  })

  it("gives the part the same files, with the same ids", () => {
    const result = carveSplit(
      base(),
      { amount: 1, catId: "333", vatRate: 0 },
      cats,
      ids
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.part.atts?.map((a) => a.id)).toEqual(["f1"])
    expect(result.part.atts?.[0]).not.toBe(result.original.atts?.[0])
  })

  it("keeps an existing split id", () => {
    const result = carveSplit(
      { ...base(), split: "old" },
      { amount: 1, catId: "333", vatRate: 0 },
      cats,
      ids
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.original.split).toBe("old")
    expect(result.part.split).toBe("old")
  })

  it("takes the sign of a credit note", () => {
    const result = carveSplit(
      { ...base(), amount: -10_000 },
      { amount: -4_000, catId: "333", vatRate: 25.5 },
      cats,
      ids
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.original.amount).toBe(-6_000)
  })

  it.each([
    ["zero", 0],
    ["the whole amount", 10_000],
    ["more than the amount", 20_000],
    ["the wrong sign", -1_000],
    ["a fraction of a cent", 12.5],
  ])("refuses %s", (_name, amount) => {
    expect(
      carveSplit(base(), { amount, catId: "333", vatRate: 0 }, cats, ids)
    ).toEqual({ ok: false, error: "amount" })
  })

  it.each([
    ["an unknown category", "nope"],
    ["the other side", "300-domestic"],
    ["a settlement", "vat-payment"],
    ["an EU purchase category", "333-eu-goods"],
  ])("refuses %s", (_name, catId) => {
    const result = carveSplit(
      base(),
      { amount: 1, catId, vatRate: 0 },
      cats,
      ids
    )
    expect(result).toMatchObject({ ok: false })
  })

  it("refuses to split an EU purchase", () => {
    const eu = { ...base(), euPurchase: "goods" as const }
    expect(
      carveSplit(eu, { amount: 1, catId: "333", vatRate: 0 }, cats, ids)
    ).toEqual({ ok: false, error: "category" })
  })

  it("drops the payment on a line that cannot be unpaid", () => {
    const result = carveSplit(
      base(),
      { amount: 1, catId: "337", vatRate: 0 },
      cats,
      ids
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.part.paidOn).toBeUndefined()
    expect(result.part.cash).toBeUndefined()
  })
})

describe("canSplitLine", () => {
  it("allows ordinary lines and refuses money-only ones", () => {
    expect(canSplitLine("333", cats)).toBe(true)
    expect(canSplitLine("300-domestic", cats)).toBe(true)
    expect(canSplitLine("vat-payment", cats)).toBe(false)
    expect(canSplitLine("owner-withdrawal", cats)).toBe(false)
    expect(canSplitLine("loan-repayment", cats)).toBe(false)
    expect(canSplitLine("333", cats, "goods")).toBe(false)
  })
})
