import { describe, expect, it } from "vitest"

import { LINE_BY_KEY, defaultCategories } from "@/lib/domain/accounts"
import { incomeStatement } from "@/lib/domain/income-statement"
import {
  balancesAt,
  canBeUnpaid,
  isOpenAt,
  paidDate,
  taxBasisEntries,
} from "@/lib/domain/open-items"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function sale(over: Partial<Entry> = {}): Entry {
  return {
    id: "s",
    date: "2026-12-15",
    description: "Lasku",
    type: "income",
    catId: "300-domestic",
    amount: 125_500,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("paidDate", () => {
  it("is the entry's date when no other is given", () => {
    expect(paidDate(sale())).toBe("2026-12-15")
  })

  it("is null while the entry is open", () => {
    expect(paidDate(sale({ paidOn: null }))).toBeNull()
  })
})

describe("isOpenAt", () => {
  it("counts an entry from its date until its payment", () => {
    const e = sale({ paidOn: "2027-01-10" })
    expect(isOpenAt(e, "2026-12-14")).toBe(false)
    expect(isOpenAt(e, "2026-12-31")).toBe(true)
    expect(isOpenAt(e, "2027-01-10")).toBe(false)
  })

  it("never counts an entry paid on its own date", () => {
    expect(isOpenAt(sale(), "2026-12-31")).toBe(false)
  })
})

describe("balancesAt", () => {
  it("adds receivables and payables with VAT", () => {
    const rows = [
      sale({ paidOn: null }),
      sale({ id: "b", type: "expense", catId: "333", paidOn: "2027-02-01" }),
      sale({ id: "c" }),
    ]
    expect(balancesAt(rows, cats, "2026-12-31")).toEqual({
      receivables: 125_500,
      payables: 125_500,
      count: 2,
    })
  })

  it("leaves out lines that cannot be unpaid", () => {
    const owner = sale({
      type: "expense",
      catId: "owner-withdrawal",
      vatRate: 0,
      paidOn: null,
    })
    expect(balancesAt([owner], cats, "2026-12-31").count).toBe(0)
  })
})

describe("canBeUnpaid", () => {
  it.each([
    ["333", true],
    ["asset-purchase", true],
    ["337", false],
    ["vat-payment", false],
    ["owner-withdrawal", false],
    ["loan-repayment", false],
  ])("%s is %s", (key, expected) => {
    expect(canBeUnpaid(LINE_BY_KEY.get(key))).toBe(expected)
  })
})

describe("taxBasisEntries", () => {
  const result = (y: number) =>
    incomeStatement(
      taxBasisEntries([sale({ paidOn: "2027-01-10" })]),
      cats,
      y
    ).result

  it("puts income in the year of payment", () => {
    expect(result(2026)).toBe(0)
    expect(result(2027)).toBe(100_000)
  })

  it("leaves an open invoice out", () => {
    expect(taxBasisEntries([sale({ paidOn: null })])).toEqual([])
  })

  it("leaves the reference figures alone when nothing is paid late", () => {
    const rows = sampleEntries(createIdFactory("o"))
    expect(incomeStatement(taxBasisEntries(rows), cats, 2026).result).toBe(
      1_064_253
    )
  })
})
