import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import { receiptReasonField } from "@/lib/domain/receipt-reason"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* Why a voucher has no receipt attached (§8.5). */

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

const fee = (over: Partial<Entry> = {}): Entry => ({
  id: "f",
  voucher: 1,
  date: "2026-03-31",
  description: "Pankin palvelumaksu",
  type: "expense",
  catId: "349",
  amount: 850,
  vatRate: 0,
  amountMode: "gross",
  ...over,
})

function readBack(entries: Entry[], lang: "fi" | "en") {
  const result = parseCsv(serializeCsv(entries, cats, { lang }), baseCats)
  if (!result.ok) throw new Error("did not parse")
  return result.entries
}

describe("the receipt reason", () => {
  it("round-trips in both languages", () => {
    for (const lang of ["fi", "en"] as const) {
      const [statement, other] = readBack(
        [
          fee({ receiptReason: "statement" }),
          fee({ id: "g", voucher: 2, receiptReason: "other" }),
        ],
        lang
      )
      expect(statement.receiptReason).toBe("statement")
      expect(other.receiptReason).toBe("other")
    }
  })

  it("reads either language's word, and drops one it does not know", () => {
    expect(receiptReasonField(" Tiliote ")).toEqual({
      receiptReason: "statement",
    })
    expect(receiptReasonField("other")).toEqual({ receiptReason: "other" })
    expect(receiptReasonField("kuitti")).toEqual({})
    expect(receiptReasonField("")).toEqual({})
  })

  it("is not written or read on a voucher that has a receipt", () => {
    const withFile = fee({
      receiptReason: "statement",
      atts: [{ id: "a", name: "kuitti.pdf", type: "application/pdf", size: 1 }],
    })
    const [read] = readBack([withFile], "fi")
    expect(read.receiptReason).toBeUndefined()
  })

  it("keeps a voucher with a reason out of the missing-receipt check", () => {
    const flagged = flaggedEntryIds(
      "noReceipt",
      [fee(), fee({ id: "g", voucher: 2, receiptReason: "statement" })],
      cats,
      "2026-11-13"
    )
    expect([...flagged]).toEqual(["f"])
  })
})
