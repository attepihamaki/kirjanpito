import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { vatYear } from "@/lib/domain/vat-year"

const cats = defaultCategories()

function sale(over: Partial<Entry> = {}): Entry {
  return {
    id: "s",
    date: "2026-09-10",
    description: "Myynti",
    type: "income",
    catId: "300-domestic",
    amount: 12_550,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const base = {
  cats,
  year: 2026,
  vatPeriod: "quarter" as const,
  bookStart: null,
  vatFiled: {},
}

describe("vatYear", () => {
  it("gives a row per period with entries and totals them", () => {
    const entries = [
      sale({ id: "a", date: "2026-02-10" }),
      sale({ id: "b", date: "2026-08-10" }),
      sale({
        id: "c",
        date: "2026-08-12",
        type: "expense",
        catId: "333",
        amount: 2_510,
      }),
    ]
    const { rows, total } = vatYear({ ...base, entries })
    expect(rows.map((r) => r.period.key)).toEqual(["2026-Q1", "2026-Q3"])
    expect(rows[0]).toMatchObject({ tax: 2_550, deductible: 0, due: 2_550 })
    expect(rows[1]).toMatchObject({ tax: 2_550, deductible: 510, due: 2_040 })
    expect(total).toEqual({ tax: 5_100, deductible: 510, due: 4_590 })
  })

  it("keeps a filed period that has no vouchers", () => {
    const { rows } = vatYear({
      ...base,
      entries: [sale({ date: "2026-02-10" })],
      vatFiled: { "2026-Q2": "2026-08-01" },
    })
    expect(rows.map((r) => r.period.key)).toEqual(["2026-Q1", "2026-Q2"])
    expect(rows[1].filed).toBe("2026-08-01")
  })

  it("leaves out periods before the book began", () => {
    const { rows } = vatYear({
      ...base,
      entries: [
        sale({ date: "2026-02-10" }),
        sale({ id: "z", date: "2026-11-10" }),
      ],
      bookStart: "2026-07",
    })
    expect(rows.map((r) => r.period.key)).toEqual(["2026-Q4"])
  })

  it("is empty without entries", () => {
    expect(vatYear({ ...base, entries: [] }).rows).toEqual([])
  })
})
