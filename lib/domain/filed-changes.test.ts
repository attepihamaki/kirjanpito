import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { filedPeriodChanges, fitsNextReturn } from "@/lib/domain/filed-changes"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* What a change to the entries does to returns already filed (§8.11). */

const cats = indexCategories(defaultCategories())
const before = sampleEntries(createIdFactory("f"))
const FILED = { "2026-03": "2026-05-11", "2026-10": "2026-12-14" }

function expense(over: Partial<Entry>): Entry {
  return {
    id: "new",
    date: "2026-10-15",
    description: "Osto",
    type: "expense",
    catId: "333",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const changes = (after: Entry[], kind: "month" | "quarter" = "month") =>
  filedPeriodChanges(before, after, cats, kind, FILED)

describe("filedPeriodChanges", () => {
  it("reports nothing when no figure changes", () => {
    const after = before.map((e) =>
      e.date === "2026-10-10" ? { ...e, description: "Uusi selite" } : e
    )
    expect(changes(after)).toEqual([])
  })

  it("reports the change in tax for a new purchase in a filed month", () => {
    const [c] = changes([...before, expense({})])
    expect(c.period.key).toBe("2026-10")
    expect(c.filedOn).toBe("2026-12-14")
    // 100,00 € gross at 25,5 % holds 20,32 € of VAT, deducted from the tax.
    expect(c.taxDelta).toBe(-2032)
    expect(c.baseChanged).toBe(false)
    expect(fitsNextReturn(c)).toBe(true)
  })

  it("ignores a period that is not marked as filed", () => {
    expect(changes([...before, expense({ date: "2026-11-02" })])).toEqual([])
  })

  it("reports the filed period an entry moves out of", () => {
    const after = before.map((e) =>
      e.date === "2026-10-10" ? { ...e, date: "2026-11-10" } : e
    )
    const [c] = changes(after)
    expect(c.period.key).toBe("2026-10")
    expect(c.taxDelta).toBe(2032)
  })

  it("reports a deleted entry", () => {
    const after = before.filter((e) => e.date !== "2026-10-28")
    const [c] = changes(after)
    // The month's only sale carried 382,50 € of VAT.
    expect(c.taxDelta).toBe(-38250)
    expect(fitsNextReturn(c)).toBe(true)
  })

  it("needs a replacement return when only a tax base changes", () => {
    const sale = expense({
      date: "2026-03-10",
      type: "income",
      catId: "300-eu-goods",
      vatRate: 0,
    })
    const [c] = changes([...before, sale])
    expect(c.period.key).toBe("2026-03")
    expect(c.taxDelta).toBe(0)
    expect(c.baseChanged).toBe(true)
    expect(fitsNextReturn(c)).toBe(false)
  })

  it("needs a replacement return when the tax moves by more than 500 €", () => {
    const [c] = changes([...before, expense({ amount: 300_000 })])
    expect(Math.abs(c.taxDelta)).toBeGreaterThan(50_000)
    expect(fitsNextReturn(c)).toBe(false)
  })

  it("leaves out an entry no field of the return counts", () => {
    const grant = expense({ type: "income", catId: "318", vatRate: 0 })
    expect(changes([...before, grant])).toEqual([])
  })

  it("follows the filing period", () => {
    const filed = { "2026-Q4": "2027-02-12" }
    const [c] = filedPeriodChanges(
      before,
      [...before, expense({ date: "2026-12-01" })],
      cats,
      "quarter",
      filed
    )
    expect(c.period.key).toBe("2026-Q4")
  })

  it("lists every filed period a change touches, in date order", () => {
    const after = before.map((e) =>
      e.date === "2026-10-28" ? { ...e, date: "2026-03-28" } : e
    )
    expect(changes(after).map((c) => c.period.key)).toEqual([
      "2026-03",
      "2026-10",
    ])
  })
})
