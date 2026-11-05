import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { form5Sections, form5Values } from "@/lib/domain/form5"
import { createIdFactory } from "@/lib/domain/id"
import { incomeStatement } from "@/lib/domain/income-statement"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { evaluate } from "@/lib/domain/rules/engine"
import { FORM5_RULES } from "@/lib/domain/rules/form5-rules"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 10000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

function values(entries: Entry[]) {
  const v = form5Values(form5Sections(incomeStatement(entries, cats, 2026)))
  return (code: number) => v.get(code) ?? 0
}

/* -------------------------------------------------------------------------
 * The automated checks of Verohallinto's 2026 data file specification, run
 * by the rule engine
 * ---------------------------------------------------------------------- */

function expectFormChecks(v: (code: number) => number) {
  expect(evaluate(FORM5_RULES, v)).toEqual([])
}

describe("form5Sections", () => {
  it("gives the §10 figures for the sample year", () => {
    const v = values(sampleEntries(createIdFactory()))
    expect(v(300)).toBe(1250000)
    expect(v(316)).toBe(1250000)
    // The four 344 lines are one field on the form.
    expect(v(344)).toBe(11864 + 7359 + 4282)
    expect(v(355)).toBe(185747)
    expect(v(358)).toBe(1064253)
    expect(v(359)).toBe(0)
    expectFormChecks(v)
  })

  it("passes the form's checks with dividends, entertainment and a loss", () => {
    const v = values([
      entry({ id: "a", type: "income", catId: "319", amount: 100001 }),
      entry({ id: "b", type: "income", catId: "321", amount: 20000 }),
      entry({ id: "c", type: "income", catId: "317", amount: 5000 }),
      entry({ id: "d", catId: "341", amount: 20001 }),
      entry({ id: "e", catId: "337", amount: 30000 }),
      entry({ id: "f", catId: "346", amount: 4000 }),
      entry({ id: "g", catId: "333", amount: 200000 }),
      entry({ id: "h", catId: "366", amount: 900 }),
    ])
    expect(v(320)).toBe(85001)
    expect(v(322)).toBe(15000)
    expect(v(342)).toBe(10000)
    expect(v(338)).toBe(30000)
    expect(v(347)).toBe(4000)
    expect(v(317)).toBe(5000)
    expect(v(366)).toBe(900)
    expect(v(359)).toBe(244000 - 100001)
    expectFormChecks(v)
  })

  it("taxes co-operative surplus 25 % up to 5 000 € and 75 % above", () => {
    const below = values([
      entry({ id: "a", type: "income", catId: "327", amount: 400001 }),
    ])
    expect(below(327)).toBe(400001)
    expect(below(328)).toBe(100001)
    expectFormChecks(below)

    const above = values([
      entry({ id: "a", type: "income", catId: "327", amount: 700000 }),
    ])
    // 25 % of 5 000 € plus 75 % of the 2 000 € above it.
    expect(above(328)).toBe(125000 + 150000)
    expect(above(316)).toBe(275000)
    expectFormChecks(above)
  })

  it("reports the additional deductions as 364 with 388 and 392", () => {
    const v = values([
      entry({ id: "a", catId: "364-travel", amount: 30000 }),
      entry({ id: "b", catId: "364-car", amount: 45000 }),
      entry({ id: "c", catId: "354", amount: 9800 }),
    ])
    expect(v(388)).toBe(30000)
    expect(v(392)).toBe(45000)
    expect(v(364)).toBe(75000)
    expect(v(354)).toBe(9800)
    expect(v(355)).toBe(84800)
    expectFormChecks(v)
  })

  it("caps 338 at the register's maximum and leaves the excess out of 355", () => {
    const statement = incomeStatement(
      [entry({ id: "a", catId: "337", amount: 80000 })],
      cats,
      2026,
      { depreciationMax: new Map([[2026, 50000]]) }
    )
    const v = form5Values(form5Sections(statement))
    expect(v.get(337)).toBe(80000)
    expect(v.get(338)).toBe(50000)
    expect(v.get(355)).toBe(50000)
    expect(statement.depreciationExcess).toBe(30000)
  })

  it("lists the fields in the form's order", () => {
    const codes = form5Sections(incomeStatement([], cats, 2026)).flatMap((s) =>
      s.rows.flatMap((r) => (r.kind === "field" ? [Number(r.code)] : []))
    )
    expect(codes).toEqual([
      300, 318, 301, 313, 314, 315, 319, 320, 321, 322, 327, 328, 323, 312, 324,
      316, 317, 333, 334, 335, 336, 337, 338, 341, 342, 343, 344, 346, 347, 349,
      353, 364, 388, 392, 354, 355, 365, 366, 367, 358, 359,
    ])
  })
})
