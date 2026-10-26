import { describe, expect, it } from "vitest"

import { RATES, defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { filterPeriod, type Period } from "@/lib/domain/period"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { ledgerTotals, vatReport } from "@/lib/domain/vat"

const cats = indexCategories(defaultCategories())
const sample = sampleEntries(createIdFactory())
const reportFor = (p: Period) => vatReport(filterPeriod(sample, p), cats)

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "income",
    catId: "300-domestic",
    amount: 10000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("vatReport — sample data, whole year 2026", () => {
  const r = reportFor({ kind: "year", year: 2026 })

  it("totals sales VAT at 114 750", () => {
    expect(r.sales.total.vat).toBe(114750)
  })

  it("totals purchase VAT at 38 728", () => {
    expect(r.purchases.total.vat).toBe(38728)
  })

  it("makes 76 022 cents (760,22 €) payable", () => {
    expect(r.due).toBe(76022)
  })

  it("groups sales under 25,5 % only", () => {
    expect(r.sales.byRate.get(25.5)).toEqual({ net: 450000, vat: 114750 })
    for (const rate of RATES) {
      if (rate === 25.5) continue
      expect(r.sales.byRate.get(rate)).toEqual({ net: 0, vat: 0 })
    }
    expect(r.sales.other).toEqual({ net: 0, vat: 0 })
  })

  it("groups purchases under 25,5 % and 13,5 %", () => {
    expect(r.purchases.byRate.get(25.5)).toEqual({ net: 149615, vat: 38150 })
    expect(r.purchases.byRate.get(13.5)).toEqual({ net: 4282, vat: 578 })
    expect(r.purchases.byRate.get(24)).toEqual({ net: 0, vat: 0 })
  })

  it("reports EU and reverse-charge sales separately", () => {
    expect(r.otherSales).toEqual({
      eu: 320000,
      nonEu: 0,
      reverse: 480000,
    })
  })

  /*
   * Rounding the period net instead would give round(187765 * 25.5 / 125.5)
   * = 38 151 and a payable of 760,21 €, contradicting §10's 760,22 €.
   */
  it("rounds per entry, not per period", () => {
    expect(r.purchases.byRate.get(25.5)!.vat).toBe(38150)
  })

  it("flags no anomalies", () => {
    expect(r.anomalies).toEqual([])
  })
})

/*
 * The only October sale is 1 882,50 € gross at 25,5 %, so sales VAT is
 * 382,50 € and, against 20,32 € of purchase VAT, the payable is 362,18 €.
 * November and December are empty, so Q4 comes to the same figures.
 */
describe("vatReport — sample data, October 2026", () => {
  const r = reportFor({ kind: "month", year: 2026, month: 10 })

  it("collects 38 250 cents (382,50 €) of sales VAT", () => {
    expect(r.sales.total.vat).toBe(38250)
  })

  it("collects 2 032 cents (20,32 €) of purchase VAT", () => {
    expect(r.purchases.total.vat).toBe(2032)
  })

  it("makes 36 218 cents (362,18 €) payable", () => {
    expect(r.due).toBe(36218)
  })
})

describe("vatReport — sample data, Q4 2026", () => {
  it("matches October, because November and December are empty", () => {
    const r = reportFor({ kind: "quarter", year: 2026, quarter: 4 })
    expect(r.sales.total.vat).toBe(38250)
    expect(r.purchases.total.vat).toBe(2032)
    expect(r.due).toBe(36218)
  })
})

describe("vatReport — exclusions", () => {
  it("keeps an EU sale out of sales VAT", () => {
    const r = vatReport([entry({ catId: "300-eu", vatRate: 0 })], cats)
    expect(r.otherSales.eu).toBe(10000)
    expect(r.sales.total).toEqual({ net: 0, vat: 0 })
  })

  it("keeps a non-EU sale out of sales VAT", () => {
    const r = vatReport([entry({ catId: "300-other", vatRate: 0 })], cats)
    expect(r.otherSales.nonEu).toBe(10000)
    expect(r.sales.total.vat).toBe(0)
  })

  it("keeps a reverse-charge sale out of sales VAT", () => {
    const r = vatReport([entry({ catId: "300-reverse", vatRate: 0 })], cats)
    expect(r.otherSales.reverse).toBe(10000)
    expect(r.sales.total.vat).toBe(0)
  })

  /*
   * §6.1's exclusion is unconditional, so the rate is ignored — but an
   * anomaly is raised so the UI can warn about it rather than drop it in
   * silence.
   */
  it("still excludes an EU sale that carries a rate, and flags it", () => {
    const r = vatReport([entry({ catId: "300-eu", vatRate: 25.5 })], cats)
    expect(r.sales.total.vat).toBe(0)
    expect(r.otherSales.eu).toBe(7968)
    expect(r.anomalies).toEqual([
      { code: "vat-on-exempt-sale", entryId: "e1", kind: "eu", vat: 2032 },
    ])
  })

  it("includes 0 % income on line 300 in the 0 % sales row", () => {
    const r = vatReport([entry({ catId: "300-domestic", vatRate: 0 })], cats)
    expect(r.sales.byRate.get(0)).toEqual({ net: 10000, vat: 0 })
  })

  it("excludes 0 % income on line 318 from sales VAT and other sales", () => {
    const r = vatReport([entry({ catId: "318", vatRate: 0 })], cats)
    expect(r.sales.total).toEqual({ net: 0, vat: 0 })
    expect(r.otherSales).toEqual({ eu: 0, nonEu: 0, reverse: 0 })
  })

  it("excludes 0 % expenses from purchases", () => {
    const r = vatReport(
      [entry({ type: "expense", catId: "336", vatRate: 0, amount: 31000 })],
      cats
    )
    expect(r.purchases.total).toEqual({ net: 0, vat: 0 })
  })

  it("puts an unlisted rate in the other bucket", () => {
    const r = vatReport([entry({ vatRate: 9 })], cats)
    expect(r.sales.other.net).toBe(9174)
    expect(r.sales.byRate.get(25.5)).toEqual({ net: 0, vat: 0 })
  })

  it("always carries all six rate keys", () => {
    const r = vatReport([], cats)
    expect([...r.sales.byRate.keys()]).toEqual([...RATES])
    expect([...r.purchases.byRate.keys()]).toEqual([...RATES])
  })
})

describe("ledgerTotals", () => {
  it("matches the sample year", () => {
    expect(ledgerTotals(sample, cats)).toEqual({
      incomeNet: 1250000,
      expenseNet: 185747,
      due: 76022,
    })
  })

  it("matches sample January", () => {
    const jan = filterPeriod(sample, { kind: "month", year: 2026, month: 1 })
    expect(ledgerTotals(jan, cats)).toEqual({
      incomeNet: 200000,
      expenseNet: 17235,
      due: 46605,
    })
  })

  it("matches sample October", () => {
    const oct = filterPeriod(sample, { kind: "month", year: 2026, month: 10 })
    expect(ledgerTotals(oct, cats)).toEqual({
      incomeNet: 150000,
      expenseNet: 8818,
      due: 36218,
    })
  })

  it("returns zeros, not NaN, for an empty ledger", () => {
    expect(ledgerTotals([], cats)).toEqual({
      incomeNet: 0,
      expenseNet: 0,
      due: 0,
    })
  })

  it("reports a refund as a negative due", () => {
    const r = ledgerTotals(
      [entry({ type: "expense", catId: "333", amount: 12550, vatRate: 25.5 })],
      cats
    )
    expect(r.due).toBe(-2550)
  })
})
