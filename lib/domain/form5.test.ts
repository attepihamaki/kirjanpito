import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { form5Sections, form5Values } from "@/lib/domain/form5"
import { createIdFactory } from "@/lib/domain/id"
import { incomeStatement } from "@/lib/domain/income-statement"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
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
 * The automated checks of Verohallinto's 2026 data file specification
 * ---------------------------------------------------------------------- */

function expectFormChecks(v: (code: number) => number) {
  const sum = (codes: number[]) => codes.reduce((a, c) => a + v(c), 0)
  expect(v(316)).toBe(
    sum([300, 318, 301, 313, 314, 315, 320, 322, 326, 328, 323, 312, 324])
  )
  expect(v(355)).toBe(
    sum([333, 334, 335, 336, 338, 342, 343, 344, 347, 349, 353, 364, 354])
  )
  expect(v(342)).toBeLessThanOrEqual(v(341) / 2)
  expect(v(320)).toBeLessThanOrEqual(v(319))
  expect(v(322)).toBeLessThanOrEqual(v(321))
  expect(v(347)).toBeLessThanOrEqual(v(346))
  expect(v(358) === 0 || v(359) === 0).toBe(true)
  expect(v(358) - v(359)).toBe(v(316) - v(355))
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

  it("lists the fields in the form's order", () => {
    const codes = form5Sections(incomeStatement([], cats, 2026)).flatMap((s) =>
      s.rows.flatMap((r) => (r.kind === "field" ? [r.code] : []))
    )
    expect(codes).toEqual([
      300, 318, 301, 313, 314, 315, 319, 320, 321, 322, 323, 312, 324, 316, 317,
      333, 334, 335, 336, 337, 338, 341, 342, 343, 344, 346, 347, 349, 353, 354,
      355, 365, 366, 367, 358, 359,
    ])
  })
})
