import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { BookFinding } from "@/lib/domain/book-check"
import type { TaxFormSection } from "@/lib/domain/tax-form"
import { filledSections, packFindings, vatYear } from "@/lib/domain/tax-pack"
import type { Entry } from "@/lib/domain/types"

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

describe("filledSections", () => {
  const label = { fi: "x", en: "x" }
  const field = (code: string, value: number, total = false) => ({
    kind: "field" as const,
    code,
    label,
    value,
    portion: false,
    total,
    unused: false,
  })

  it("keeps fields with an amount and totals, and drops the rest", () => {
    const sections: TaxFormSection[] = [
      {
        number: "1",
        title: label,
        rows: [
          { kind: "group", label },
          field("300", 5_000),
          field("301", 0),
          field("355", 0, true),
        ],
      },
      { number: "2", title: label, rows: [field("400", 0)] },
    ]
    const out = filledSections(sections)
    expect(out).toHaveLength(1)
    expect(out[0].rows.map((r) => r.kind === "field" && r.code)).toEqual([
      "300",
      "355",
    ])
  })
})

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

describe("packFindings", () => {
  const at = (year: number | null): BookFinding =>
    ({ set: "yearEnd", year, finding: {} }) as unknown as BookFinding

  it("keeps the year's findings and the book-wide ones", () => {
    const list = [at(2026), at(2025), at(null)]
    expect(packFindings(list, 2026)).toEqual([list[0], list[2]])
  })
})
