import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  ENTRY_CHECKS,
  ENTRY_RULES,
  duplicateOf,
  entryWithReceipt,
  flaggedEntryIds,
} from "@/lib/domain/entry-checks"
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

describe("duplicate", () => {
  const receipt = {
    id: "a1",
    name: "kuitti.jpg",
    type: "image/jpeg",
    size: 1234,
  }

  it("flags nothing in the sample book", () => {
    expect(flagged("duplicate", sample)).toEqual([])
  })

  it("flags both entries of a pair with the same date, side and gross", () => {
    const pair = [entry({}), entry({ id: "y", catId: "344-other" })]
    expect(flagged("duplicate", pair).sort()).toEqual(["x", "y"])
  })

  it("compares the gross amount, however it was entered", () => {
    const net = entry({ id: "y", amount: 7968, amountMode: "net" })
    expect(flagged("duplicate", [entry({ amount: 10_000 }), net])).toEqual([
      "x",
      "y",
    ])
  })

  it("leaves a different date, side or amount alone", () => {
    const others = [
      entry({ id: "a", date: "2026-10-16" }),
      entry({ id: "b", type: "income", catId: "300-domestic" }),
      entry({ id: "c", amount: 10_001 }),
    ]
    expect(flagged("duplicate", [entry({}), ...others])).toEqual([])
  })

  it("flags two entries that share a receipt file", () => {
    const pair = [
      entry({ atts: [receipt] }),
      entry({ id: "y", date: "2026-10-20", atts: [{ ...receipt, id: "a2" }] }),
    ]
    expect(flagged("duplicate", pair).sort()).toEqual(["x", "y"])
  })

  it("ignores receipts missing from the file", () => {
    const missing = { ...receipt, id: null, missing: true as const }
    const pair = [
      entry({ atts: [missing] }),
      entry({ id: "y", date: "2026-10-20", atts: [missing] }),
    ]
    expect(flagged("duplicate", pair)).toEqual([])
  })

  it("finds the other entry for the dialog, never the entry itself", () => {
    const x = entry({ atts: [receipt] })
    expect(duplicateOf(x, [x])).toBeUndefined()
    expect(duplicateOf({ ...x, id: "new" }, [x])).toBe(x)
    expect(entryWithReceipt(receipt, [x], "x")).toBeUndefined()
    expect(entryWithReceipt({ ...receipt, id: "a9" }, [x])).toBe(x)
  })
})

describe("vatNotDeductible", () => {
  it("flags entertainment and non-deductible expenses that carry VAT", () => {
    const rows = ["341", "365", "366", "367"].map((catId) =>
      entry({ id: catId, catId, vatRate: 25.5 })
    )
    expect(flagged("vatNotDeductible", [...sample, ...rows])).toEqual([
      "341",
      "365",
      "366",
      "367",
    ])
  })

  it("leaves them alone at 0 %, and other lines with VAT", () => {
    const rows = [
      entry({ id: "a", catId: "341", vatRate: 0 }),
      entry({ id: "b", catId: "344-meeting", vatRate: 13.5 }),
    ]
    expect(flagged("vatNotDeductible", rows)).toEqual([])
  })
})

describe("privateUseNoVat", () => {
  const use = (id: string, euros: number, vatRate = 0) =>
    entry({
      id,
      type: "income",
      catId: "314",
      amount: euros * 100,
      vatRate,
    })

  it("stays quiet up to 850 € a year", () => {
    expect(flagged("privateUseNoVat", [use("a", 850)])).toEqual([])
  })

  it("flags 0 % private use above it", () => {
    const rows = [use("a", 600), use("b", 300), use("c", 100, 25.5)]
    expect(flagged("privateUseNoVat", rows).sort()).toEqual(["a", "b"])
  })
})

describe("lateCash", () => {
  const added = (entryId: string, at: string) => ({
    at,
    action: "add" as const,
    entryId,
  })
  const late = (entries: Entry[], log: ReturnType<typeof added>[]) => [
    ...flaggedEntryIds("lateCash", entries, cats, TODAY, log),
  ]

  it("flags a cash voucher booked more than two days after the payment", () => {
    const e = entry({ id: "k", date: "2026-10-01", cash: true })
    expect(late([e], [added("k", "2026-10-04T09:00:00")])).toEqual(["k"])
    expect(late([e], [added("k", "2026-10-03T09:00:00")])).toEqual([])
  })

  it("counts from the payment date when it differs", () => {
    const e = entry({
      id: "k",
      date: "2026-10-01",
      paidOn: "2026-10-05",
      cash: true,
    })
    expect(late([e], [added("k", "2026-10-06T09:00:00")])).toEqual([])
  })

  it("leaves out other payments, and vouchers that came in a file", () => {
    const bank = entry({ id: "b", date: "2026-10-01" })
    const imported = entry({ id: "i", date: "2026-10-01", cash: true })
    expect(late([bank, imported], [added("b", "2026-10-20T09:00:00")])).toEqual(
      []
    )
  })
})

describe("ENTRY_RULES", () => {
  it("has one rule for each check, under the check's name", () => {
    expect(ENTRY_RULES.rules.map((r) => r.id)).toEqual([...ENTRY_CHECKS])
  })

  it("flags nothing in an empty year", () => {
    for (const check of ENTRY_CHECKS) {
      expect(flaggedEntryIds(check, [], new Map(), "2026-11-05").size).toBe(0)
    }
  })
})
