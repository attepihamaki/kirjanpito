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
  entries: Entry[],
  hashes?: ReadonlyMap<string, string>
) => [...flaggedEntryIds(check, entries, cats, TODAY, [], hashes)]

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
      entry({ id: "a", date: "2026-10-25" }),
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

  describe("by content", () => {
    const renamed = { ...receipt, id: "a2", name: "kuitti (1).jpg" }
    const twin = (a: typeof receipt, b: typeof receipt) => [
      entry({ atts: [a] }),
      entry({ id: "y", date: "2026-10-20", atts: [b] }),
    ]

    it("flags a renamed copy of the same file", () => {
      const hashes = new Map([
        ["a1", "abc"],
        ["a2", "abc"],
      ])
      expect(
        flagged("duplicate", twin(receipt, renamed), hashes).sort()
      ).toEqual(["x", "y"])
    })

    it("leaves two files that only look alike, once both are read", () => {
      const lookalike = { ...receipt, id: "a2" }
      const hashes = new Map([
        ["a1", "abc"],
        ["a2", "def"],
      ])
      expect(flagged("duplicate", twin(receipt, lookalike), hashes)).toEqual([])
    })

    it("falls back to name, type and size for a file not read yet", () => {
      const lookalike = { ...receipt, id: "a2" }
      expect(
        flagged("duplicate", twin(receipt, lookalike), new Map()).sort()
      ).toEqual(["x", "y"])
    })

    it("finds the entry holding a freshly attached copy", () => {
      const x = entry({ atts: [receipt] })
      const hashes = new Map([
        ["a1", "abc"],
        ["a2", "abc"],
      ])
      expect(entryWithReceipt(renamed, [x], undefined, hashes)).toBe(x)
    })
  })

  describe("a few days apart", () => {
    const near = (over: Partial<Entry>) =>
      flagged("duplicate", [entry({}), entry({ id: "y", ...over })]).sort()

    it("flags the same side, amount and description within three days", () => {
      expect(near({ date: "2026-10-18" })).toEqual(["x", "y"])
      expect(near({ date: "2026-10-12", description: " testi " })).toEqual([
        "x",
        "y",
      ])
    })

    it("leaves four days, another description or an empty one alone", () => {
      expect(near({ date: "2026-10-19" })).toEqual([])
      expect(near({ date: "2026-10-16", description: "Muu" })).toEqual([])
      expect(
        flagged("duplicate", [
          entry({ description: "" }),
          entry({ id: "y", date: "2026-10-16", description: "" }),
        ])
      ).toEqual([])
    })

    it("leaves a split receipt's parts alone", () => {
      expect(
        flagged("duplicate", [
          entry({ split: "s" }),
          entry({ id: "y", date: "2026-10-16", split: "s" }),
        ])
      ).toEqual([])
    })

    it("is found for the dialog", () => {
      const x = entry({})
      expect(duplicateOf({ ...x, id: "new", date: "2026-10-17" }, [x])).toBe(x)
    })
  })

  it("ignores receipts missing from the file", () => {
    const missing = { ...receipt, id: null, missing: true as const }
    const pair = [
      entry({ atts: [missing] }),
      entry({ id: "y", date: "2026-10-20", atts: [missing] }),
    ]
    expect(flagged("duplicate", pair)).toEqual([])
  })

  describe("parts of a split receipt", () => {
    const part = (id: string, over: Partial<Entry> = {}) =>
      entry({ id, split: "s1", atts: [receipt], ...over })

    it("do not flag each other for sharing a receipt file or figures", () => {
      const parts = [part("x"), part("y", { atts: [{ ...receipt, id: "a2" }] })]
      expect(flagged("duplicate", parts)).toEqual([])
    })

    it("still flag a part that matches an entry outside the split", () => {
      const outsider = entry({ id: "z", atts: [{ ...receipt, id: "a3" }] })
      const parts = [part("x"), part("y"), outsider]
      expect(flagged("duplicate", parts).sort()).toEqual(["x", "y", "z"])
    })

    it("are told apart from another split with the same figures", () => {
      const other = entry({ id: "z", split: "s2", atts: [receipt] })
      expect(flagged("duplicate", [part("x"), other]).sort()).toEqual([
        "x",
        "z",
      ])
    })

    it("are skipped by the dialog's two lookups", () => {
      const x = part("x")
      const sibling = part("new")
      const attached = { ...receipt, id: "a9" }
      expect(duplicateOf(sibling, [x])).toBeUndefined()
      expect(entryWithReceipt(attached, [x, sibling], "new")).toBeUndefined()
      // An entry outside the split still gets the hint.
      expect(entryWithReceipt(attached, [x], "elsewhere")).toBe(x)
    })
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

describe("smallAsset", () => {
  const asset = (id: string, euros: number, date = "2026-03-01") =>
    entry({
      id,
      date,
      catId: "asset-purchase",
      amount: euros * 100,
      amountMode: "net",
    })

  it("flags a purchase up to the item limit and not one above it", () => {
    const rows = [asset("a", 1200), asset("b", 1201)]
    expect(flagged("smallAsset", rows)).toEqual(["a"])
  })

  it("compares the amount without VAT", () => {
    const gross = entry({
      id: "g",
      catId: "asset-purchase",
      amount: 140_000,
      amountMode: "gross",
    })
    expect(flagged("smallAsset", [gross])).toEqual(["g"])
  })

  it("stops flagging once the year's total passes the cap", () => {
    const rows = [
      asset("a", 1200, "2026-01-01"),
      asset("b", 1200, "2026-02-01"),
      asset("c", 1000, "2026-03-01"),
      asset("d", 300, "2026-04-01"),
    ]
    expect(flagged("smallAsset", rows).sort()).toEqual(["a", "b", "c"])
  })

  it("leaves a credit note alone", () => {
    const rows = [asset("a", 500), { ...asset("b", 500), reverses: "a" }]
    expect(flagged("smallAsset", rows)).toEqual(["a"])
  })
})

describe("largeExpense", () => {
  const cost = (id: string, euros: number, catId = "344-other") =>
    entry({ id, catId, amount: euros * 100, amountMode: "net" })

  it("flags a line 344 expense above the item limit", () => {
    const rows = [cost("a", 1200), cost("b", 1201), cost("c", 5000, "333")]
    expect(flagged("largeExpense", rows)).toEqual(["b"])
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
