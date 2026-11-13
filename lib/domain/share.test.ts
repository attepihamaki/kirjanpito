import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { calcEntry, calcWhole, isShare } from "@/lib/domain/calc"
import { parseCsv, serializeCsv, type ImportSuccess } from "@/lib/domain/csv"
import { incomeStatement } from "@/lib/domain/income-statement"
import { parseSettings } from "@/lib/domain/settings-file"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

/** A phone bill: 125,50 € with 25,5 % VAT included, so 100,00 € net. */
const phone = (over: Partial<Entry> = {}): Entry => ({
  id: "p",
  voucher: 1,
  date: "2026-10-10",
  description: "Puhelin",
  type: "expense",
  catId: "344-other",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

function read(text: string): ImportSuccess {
  const result = parseCsv(text, baseCats)
  if (!result.ok) throw new Error(result.code)
  return result
}

describe("the business share of a cost", () => {
  it("counts that share of the net and the VAT and leaves the gross whole", () => {
    expect(calcWhole(phone())).toEqual({
      net: 10_000,
      vat: 2_550,
      gross: 12_550,
    })
    expect(calcEntry(phone({ share: 50 }))).toEqual({
      net: 5_000,
      vat: 1_275,
      gross: 12_550,
    })
  })

  it("rounds a half away from zero, so a credit note mirrors the cost", () => {
    const cost = calcEntry(phone({ share: 33 }))
    const credit = calcEntry(phone({ share: 33, amount: -12_550 }))
    expect(credit.net).toBe(-cost.net)
    expect(credit.vat).toBe(-cost.vat)
  })

  it("ignores a value that is not a whole percent from 1 to 99", () => {
    for (const share of [0, 100, 120, 12.5, -5, Number.NaN]) {
      expect(isShare(share)).toBe(false)
      expect(calcEntry(phone({ share }))).toEqual(calcWhole(phone()))
    }
  })

  it("lowers the deductible VAT and the expense on the VAT return and statement", () => {
    const entries = [phone({ share: 50 })]
    expect(vatReport(entries, cats).purchases.total).toEqual({
      net: 5_000,
      vat: 1_275,
    })
    expect(incomeStatement(entries, cats, 2026).deductibleTotal).toBe(5_000)
  })

  it("round-trips through the CSV in both languages", () => {
    for (const lang of ["fi", "en"] as const) {
      const text = serializeCsv([phone({ share: 50 })], cats, { lang })
      expect(read(text).entries[0].share).toBe(50)
    }
    expect(read(serializeCsv([phone()], cats)).entries[0].share).toBeUndefined()
  })

  it("reads a share with a percent sign, and drops one that does not fit", () => {
    const text = serializeCsv([phone({ share: 50 })], cats)
    const row = (cell: string) =>
      text.replace(/;50;;;;;;;;;;;;;\r\n/, `;${cell};;;;;;;;;;;;;\r\n`)
    expect(read(row("75 %")).entries[0].share).toBe(75)
    for (const bad of ["100", "0", "abc", "5,5"]) {
      expect(read(row(bad)).entries[0].share).toBeUndefined()
    }
  })

  it("is dropped from income and from an EU purchase when read", () => {
    const income = phone({ type: "income", catId: "300-domestic", share: 50 })
    expect(read(serializeCsv([income], cats)).entries[0].share).toBeUndefined()
    const eu = phone({
      catId: "344-eu-services",
      amountMode: "net",
      euPurchase: "services",
      share: 50,
    })
    expect(read(serializeCsv([eu], cats)).entries[0].share).toBeUndefined()
  })

  it("keeps a category's default share, on a cost that can have one", () => {
    const file = (id: string, line: string, share: number) =>
      JSON.stringify({
        version: 1,
        categories: [
          {
            id,
            line,
            name: "x",
            vatRate: 0,
            enabled: true,
            custom: false,
            share,
          },
        ],
      })
    const find = (text: string, id: string) =>
      parseSettings(text).categories?.find((c) => c.id === id)

    expect(find(file("344-other", "344-other", 50), "344-other")?.share).toBe(
      50
    )
    expect(find(file("344-other", "344-other", 100), "344-other")?.share).toBe(
      undefined
    )
    // Income and settlement lines have no share.
    expect(find(file("300-domestic", "300", 50), "300-domestic")?.share).toBe(
      undefined
    )
    expect(
      find(file("vat-payment", "vat-payment", 50), "vat-payment")?.share
    ).toBe(undefined)
  })
})
