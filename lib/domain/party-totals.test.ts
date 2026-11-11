import { describe, expect, it } from "vitest"

import {
  defaultCategories,
  LINE_BY_KEY,
  offStatement,
} from "@/lib/domain/accounts"
import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
} from "@/lib/domain/invoice"
import { partyTotals, sharePercent } from "@/lib/domain/party-totals"
import { indexCategories, type Entry } from "@/lib/domain/types"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

/** An expense category that is neither income nor an expense, such as an owner's withdrawal. */
const OFF = baseCats.find(
  (c) =>
    LINE_BY_KEY.get(c.line)?.side === "expense" &&
    offStatement(LINE_BY_KEY.get(c.line))
)!.id

function party(id: string, name: string): Customer {
  return {
    ...CUSTOMER_DEFAULTS,
    ...emptyParty(),
    id,
    name,
    role: "both",
    language: "fi",
  }
}

let n = 0
function entry(over: Partial<Entry>): Entry {
  return {
    id: `e${++n}`,
    date: "2026-05-10",
    description: "x",
    type: "income",
    catId: "300-domestic",
    amount: 12_550,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const parties = [
  party("a", "Alfa Oy"),
  party("b", "Beta Oy"),
  party("c", "Cee Oy"),
]

describe("partyTotals", () => {
  it("sums net sales per customer, largest first, with what names no party", () => {
    const entries = [
      entry({ party: "a" }),
      entry({ party: "b", amount: 25_100 }),
      entry({ party: "a" }),
      entry({}),
      entry({ party: "gone" }),
      entry({ party: "a", date: "2025-12-31" }),
    ]
    const t = partyTotals(entries, parties, cats, 2026, "income")
    expect(t.top.map((r) => [r.party.id, r.net, r.count])).toEqual([
      ["a", 20_000, 2],
      ["b", 20_000, 1],
    ])
    expect(t.unlinked).toEqual({ net: 20_000, count: 2 })
    expect(t.total).toBe(60_000)
  })

  it("keeps the two sides apart and leaves money that is not a cost out", () => {
    const entries = [
      entry({ party: "a" }),
      entry({ party: "c", type: "expense", catId: "343" }),
      entry({ party: "c", type: "expense", catId: OFF, vatRate: 0 }),
    ]
    const costs = partyTotals(entries, parties, cats, 2026, "expense")
    expect(costs.top.map((r) => r.party.id)).toEqual(["c"])
    expect(costs.top[0].count).toBe(1)
    expect(costs.total).toBe(10_000)
  })

  it("sums the parties after the top ones", () => {
    const entries = [
      entry({ party: "a", amount: 30_000, vatRate: 0 }),
      entry({ party: "b", amount: 20_000, vatRate: 0 }),
      entry({ party: "c", amount: 10_000, vatRate: 0 }),
    ]
    const t = partyTotals(entries, parties, cats, 2026, "income", 1)
    expect(t.top.map((r) => r.party.id)).toEqual(["a"])
    expect(t.rest).toEqual({ net: 30_000, count: 2, parties: 2 })
    expect(t.total).toBe(60_000)
  })
})

describe("sharePercent", () => {
  it("rounds to one decimal and has no share of nothing", () => {
    expect(sharePercent(1, 3)).toBe(33.3)
    expect(sharePercent(5, 0)).toBeNull()
  })
})
