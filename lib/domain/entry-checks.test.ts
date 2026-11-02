import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* The checks behind "Tarkistettavaa" and the ledger's filter (§8.4, §8.12). */

const cats = indexCategories(defaultCategories())
const sample = sampleEntries(createIdFactory("c"))
const TODAY = "2026-11-02"

function entry(over: Partial<Entry>): Entry {
  return {
    id: "x",
    date: "2026-10-15",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const flagged = (
  check: Parameters<typeof flaggedEntryIds>[0],
  entries: Entry[]
) => [...flaggedEntryIds(check, entries, cats, TODAY)]

describe("futureDate", () => {
  it("flags an entry dated after today", () => {
    expect(
      flagged("futureDate", [...sample, entry({ date: "2026-12-01" })])
    ).toEqual(["x"])
  })

  it("leaves today and the past alone", () => {
    expect(flagged("futureDate", [...sample, entry({ date: TODAY })])).toEqual(
      []
    )
  })
})

describe("zeroVatSale", () => {
  const zero = entry({ type: "income", catId: "300-domestic", vatRate: 0 })

  it("flags a 0 % domestic sale in a year with taxed domestic sales", () => {
    expect(flagged("zeroVatSale", [...sample, zero])).toEqual(["x"])
  })

  it("flags nothing for a business that sells everything at 0 %", () => {
    const unregistered = [zero, { ...zero, id: "y", date: "2026-11-01" }]
    expect(flagged("zeroVatSale", unregistered)).toEqual([])
  })

  it("leaves EU, export and reverse-charge sales alone", () => {
    // The sample's EU goods and reverse-charge sales are at 0 % by law.
    expect(flagged("zeroVatSale", sample)).toEqual([])
  })

  it("leaves 0 % income outside sales alone", () => {
    const grant = entry({ type: "income", catId: "318", vatRate: 0 })
    expect(flagged("zeroVatSale", [...sample, grant])).toEqual([])
  })
})

describe("largeAmount", () => {
  it("flags an expense with an extra zero", () => {
    // The sample's expenses have a median of a little over 100 €.
    const typo = entry({ amount: 4_500_000 })
    expect(flagged("largeAmount", [...sample, typo])).toEqual(["x"])
  })

  it("flags nothing in the sample year", () => {
    expect(flagged("largeAmount", sample)).toEqual([])
  })

  it("compares income with income", () => {
    // 4 800 € is usual among the sample's sales but not among its receipts.
    const sale = entry({ id: "s", type: "income", catId: "300-domestic" })
    const both = [
      ...sample,
      { ...sale, amount: 480_000 },
      entry({ id: "e", amount: 480_000 }),
    ]
    expect(flagged("largeAmount", both)).toEqual(["e"])
  })

  it("needs a few entries before anything stands out", () => {
    const few = [entry({ id: "a", amount: 1_000 }), entry({ amount: 900_000 })]
    expect(flagged("largeAmount", few)).toEqual([])
  })

  it("never flags an amount under 1 000 €", () => {
    const tiny = Array.from({ length: 6 }, (_, i) =>
      entry({ id: `t${i}`, amount: 500 })
    )
    expect(
      flagged("largeAmount", [...tiny, entry({ amount: 90_000 })])
    ).toEqual([])
  })
})
