import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { filterPeriod } from "@/lib/domain/period"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  asPeriod,
  vatPeriods,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"
import { vatFilePhone, vatReturnFile } from "@/lib/domain/vat-file"

const cats = indexCategories(defaultCategories())
const sample = sampleEntries(createIdFactory("t"))
const now = new Date(2026, 10, 7, 9, 5, 3)

function make(
  entries: readonly Entry[],
  kind: VatPeriodKind,
  index: number,
  over: { businessId?: string | null; phone?: string | null } = {}
) {
  const period = vatPeriods(kind, 2026)[index - 1]
  const report = vatReport(filterPeriod(entries, asPeriod(period)), cats)
  return vatReturnFile({
    report,
    period,
    businessId: "businessId" in over ? (over.businessId ?? null) : "0112038-9",
    phone: over.phone ?? null,
    now,
  })
}

function fields(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of text.trim().split("\r\n")) {
    const i = line.indexOf(":")
    out.set(line.slice(0, i), line.slice(i + 1))
  }
  return out
}

function entry(over: Partial<Entry>): Entry {
  return {
    id: "x",
    date: "2026-05-05",
    description: "Testi",
    type: "income",
    catId: "300-domestic",
    amount: 10000,
    vatRate: 25.5,
    amountMode: "net",
    ...over,
  }
}

describe("vatReturnFile", () => {
  it("opens with 000 and closes with 999, one code:value per line", () => {
    const r = make(sample, "month", 10)
    if (!r.ok) throw new Error(r.reason)
    const lines = r.text.trim().split("\r\n")
    expect(lines[0]).toBe("000:VSRALVKV")
    expect(lines.at(-1)).toBe("999:1")
    expect(r.text.endsWith("\r\n")).toBe(true)
    for (const line of lines) expect(line).toMatch(/^\d{3}:.+$/)
  })

  it("writes the header fields the specification requires", () => {
    const r = make(sample, "month", 10)
    if (!r.ok) throw new Error(r.reason)
    const f = fields(r.text)
    expect(f.get("198")).toBe("07112026090503")
    expect(f.get("048")).toBe("Kirjanpito")
    expect(f.get("014")).toBe("0112038-9_KP")
    expect(f.get("010")).toBe("0112038-9")
    expect(f.get("050")).toBe("K")
    expect(f.get("052")).toBe("10")
    expect(f.get("053")).toBe("2026")
    expect(r.fileName).toBe("VSRALVKV-0112038-9-2026-10.txt")
  })

  it("writes amounts with a decimal comma and the §10 October figures", () => {
    const r = make(sample, "month", 10)
    if (!r.ok) throw new Error(r.reason)
    const f = fields(r.text)
    expect(f.get("301")).toBe("382,50")
    expect(f.get("307")).toBe("20,32")
    expect(f.get("308")).toBe("362,18")
    expect(f.has("056")).toBe(false)
  })

  // Check #1924: 308 is 301 to 306 and 318, minus 307.
  it("satisfies check #1924", () => {
    const r = make(sample, "year", 1)
    if (!r.ok) throw new Error(r.reason)
    const f = fields(r.text)
    const n = (c: string) => Number((f.get(c) ?? "0").replace(",", "."))
    const tax = ["301", "302", "303", "304", "305", "306", "318"].reduce(
      (a, c) => a + n(c),
      0
    )
    expect(Math.round((tax - n("307")) * 100)).toBe(Math.round(n("308") * 100))
  })

  it("leaves 052 out of a yearly return and numbers a quarter", () => {
    const y = make(sample, "year", 1)
    const q = make(sample, "quarter", 4)
    if (!y.ok || !q.ok) throw new Error("blocked")
    expect(fields(y.text).get("050")).toBe("V")
    expect(fields(y.text).has("052")).toBe(false)
    expect(fields(q.text).get("050")).toBe("Q")
    expect(fields(q.text).get("052")).toBe("4")
  })

  it("writes a refund as a negative 308", () => {
    const r = make(
      [entry({ type: "expense", catId: "344-other", amount: 100000 })],
      "month",
      5
    )
    if (!r.ok) throw new Error(r.reason)
    expect(fields(r.text).get("308")).toMatch(/^-\d+,\d{2}$/)
  })

  it("makes a nil return with 056 and no amount fields", () => {
    const r = make([], "month", 3)
    if (!r.ok) throw new Error(r.reason)
    const f = fields(r.text)
    expect(f.get("056")).toBe("1")
    expect(f.has("301")).toBe(false)
    expect(f.has("308")).toBe(false)
  })

  it("adds 042 only when there is a phone", () => {
    const without = make(sample, "month", 10)
    const withPhone = make(sample, "month", 10, { phone: "09 1234567" })
    if (!without.ok || !withPhone.ok) throw new Error("blocked")
    expect(fields(without.text).has("042")).toBe(false)
    expect(fields(withPhone.text).get("042")).toBe("09 1234567")
  })

  it("refuses a period without a business ID", () => {
    expect(make(sample, "month", 10, { businessId: null })).toEqual({
      ok: false,
      reason: "no-business-id",
    })
  })

  it("refuses sales on the retired EU category", () => {
    const r = make([entry({ catId: "300-eu", vatRate: 0 })], "month", 5)
    expect(r).toEqual({ ok: false, reason: "eu-unsplit" })
  })
})

describe("vatFilePhone", () => {
  it("keeps digits, plus, hyphen and spaces", () => {
    expect(vatFilePhone(" +358 (0)9  123-4567 ")).toBe("+358 09 123-4567")
  })

  it("cuts to 35 characters", () => {
    expect(vatFilePhone("1".repeat(50))).toBe("1".repeat(35))
  })

  it("gives null for nothing usable", () => {
    expect(vatFilePhone("abc")).toBeNull()
    expect(vatFilePhone(null)).toBeNull()
  })
})
