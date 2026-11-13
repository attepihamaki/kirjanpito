import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { calcEntry, euPurchaseVat, signedGross } from "@/lib/domain/calc"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import { filedPeriodChanges } from "@/lib/domain/filed-changes"
import { incomeStatement } from "@/lib/domain/income-statement"
import { entryToRecurring, recurringToEntry } from "@/lib/domain/recurring"
import { parseSettings } from "@/lib/domain/settings-file"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { countsOnVatReturn, vatReport } from "@/lib/domain/vat"
import { vatReturnSections, vatReturnValues } from "@/lib/domain/vat-return"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

function purchase(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Pilvipalvelu",
    type: "expense",
    catId: "344-other",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "net",
    euPurchase: "services",
    ...over,
  }
}

function fields(entries: readonly Entry[]) {
  return vatReturnValues(vatReturnSections(vatReport(entries, cats)))
}

describe("the amounts of an EU purchase", () => {
  it("has no VAT, so the amount is both the cost and the payment", () => {
    expect(calcEntry(purchase())).toEqual({
      net: 10_000,
      vat: 0,
      gross: 10_000,
    })
    expect(signedGross(purchase())).toBe(-10_000)
  })

  it("ignores the mode, since the invoice has no VAT in it", () => {
    expect(calcEntry(purchase({ amountMode: "gross" })).net).toBe(10_000)
  })

  it("works out the tax the buyer reports", () => {
    expect(euPurchaseVat(purchase())).toBe(2_550)
    expect(euPurchaseVat(purchase({ amount: -10_000 }))).toBe(-2_550)
    expect(euPurchaseVat(purchase({ vatRate: Number.NaN }))).toBe(0)
  })

  it("costs the invoice amount on the income statement", () => {
    const statement = incomeStatement([purchase()], cats, 2026)
    expect(statement.deductibleTotal).toBe(10_000)
  })
})

describe("an EU purchase on the VAT return", () => {
  it("fills the services fields and leaves the tax payable alone", () => {
    const v = fields([purchase()])
    expect(v.get("314")).toBe(10_000)
    expect(v.get("306")).toBe(2_550)
    expect(v.get("307")).toBe(2_550)
    expect(v.get("308")).toBe(0)
    expect(v.get("313")).toBe(0)
    expect(v.get("305")).toBe(0)
  })

  it("fills the goods fields", () => {
    const v = fields([purchase({ euPurchase: "goods", catId: "333" })])
    expect(v.get("313")).toBe(10_000)
    expect(v.get("305")).toBe(2_550)
    expect(v.get("307")).toBe(2_550)
    expect(v.get("314")).toBe(0)
  })

  it("adds to the deduction of domestic purchases", () => {
    const domestic = purchase({
      id: "d",
      euPurchase: undefined,
      amount: 12_550,
      amountMode: "gross",
    })
    const report = vatReport([purchase(), domestic], cats)
    expect(report.purchases.total.vat).toBe(2_550)
    expect(report.euPurchases.deductible).toBe(2_550)
    expect(fields([purchase(), domestic]).get("307")).toBe(5_100)
    expect(report.due).toBe(-2_550)
  })

  it("keeps Verohallinto's check #1924: 308 is the tax fields minus 307", () => {
    const sale: Entry = {
      ...purchase({ id: "s", euPurchase: undefined }),
      type: "income",
      catId: "300-domestic",
    }
    const v = fields([
      sale,
      purchase(),
      purchase({ id: "g", euPurchase: "goods", amount: 4_000 }),
    ])
    const tax = ["301", "302", "303", "305", "306", "304", "318"]
      .map((code) => v.get(code) ?? 0)
      .reduce((a, b) => a + b, 0)
    expect(v.get("308")).toBe(tax - (v.get("307") ?? 0))
  })

  it("reports the tax but deducts none on a line whose VAT is not deductible", () => {
    const v = fields([purchase({ catId: "341" })])
    expect(v.get("306")).toBe(2_550)
    expect(v.get("307")).toBe(0)
    expect(v.get("308")).toBe(2_550)
  })

  it("counts a purchase with no tax, since the return asks for its amount", () => {
    const zero = purchase({ vatRate: 0 })
    expect(countsOnVatReturn(zero, cats)).toBe(true)
    expect(fields([zero]).get("314")).toBe(10_000)
  })

  it("does not count on a line that only moves money", () => {
    const moved = purchase({ catId: "owner-withdrawal" })
    expect(countsOnVatReturn(moved, cats)).toBe(false)
    expect(fields([moved]).get("314")).toBe(0)
  })
})

describe("the checks", () => {
  it("does not tell an EU purchase to book its gross at 0 %", () => {
    const flagged = flaggedEntryIds(
      "vatNotDeductible",
      [purchase({ catId: "341" })],
      cats,
      "2026-12-31"
    )
    expect(flagged.size).toBe(0)
  })

  it("sees a change to the flag on a filed period", () => {
    const before = [purchase({ euPurchase: undefined })]
    const changes = filedPeriodChanges(before, [purchase()], cats, "month", {
      "2026-05": "2026-07-12",
    })
    expect(changes).toHaveLength(1)
    expect(changes[0].baseChanged).toBe(true)
  })
})

describe("the eu_purchase column", () => {
  const back = (over: Partial<Entry>) => {
    const parsed = parseCsv(serializeCsv([purchase(over)], cats), baseCats)
    if (!parsed.ok) throw new Error(parsed.code)
    return parsed.entries[0]
  }

  it("round-trips with Finnish values", () => {
    expect(serializeCsv([purchase()], cats)).toContain(
      ";palvelu;;;;;;;;;;;;;;;;\r\n"
    )
    expect(back({}).euPurchase).toBe("services")
    expect(back({ euPurchase: "goods" }).euPurchase).toBe("goods")
  })

  it("stays empty on any other entry", () => {
    expect(back({ euPurchase: undefined }).euPurchase).toBeUndefined()
  })

  it("drops it on a line that only moves money", () => {
    expect(back({ catId: "owner-withdrawal" }).euPurchase).toBeUndefined()
  })

  it("reads the Finnish column name", () => {
    const parsed = parseCsv(
      "päivämäärä;tyyppi;tili;luokka;summa;alv;verollisuus;eu_osto\r\n2026-05-05;kulu;333;;100,00;25,5;netto;tavara\r\n",
      baseCats
    )
    if (!parsed.ok) throw new Error(parsed.code)
    expect(parsed.entries[0].euPurchase).toBe("goods")
  })
})

describe("a recurring EU purchase", () => {
  const template = entryToRecurring(purchase(), "r1", "2026-05")

  it("keeps the flag on the entries it makes", () => {
    expect(recurringToEntry(template, "2026-06", () => "n").euPurchase).toBe(
      "services"
    )
  })

  it("keeps the flag through settings.json and drops a bad value", () => {
    const read = (euPurchase: unknown) =>
      parseSettings(
        JSON.stringify({ recurring: [{ ...template, euPurchase }] })
      ).recurring?.[0]?.euPurchase
    expect(read("services")).toBe("services")
    expect(read("everything")).toBeUndefined()
  })
})
