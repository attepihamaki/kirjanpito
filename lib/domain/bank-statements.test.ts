import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  checkStatements,
  monthCovers,
  needsLook,
  parseStatementRecords,
  statementDraft,
  statementsInYear,
  withStatement,
  type StatementRecord,
} from "@/lib/domain/bank-statements"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

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

const record = (over: Partial<StatementRecord>): StatementRecord => ({
  id: "s",
  from: "2026-10-01",
  to: "2026-10-31",
  rows: 2,
  movement: 4_000,
  bookMovement: 4_000,
  importedAt: "2026-11-02",
  ...over,
})

const october = [
  entry("sale", {
    type: "income",
    catId: "300-domestic",
    amount: 5_000,
    date: "2026-10-05",
  }),
  entry("cost", { date: "2026-10-07" }),
]

describe("statementDraft", () => {
  it("keeps the statement's balances and account", () => {
    expect(
      statementDraft({
        id: "a",
        from: "2026-10-01",
        to: "2026-10-31",
        rows: 3,
        movement: 3_000,
        statement: {
          iban: "FI2112345600000785",
          opening: { amount: 10_000, date: "2026-10-01" },
          closing: { amount: 13_000, date: "2026-10-31" },
        },
        fileName: "loka.xml",
        today: "2026-11-02",
      })
    ).toEqual({
      id: "a",
      from: "2026-10-01",
      to: "2026-10-31",
      rows: 3,
      movement: 3_000,
      opening: 10_000,
      closing: 13_000,
      iban: "FI2112345600000785",
      fileName: "loka.xml",
      importedAt: "2026-11-02",
    })
  })
})

describe("withStatement", () => {
  it("replaces a statement of the same account and days and keeps day order", () => {
    const sept = record({ id: "sept", from: "2026-09-01", to: "2026-09-30" })
    const oct = record({ id: "oct" })
    const again = record({ id: "oct2", movement: 1 })
    const first = withStatement([oct], sept)
    expect(first.list.map((r) => r.id)).toEqual(["sept", "oct"])
    expect(first.replaced).toBeNull()
    const second = withStatement(first.list, again)
    expect(second.list.map((r) => r.id)).toEqual(["sept", "oct2"])
    expect(second.replaced?.id).toBe("oct")
  })

  it("keeps statements of two accounts for the same days apart", () => {
    const a = record({ id: "a", iban: "FI2112345600000785" })
    const b = record({ id: "b" })
    expect(withStatement([a], b).list).toHaveLength(2)
  })
})

describe("checkStatements", () => {
  it("agrees while the book moves what the statement does", () => {
    const [c] = checkStatements([record({})], october, cats)
    expect(c.bookMovement).toBe(4_000)
    expect(c.difference).toBe(0)
    expect(c.status).toBe("agrees")
    expect(needsLook(c)).toBe(false)
  })

  it("says changed when an entry on its days changed after the import", () => {
    const edited = [october[0], { ...october[1], amount: 1_500 }]
    const [c] = checkStatements([record({})], edited, cats)
    expect(c.status).toBe("changed")
    expect(c.difference).toBe(500)
  })

  it("says differs when the two never agreed", () => {
    const [c] = checkStatements(
      [record({ movement: 3_000, bookMovement: 4_000 })],
      october,
      cats
    )
    expect(c.status).toBe("differs")
    expect(c.difference).toBe(-1_000)
  })

  it("leaves out entries paid in cash, open or outside the days", () => {
    const more = [
      ...october,
      entry("cash", { date: "2026-10-08", cash: true }),
      entry("open", { date: "2026-10-09", paidOn: null }),
      entry("later", { date: "2026-11-02" }),
    ]
    expect(checkStatements([record({})], more, cats)[0].status).toBe("agrees")
  })

  it("reads the statement's own gap and a break in the balances", () => {
    const checks = checkStatements(
      [
        record({
          id: "sept",
          from: "2026-09-01",
          to: "2026-09-30",
          movement: 0,
          bookMovement: 0,
          opening: 5_000,
          closing: 6_000,
        }),
        record({ opening: 6_500, closing: 10_500 }),
      ],
      october,
      cats
    )
    expect(checks[0].gap).toBe(-1_000)
    expect(checks[0].chainBreak).toBeNull()
    expect(checks[1].gap).toBe(0)
    expect(checks[1].chainBreak).toBe(-500)
    expect(needsLook(checks[1])).toBe(true)
  })
})

describe("monthCovers", () => {
  it("marks each month by its worst statement and lists uncovered payments", () => {
    const entries = [
      ...october,
      entry("june", { date: "2026-06-10" }),
      entry("edge", { date: "2026-09-30" }),
    ]
    const checks = checkStatements(
      [
        record({}),
        record({
          id: "sept",
          from: "2026-09-01",
          to: "2026-09-15",
          movement: 0,
          bookMovement: 0,
        }),
      ],
      entries,
      cats
    )
    const months = monthCovers(checks, entries, cats, 2026)
    expect(months[9].status).toBe("agrees")
    expect(months[8].status).toBe("agrees")
    expect(months[8].uncovered.map((p) => p.entries[0].id)).toEqual(["edge"])
    expect(months[5].status).toBe("none")
    expect(months[5].uncovered).toHaveLength(1)
    expect(months[0].uncovered).toHaveLength(0)
  })

  it("puts a changed statement above one that differs", () => {
    const entries = [october[0], { ...october[1], amount: 2_000 }]
    const checks = checkStatements(
      [
        record({}),
        record({
          id: "b",
          iban: "FI2112345600000785",
          movement: 1,
          bookMovement: 2,
        }),
      ],
      entries,
      cats
    )
    expect(monthCovers(checks, entries, cats, 2026)[9].status).toBe("changed")
  })
})

describe("statementsInYear", () => {
  it("takes a statement that reaches into the year", () => {
    const checks = checkStatements(
      [
        record({ id: "new-year", from: "2025-12-15", to: "2026-01-15" }),
        record({ id: "old", from: "2025-10-01", to: "2025-10-31" }),
      ],
      [],
      cats
    )
    expect(statementsInYear(checks, 2026).map((c) => c.record.id)).toEqual([
      "new-year",
    ])
  })
})

describe("parseStatementRecords", () => {
  it("drops what it cannot read and keeps one record per account and days", () => {
    const list = parseStatementRecords([
      record({ id: "a", iban: "FI21 1234 5600 0007 85" }),
      { ...record({ id: "bad" }), to: "2026-09-01" },
      { ...record({ id: "bad2" }), movement: 1.5 },
      "nope",
      record({
        id: "b",
        from: "2026-11-01",
        to: "2026-11-30",
        fileName: " x ",
      }),
      record({ id: "c", from: "2026-11-01", to: "2026-11-30" }),
    ])
    expect(list.map((r) => r.id)).toEqual(["a", "c"])
    expect(list[0].iban).toBe("FI2112345600000785")
    expect(parseStatementRecords({})).toEqual([])
  })
})
