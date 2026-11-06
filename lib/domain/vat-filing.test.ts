import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { figureChanges, filingFigures } from "@/lib/domain/vat-filing"
import { unsettledDues } from "@/lib/domain/vat-settlement"

const cats = indexCategories(defaultCategories())

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

function purchase(over: Partial<Entry> = {}): Entry {
  return sale({
    id: "p",
    type: "expense",
    catId: "333",
    description: "Osto",
    amount: 2_510,
    ...over,
  })
}

describe("filingFigures", () => {
  it("keeps the non-zero fields and the signed balance", () => {
    const figures = filingFigures(vatReport([sale()], cats))
    expect(figures["301"]).toBe(2_550)
    expect(figures["308"]).toBe(2_550)
    expect(figures["302"]).toBeUndefined()
  })

  it("keeps a refund's minus on 308", () => {
    const figures = filingFigures(vatReport([purchase()], cats))
    expect(figures["308"]).toBeLessThan(0)
  })
})

describe("figureChanges", () => {
  const filed = filingFigures(vatReport([sale()], cats))

  it("is empty while the book agrees with the return", () => {
    expect(figureChanges(filed, vatReport([sale()], cats))).toEqual([])
  })

  it("names each field whose amount moved, with both amounts", () => {
    const changes = figureChanges(filed, vatReport([sale(), purchase()], cats))
    expect(changes.map((c) => c.code)).toEqual(["307", "308"])
    expect(changes[0]).toMatchObject({ filed: 0 })
    expect(changes[0].now).toBeGreaterThan(0)
  })

  it("reports a filed field that is gone from the return altogether", () => {
    const changes = figureChanges({ "311/312": 800 }, vatReport([], cats))
    expect(changes).toEqual([
      {
        code: "311/312",
        label: { fi: "311/312", en: "311/312" },
        filed: 800,
        now: 0,
      },
    ])
  })
})

describe("unsettledDues", () => {
  it("lists closed periods with tax and no payment, and skips settled ones", () => {
    const entries = [sale()]
    expect(unsettledDues(entries, cats, "month", "2026-11-03")).toEqual([
      { key: "2026-09", due: 2_550 },
    ])
    const paid: Entry = {
      id: "pay",
      date: "2026-11-03",
      description: "ALV",
      type: "expense",
      catId: "vat-payment",
      amount: 2_550,
      vatRate: 0,
      amountMode: "gross",
      settles: "2026-09",
    }
    expect(
      unsettledDues([...entries, paid], cats, "month", "2026-11-03")
    ).toEqual([])
  })

  it("leaves a period that has not closed", () => {
    expect(unsettledDues([sale()], cats, "month", "2026-09-20")).toEqual([])
  })
})
