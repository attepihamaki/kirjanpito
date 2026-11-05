import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  archiveBlockers,
  archiveContents,
  movableEntries,
  rolledOpenings,
} from "@/lib/domain/year-archive"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry> & Pick<Entry, "date">): Entry {
  return {
    id: over.id ?? `${over.date}-${over.description ?? "x"}`,
    description: "x",
    type: "expense",
    catId: "333",
    amount: 10000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const base = {
  year: 2025,
  cats,
  today: "2026-11-05",
  vatPeriod: "year" as const,
  vatFiled: { "2025": "2026-02-10" },
  form5Filed: { "2025": "2026-03-20" },
  assetOpening: null,
}

describe("movableEntries and archiveContents", () => {
  const settled = entry({ id: "a", date: "2025-03-01" })
  const paidLater = entry({ id: "b", date: "2025-12-20", paidOn: "2026-01-10" })
  const open = entry({ id: "c", date: "2025-12-21", paidOn: null })
  const prepaid = entry({ id: "d", date: "2026-01-05", paidOn: "2025-12-30" })
  const all = [settled, paidLater, open, prepaid]

  it("moves only what was dated and paid in the year", () => {
    expect(movableEntries(all, 2025).map((e) => e.id)).toEqual(["a"])
  })

  it("puts everything dated or paid in the year into the archive", () => {
    expect(archiveContents(all, 2025).map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })
})

describe("archiveBlockers", () => {
  const settled = entry({ date: "2025-03-01" })

  it("accepts a filed, settled, oldest year", () => {
    expect(archiveBlockers({ ...base, entries: [settled] })).toEqual([])
  })

  it("blocks a running year", () => {
    const kinds = archiveBlockers({
      ...base,
      today: "2025-11-05",
      entries: [settled],
    }).map((b) => b.kind)
    expect(kinds).toContain("running")
  })

  it("asks for Form 5 and the VAT periods", () => {
    const blockers = archiveBlockers({
      ...base,
      form5Filed: {},
      vatFiled: {},
      entries: [settled],
    })
    expect(blockers.map((b) => b.kind)).toEqual(["form5", "vat"])
  })

  it("goes oldest year first", () => {
    const older = entry({ date: "2024-06-01" })
    expect(archiveBlockers({ ...base, entries: [older, settled] })).toEqual([
      { kind: "older", year: 2024 },
    ])
  })

  it("blocks while an invoice of the year is open or paid later", () => {
    const open = entry({ date: "2025-12-21", paidOn: null })
    expect(archiveBlockers({ ...base, entries: [settled, open] })).toEqual([
      { kind: "unsettled", count: 1 },
    ])
  })

  it("blocks an asset opening dated beyond the next year", () => {
    const blockers = archiveBlockers({
      ...base,
      entries: [settled],
      assetOpening: { year: 2028, amount: 1000 },
    })
    expect(blockers).toEqual([{ kind: "assetOpening" }])
  })

  it("reports a year with no entries", () => {
    expect(archiveBlockers({ ...base, entries: [] })).toEqual([
      { kind: "empty" },
    ])
  })
})

describe("rolledOpenings", () => {
  it("writes the pool's closing balance as the next year's opening", () => {
    const purchase = entry({
      date: "2025-02-01",
      catId: "asset-purchase",
      amount: 125500,
      vatRate: 25.5,
    })
    const out = rolledOpenings({
      year: 2025,
      entries: [purchase],
      cats,
      assetOpening: null,
      loanOpening: null,
    })
    /* 1 000 € net, under the 1 200 € limit, so all of it may go; none taken. */
    expect(out.assetOpening).toEqual({ year: 2026, amount: 100000 })
    expect(out.loanOpening).toBeNull()
  })

  it("rolls a loan's balance", () => {
    const draw = entry({
      date: "2025-02-01",
      type: "income",
      catId: "loan-drawdown",
      amount: 500000,
      vatRate: 0,
    })
    const out = rolledOpenings({
      year: 2025,
      entries: [draw],
      cats,
      assetOpening: null,
      loanOpening: null,
    })
    expect(out.loanOpening).toEqual({ year: 2026, amount: 500000 })
  })

  it("leaves both alone when the year has neither", () => {
    const out = rolledOpenings({
      year: 2025,
      entries: [entry({ date: "2025-02-01" })],
      cats,
      assetOpening: null,
      loanOpening: null,
    })
    expect(out).toEqual({ assetOpening: null, loanOpening: null })
  })
})
