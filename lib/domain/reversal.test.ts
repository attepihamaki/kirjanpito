import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import {
  parseReversalKey,
  reversalCandidates,
  reversalKey,
  reversalLabel,
  reversalLoops,
  reversedEntry,
  reversingEntries,
} from "@/lib/domain/reversal"
import { indexCategories, type Entry } from "@/lib/domain/types"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

function entry(id: string, over: Partial<Entry> = {}): Entry {
  return {
    id,
    voucher: 1,
    date: "2026-03-10",
    description: id,
    type: "income",
    catId: "300-domestic",
    amount: 10000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("links between vouchers", () => {
  const invoice = entry("a", { voucher: 4 })
  const credit = entry("b", { voucher: 9, reverses: "a", amount: -10000 })
  const all = [invoice, credit]

  it("finds the target from the reversing entry", () => {
    expect(reversedEntry(credit, all)).toBe(invoice)
    expect(reversedEntry(invoice, all)).toBeUndefined()
  })

  it("finds the reversals from the reversed entry", () => {
    expect(reversingEntries(invoice, all)).toEqual([credit])
    expect(reversingEntries(credit, all)).toEqual([])
  })

  it("treats a deleted target as no link", () => {
    expect(reversedEntry(credit, [credit])).toBeUndefined()
  })

  it("names a voucher with its year only when the year differs", () => {
    expect(reversalLabel(invoice, 2026)).toBe("4")
    expect(reversalLabel(invoice, 2027)).toBe("4/2026")
    expect(reversalLabel(entry("x", { voucher: undefined }), 2026)).toBe("")
  })
})

describe("loops", () => {
  const a = entry("a", { reverses: "c" })
  const b = entry("b", { reverses: "a" })
  const c = entry("c")

  it("refuses a link to itself", () => {
    expect(reversalLoops("a", "a", [a])).toBe(true)
  })

  it("refuses a link back along the chain", () => {
    // c would reverse b, which reverses a, which already reverses c.
    expect(reversalLoops("c", "b", [a, b, c])).toBe(true)
    expect(reversalLoops("b", "c", [a, b, c])).toBe(false)
  })

  it("leaves loop-closing entries out of the candidates, nearest date first", () => {
    const near = entry("near", { date: "2026-03-11" })
    const far = entry("far", { date: "2025-01-01" })
    const ids = reversalCandidates("c", "2026-03-10", [a, b, c, near, far]).map(
      (e) => e.id
    )
    // c itself, and a and b which already lead back to c, are excluded.
    expect(ids).toEqual(["near", "far"])
  })
})

describe("the CSV cell", () => {
  it("writes and reads #number/year", () => {
    expect(reversalKey(entry("a", { voucher: 12 }))).toBe("#12/2026")
    expect(reversalKey(entry("a", { voucher: undefined }))).toBe("")
    expect(parseReversalKey("#12/2026")).toEqual({ year: 2026, voucher: 12 })
    expect(parseReversalKey("12/2026")).toEqual({ year: 2026, voucher: 12 })
    expect(parseReversalKey("0/2026")).toBeNull()
    expect(parseReversalKey("soon")).toBeNull()
  })

  it("round-trips a link, across years, through serialize and parse", () => {
    const invoice = entry("a", { voucher: 4, date: "2025-12-20" })
    const credit = entry("b", {
      voucher: 1,
      date: "2026-01-05",
      amount: -10000,
      reverses: "a",
    })
    const text = serializeCsv([invoice, credit], cats)
    expect(text).toContain("#4/2025")

    const result = parseCsv(text, baseCats)
    if (!result.ok) throw new Error(result.code)
    const read = result.entries
    const target = read.find((e) => e.voucher === 4)
    const source = read.find((e) => e.voucher === 1)
    expect(source?.reverses).toBe(target?.id)
    expect(target?.reverses).toBeUndefined()
    expect(result.warnings.some((w) => w.code === "reverses-dissolved")).toBe(
      false
    )
  })

  it("writes nothing for a target that is gone", () => {
    const credit = entry("b", { voucher: 1, reverses: "missing" })
    const text = serializeCsv([credit], cats)
    expect(text).not.toContain("#")
  })

  it("drops a cell that names nothing, itself or a loop, and counts it", () => {
    const header = "voucher;date;description;type;amount;reverses"
    const rows = [
      "1;2026-03-01;A;tulo;100,00;#2/2026",
      "2;2026-03-02;B;tulo;100,00;#1/2026",
      "3;2026-03-03;C;tulo;100,00;#3/2026",
      "4;2026-03-04;D;tulo;100,00;#99/2026",
      "5;2026-03-05;E;tulo;100,00;nonsense",
    ]
    const result = parseCsv([header, ...rows].join("\n"), baseCats)
    if (!result.ok) throw new Error(result.code)
    const byVoucher = new Map(result.entries.map((e) => [e.voucher, e]))
    // 1 -> 2 is kept; 2 -> 1 would close the loop; 3 -> 3, 4 -> 99, 5 -> junk.
    expect(byVoucher.get(1)?.reverses).toBe(byVoucher.get(2)?.id)
    expect(byVoucher.get(2)?.reverses).toBeUndefined()
    expect(byVoucher.get(3)?.reverses).toBeUndefined()
    expect(byVoucher.get(4)?.reverses).toBeUndefined()
    expect(byVoucher.get(5)?.reverses).toBeUndefined()
    expect(result.warnings).toContainEqual({
      code: "reverses-dissolved",
      rows: 4,
    })
  })
})
