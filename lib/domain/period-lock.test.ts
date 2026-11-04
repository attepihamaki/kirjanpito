import { describe, expect, it } from "vitest"

import { LINE_BY_KEY, defaultCategories } from "@/lib/domain/accounts"
import {
  entryLock,
  lockOn,
  paidChangeHitsForm5,
} from "@/lib/domain/period-lock"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { countsOnVatReturn, vatReport } from "@/lib/domain/vat"

const cats = indexCategories(defaultCategories())

const none = { vatFiled: {}, yearsArchived: {}, form5Filed: {} }

describe("lockOn", () => {
  it("leaves an unmarked date open", () => {
    expect(lockOn("2026-03-10", none)).toBeNull()
  })

  it("locks a date in a filed month, and only that month", () => {
    const marks = { ...none, vatFiled: { "2026-03": "2026-05-12" } }
    expect(lockOn("2026-03-10", marks)).toEqual({
      kind: "filed",
      key: "2026-03",
      since: "2026-05-12",
    })
    expect(lockOn("2026-04-10", marks)).toBeNull()
  })

  it("locks a date in a filed quarter or year", () => {
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026-Q2": "2026-08-12" } })
        ?.key
    ).toBe("2026-Q2")
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026": "2027-03-01" } })?.key
    ).toBe("2026")
  })

  it("names a stored year first", () => {
    const marks = {
      ...none,
      vatFiled: { "2026-03": "2026-05-12" },
      yearsArchived: { "2026": "2027-01-20" },
    }
    expect(lockOn("2026-03-10", marks)?.kind).toBe("year")
  })
})

describe("entryLock", () => {
  const marks = { ...none, vatFiled: { "2026-03": "2026-05-12" } }
  const entry = (over: Partial<Entry>): Entry => ({
    id: "x",
    date: "2026-03-10",
    description: "",
    type: "expense",
    catId: "333",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  })

  it("locks what the filed return counts", () => {
    expect(entryLock(entry({}), marks, cats)?.kind).toBe("filed")
    const sale = entry({ type: "income", catId: "300-eu-goods", vatRate: 0 })
    expect(entryLock(sale, marks, cats)?.kind).toBe("filed")
  })

  it.each([
    ["YEL", { catId: "336", vatRate: 0 }],
    ["a bank fee", { catId: "349", vatRate: 0 }],
    ["a grant", { type: "income" as const, catId: "318", vatRate: 0 }],
    ["an owner's withdrawal", { catId: "owner-withdrawal", vatRate: 0 }],
    ["a loan", { catId: "loan-repayment", vatRate: 0 }],
    ["a VAT payment", { catId: "vat-payment", vatRate: 0 }],
  ])("leaves %s open", (_, over) => {
    expect(entryLock(entry(over), marks, cats)).toBeNull()
  })

  it("locks every entry of a stored year", () => {
    const stored = { ...none, yearsArchived: { "2026": "2027-01-20" } }
    const yel = entry({ catId: "336", vatRate: 0 })
    expect(entryLock(yel, stored, cats)?.kind).toBe("year")
  })

  it("locks every entry of a year whose Form 5 is filed, VAT or not", () => {
    const filed = { ...none, form5Filed: { "2026": "2027-03-20" } }
    const yel = entry({ catId: "336", vatRate: 0 })
    expect(entryLock(yel, filed, cats)?.kind).toBe("form5")
    expect(entryLock(entry({}), filed, cats)?.kind).toBe("form5")
    expect(entryLock(entry({ date: "2027-01-05" }), filed, cats)).toBeNull()
  })

  it("agrees with the VAT report on every line and rate", () => {
    for (const cat of defaultCategories()) {
      for (const vatRate of [0, 25.5]) {
        const e = entry({
          type: LINE_BY_KEY.get(cat.line)?.side,
          catId: cat.id,
          vatRate,
        })
        const r = vatReport([e], cats)
        const reported =
          r.sales.total.net !== 0 ||
          r.purchases.total.net !== 0 ||
          Object.values(r.otherSales).some((v) => v !== 0)
        expect([cat.id, vatRate, countsOnVatReturn(e, cats)]).toEqual([
          cat.id,
          vatRate,
          reported,
        ])
      }
    }
  })
})

describe("entryLock by payment year", () => {
  const filed = { ...none, form5Filed: { "2026": "2027-03-20" } }
  const entry = (over: Partial<Entry>): Entry => ({
    id: "x",
    date: "2027-01-10",
    description: "",
    type: "income",
    catId: "300-domestic",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  })

  it("locks a prepayment the filed Form 5 counted", () => {
    expect(entryLock(entry({ paidOn: "2026-12-15" }), filed, cats)).toEqual({
      kind: "form5Paid",
      key: "2026",
      since: "2027-03-20",
    })
  })

  it("leaves an entry paid in an open year open", () => {
    expect(entryLock(entry({}), filed, cats)).toBeNull()
    expect(entryLock(entry({ paidOn: "2027-02-01" }), filed, cats)).toBeNull()
    expect(entryLock(entry({ paidOn: null }), filed, cats)).toBeNull()
  })

  it("names the lock on the entry's own date first", () => {
    const marks = { ...filed, vatFiled: { "2027-01": "2027-03-12" } }
    expect(entryLock(entry({ paidOn: "2026-12-15" }), marks, cats)?.kind).toBe(
      "filed"
    )
  })

  it("still locks a prepayment its VAT return does not count", () => {
    const marks = { ...filed, vatFiled: { "2027-01": "2027-03-12" } }
    const grant = entry({ catId: "318", vatRate: 0, paidOn: "2026-12-15" })
    expect(entryLock(grant, marks, cats)?.kind).toBe("form5Paid")
  })
})

describe("paidChangeHitsForm5", () => {
  const marks = { form5Filed: { "2026": "2027-03-20" } }

  it("lets an open invoice be paid in a later year", () => {
    expect(paidChangeHitsForm5(null, "2027-04-01", marks)).toBe(false)
  })

  it("refuses a payment dated in the filed year", () => {
    expect(paidChangeHitsForm5(null, "2026-12-20", marks)).toBe(true)
  })

  it("refuses moving a payment out of the filed year", () => {
    expect(paidChangeHitsForm5("2026-12-20", "2027-01-10", marks)).toBe(true)
    expect(paidChangeHitsForm5("2026-12-20", null, marks)).toBe(true)
  })

  it("ignores a date that did not change", () => {
    expect(paidChangeHitsForm5("2026-12-20", "2026-12-20", marks)).toBe(false)
  })
})
