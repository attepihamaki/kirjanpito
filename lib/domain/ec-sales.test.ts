import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { ecSales, looksLikeVatId, normalizeVatId } from "@/lib/domain/ec-sales"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function sale(over: Partial<Entry>): Entry {
  return {
    id: String(Math.random()),
    date: "2026-03-03",
    description: "",
    type: "income",
    catId: "300-eu-goods",
    amount: 100_000,
    vatRate: 0,
    amountMode: "gross",
    ...over,
  }
}

describe("VAT numbers", () => {
  it("normalises spacing and case", () => {
    expect(normalizeVatId(" se 556-123 ")).toBe("SE556123")
  })

  it.each([
    ["SE556123456701", true],
    ["FI12345678", true],
    ["12345678", false],
    ["SE", false],
  ])("%s looks right: %s", (value, expected) => {
    expect(looksLikeVatId(value)).toBe(expected)
  })
})

describe("ecSales", () => {
  it("totals goods and services per buyer and month", () => {
    const months = ecSales(
      [
        sale({ buyerVatId: "SE1234" }),
        sale({ buyerVatId: "se 1234", catId: "300-eu-services" }),
        sale({ buyerVatId: "DE5678", amount: 50_000 }),
      ],
      cats,
      2026
    )
    expect(months).toHaveLength(1)
    expect(months[0].buyers).toEqual([
      { vatId: "DE5678", goods: 50_000, services: 0, unsorted: 0 },
      { vatId: "SE1234", goods: 100_000, services: 100_000, unsorted: 0 },
    ])
  })

  it("lists a sale with no number last, for the user to fix", () => {
    const [month] = ecSales(
      [sale({}), sale({ buyerVatId: "SE1234" })],
      cats,
      2026
    )
    expect(month.buyers.map((b) => b.vatId)).toEqual(["SE1234", null])
  })

  it("is due on the 20th, or the next working day", () => {
    // 20 April 2026 is a Monday, and 20 June 2026 a Saturday.
    expect(ecSales([sale({})], cats, 2026)[0].due).toBe("2026-04-20")
    const may = sale({ date: "2026-05-10" })
    expect(ecSales([may], cats, 2026)[0].due).toBe("2026-06-22")
  })

  it("rolls December into the next year", () => {
    const dec = sale({ date: "2026-12-10" })
    expect(ecSales([dec], cats, 2026)[0].due).toBe("2027-01-20")
  })

  it("leaves out sales outside the EU and other income", () => {
    const rows = [
      sale({ catId: "300-other" }),
      sale({ catId: "300-domestic" }),
      sale({ catId: "318" }),
    ]
    expect(ecSales(rows, cats, 2026)).toEqual([])
  })

  it("keeps the retired category apart", () => {
    const [month] = ecSales([sale({ catId: "300-eu" })], cats, 2026)
    expect(month.buyers[0].unsorted).toBe(100_000)
  })
})
