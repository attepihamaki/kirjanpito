import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END, type YearEnd } from "@/lib/domain/form5-balance"
import { form5File, type Form5FileInput } from "@/lib/domain/form5-file"
import { form5Report } from "@/lib/domain/form5-report"
import { FORM5_FIELDS } from "@/lib/domain/form5-spec"
import { parseHetu } from "@/lib/domain/hetu"
import { createIdFactory } from "@/lib/domain/id"
import { incomeStatement } from "@/lib/domain/income-statement"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())
const now = new Date(2026, 10, 7, 9, 5, 3)

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e1",
    date: "2026-05-05",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 10000,
    vatRate: 0,
    amountMode: "net",
    ...over,
  }
}

function make(
  entries: readonly Entry[],
  over: Partial<Form5FileInput> = {},
  yearEnd: Partial<YearEnd> = {}
) {
  const { sections, balance } = form5Report({
    statement: incomeStatement(entries, cats, 2026),
    entries,
    cats,
    year: 2026,
    yearEnd: { ...EMPTY_YEAR_END, ...yearEnd },
    assetOpening: null,
    loanOpening: null,
  })
  return form5File({
    year: 2026,
    sections,
    balance,
    businessId: "0112038-9",
    taxpayerId: "131052-308T",
    phone: null,
    now,
    ...over,
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

describe("parseHetu", () => {
  it("accepts a valid code and refuses a wrong check character", () => {
    expect(parseHetu("131052-308T")).toBe("131052-308T")
    expect(parseHetu("131052-308t")).toBe("131052-308T")
    expect(parseHetu("131052-308U")).toBeNull()
    expect(parseHetu("321052-308T")).toBeNull()
    expect(parseHetu("0112038-9")).toBeNull()
  })
})

describe("form5File", () => {
  it("writes the header, the fields in the specification's order and the end", () => {
    const result = make(sampleEntries(createIdFactory("t")), {
      phone: "040 123 4567",
    })
    if (!result.ok) throw new Error(result.reason)
    const lines = result.text.trim().split("\r\n")
    expect(lines.slice(0, 6)).toEqual([
      "000:VSY00526",
      "198:07112026090503",
      "048:Kirjanpito",
      "014:0112038-9_KP",
      "010:131052-308T",
      "054:01012026-31122026",
    ])
    expect(lines[6]).toBe("042:040 123 4567")
    expect(lines.at(-1)).toBe("999:1")

    const f = fields(result.text)
    expect(f.get("300")).toBe("12500,00")
    expect(f.get("316")).toBe("12500,00")
    expect(f.get("358")).toBe("10642,53")
    expect(f.get("359")).toBe("0,00")

    const order = FORM5_FIELDS.map((field) => String(field.code))
    const codes = lines.slice(7, -1).map((line) => line.split(":")[0])
    expect(codes).toEqual(order.filter((code) => f.has(code)))
  })

  it("leaves out zero fields but keeps a pair together", () => {
    const result = make([
      entry({ id: "a", type: "income", catId: "300", amount: 100000 }),
      entry({ id: "b", catId: "346", amount: 4000 }),
    ])
    if (!result.ok) throw new Error(result.reason)
    const f = fields(result.text)
    expect(f.has("333")).toBe(false)
    expect(f.get("346")).toBe("40,00")
    expect(f.get("347")).toBe("40,00")
    expect(f.get("358")).toBe("960,00")
    expect(f.get("359")).toBe("0,00")
  })

  it("writes an empty return as 969", () => {
    const result = make([])
    if (!result.ok) throw new Error(result.reason)
    expect(result.text).toBe(
      [
        "000:VSY00526",
        "198:07112026090503",
        "048:Kirjanpito",
        "014:0112038-9_KP",
        "010:131052-308T",
        "054:01012026-31122026",
        "969:1",
        "999:1",
        "",
      ].join("\r\n")
    )
  })

  it("writes the driving details beside 313", () => {
    const result = make(
      [
        entry({ id: "a", type: "income", catId: "300", amount: 1000000 }),
        entry({ id: "b", type: "income", catId: "313", amount: 100000 }),
      ],
      {},
      {
        carKmBusiness: 0,
        carKmPrivate: 2500,
        carCosts: 100000,
        carVehicle: 1,
        carBasis: 1,
      }
    )
    if (!result.ok) throw new Error(result.reason)
    const f = fields(result.text)
    expect(f.get("313")).toBe("1000,00")
    expect(f.get("382")).toBe("1000,00")
    expect(f.get("396")).toBe("1")
    expect(f.get("271")).toBe("0")
    expect(f.get("273")).toBe("2500")
    expect(f.get("274")).toBe("2500")
    expect(f.get("379")).toBe("1")
  })

  it("writes a business that is the taxpayer's own business ID", () => {
    const result = make([], { taxpayerId: "0112038-9" })
    expect(result.ok).toBe(true)
  })

  it("refuses without a business ID or with a bad taxpayer ID", () => {
    expect(make([], { businessId: null })).toEqual({
      ok: false,
      reason: "no-business-id",
    })
    expect(make([], { taxpayerId: "123" })).toEqual({
      ok: false,
      reason: "bad-taxpayer-id",
    })
  })

  it("refuses when a check of the specification fails, naming the codes", () => {
    const result = make([
      entry({ id: "b", type: "income", catId: "313", amount: 90000 }),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("checks")
    expect(result.codes).toContain(313)
  })

  it("refuses until the rate is given when negative equity makes interest non-deductible", () => {
    const entries = [
      entry({ id: "a", type: "income", catId: "300", amount: 1000000 }),
      entry({ id: "b", catId: "346", amount: 100000 }),
      entry({
        id: "l",
        type: "income",
        catId: "loan-drawdown",
        amount: 500000,
      }),
    ]
    expect(make(entries)).toEqual({ ok: false, reason: "interest-rate" })
    const given = make(entries, {}, { interestRate: 315 })
    if (!given.ok) throw new Error(given.reason)
    const f = fields(given.text)
    expect(f.get("653")).toBe("3,15")
    expect(f.has("383")).toBe(true)
    expect(f.has("747")).toBe(true)
  })

  it("lists no remarks for a clean return", () => {
    const clean = make([
      entry({ id: "a", type: "income", catId: "300", amount: 100000 }),
    ])
    expect(clean.ok && clean.warnings).toEqual([])
  })
})
