import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  DEFAULT_LAYOUT,
  moveWidget,
  normalizeLayout,
  stepWidget,
} from "@/lib/domain/overview-layout"
import {
  SETTINGS_VERSION,
  mergeCategories,
  parseSettings,
  serializeSettings,
  type BookSettings,
} from "@/lib/domain/settings-file"

function settings(): BookSettings {
  const categories = defaultCategories()
  categories[0] = { ...categories[0], enabled: false, vatRate: 24 }
  categories.push({
    id: "c-abc",
    line: "334",
    name: "Ohjelmistot",
    vatRate: 25.5,
    euPurchase: "services",
    enabled: true,
    custom: true,
  })
  return {
    language: "en",
    theme: "dark",
    encrypted: true,
    exportLang: "en",
    businessId: "0112038-9",
    businessName: "Oma Oy",
    businessPhone: null,
    vatPeriod: "quarter",
    traderType: "business",
    hiddenFeatures: ["car", "euSales"],
    bookStart: "2025-10",
    vatFiled: { "2026-Q2": "2026-08-10", "2026-Q1": "2026-05-11" },
    vatFiledFigures: {
      "2026-Q1": { "301": 12_000, "308": -4_500, "311/312": 800 },
    },
    taxPayment: { iban: "FI21 1234 5600 0007 85", reference: "1234567" },
    yearsArchived: { "2025": "2026-01-20" },
    form5Filed: { "2025": "2026-03-20" },
    archives: {
      "2024": { file: "kirjanpito-2024.zip", on: "2025-03-01", entries: 42 },
    },
    archiveOf: 2025,
    recurring: [
      {
        id: "r1",
        description: "Vuokra",
        type: "expense",
        catId: "343",
        amount: 45_000,
        vatRate: 25.5,
        amountMode: "gross",
        day: 20,
        from: "2026-02",
      },
    ],
    categoryRules: [
      { id: "k1", contains: "Elisa", catId: "344-other", vatRate: 25.5 },
      { id: "k2", contains: "Neste", catId: "344-vehicle", vatRate: null },
    ],
    assetOpening: { year: 2026, amount: 300_000 },
    bankBalance: { amount: -12_345, date: "2026-10-31" },
    payMonths: {
      yel: [1, 7],
      advanceTax: [2, 4, 6],
      advanceTaxYearly: { "2026": 360_000 },
      taxRate: 22.5,
    },
    loanOpening: { year: 2026, amount: 800_000 },
    changeLog: [{ at: "2026-11-03T10:00:00.000Z", action: "add", voucher: 1 }],
    yearEnd: { "2026": { ...EMPTY_YEAR_END, goods: 120_000, cash: 3_500 } },
    overviewLayout: normalizeLayout([
      { id: "checks", size: "L", hidden: false },
    ]),
    autosave: true,
    categories,
    pageSize: { ledger: 25, categories: 50 },
  }
}

describe("settings.json", () => {
  it("round-trips every field", () => {
    const s = settings()
    expect(parseSettings(serializeSettings(s))).toEqual(s)
  })

  it("writes a version and sorts the filed marks", () => {
    const text = serializeSettings(settings())
    const json = JSON.parse(text)
    expect(json.version).toBe(1)
    expect(Object.keys(json.vatFiled)).toEqual(["2026-Q1", "2026-Q2"])
    expect(text.endsWith("\n")).toBe(true)
  })

  it("reads nothing from a file that is not JSON or not an object", () => {
    expect(parseSettings("not json")).toEqual({})
    expect(parseSettings("[1, 2]")).toEqual({})
  })

  it("keeps a trimmed phone and drops a blank one", () => {
    expect(
      parseSettings(JSON.stringify({ businessPhone: " 09 1234567 " }))
        ?.businessPhone
    ).toBe("09 1234567")
    expect(
      parseSettings(JSON.stringify({ businessPhone: "  " }))?.businessPhone
    ).toBeUndefined()
  })

  it("keeps the known hidden features and drops the rest", () => {
    const parsed = parseSettings(
      JSON.stringify({ hiddenFeatures: ["car", "boat", 3, "loans"] })
    )
    expect(parsed.hiddenFeatures).toEqual(["car", "loans"])
  })

  it("leaves hiddenFeatures unset when the file has none", () => {
    expect(parseSettings(JSON.stringify({})).hiddenFeatures).toBeUndefined()
  })

  it("drops a bad value and keeps the rest", () => {
    const parsed = parseSettings(
      JSON.stringify({
        language: "sv",
        theme: "dark",
        exportLang: "sv",
        businessId: "0112038-8",
        businessName: "  ",
        vatPeriod: "week",
        traderType: "hobbyist",
        bookStart: "2026-13",
        vatFiled: { "2026-09": "2026-11-10", "2026-13": "2026-01-01", x: 1 },
        yearsArchived: { "2025": "2026-01-20", "25": "2026-01-20", "2024": 1 },
        pageSize: { ledger: 7, categories: 25 },
      })
    )
    expect(parsed).toEqual({
      theme: "dark",
      vatFiled: { "2026-09": "2026-11-10" },
      yearsArchived: { "2025": "2026-01-20" },
    })
  })

  it("keeps only whole-cent amounts under real field codes for the filed figures", () => {
    const parsed = parseSettings(
      JSON.stringify({
        vatFiledFigures: {
          "2026-09": { "301": 100, "308": -50, "9": 5, "303": 1.5, "302": 0 },
          "2026-13": { "301": 1 },
          x: { "301": 1 },
        },
        taxPayment: { iban: "  FI21  ", reference: 7 },
      })
    )
    expect(parsed).toEqual({
      vatFiledFigures: { "2026-09": { "301": 100, "308": -50 } },
      taxPayment: { iban: "FI21", reference: "" },
    })
  })

  it("keeps only whole months, once each, for the payment months", () => {
    const parsed = parseSettings(
      JSON.stringify({
        version: 1,
        payMonths: { yel: [7, 7, 0, 13, 1.5, "3", 1], advanceTax: "x" },
      })
    )
    expect(parsed.payMonths).toEqual({
      yel: [1, 7],
      advanceTax: [],
      advanceTaxYearly: {},
      taxRate: null,
    })
  })

  it("keeps a positive whole-cent decision per year and a non-negative rate", () => {
    const parsed = parseSettings(
      JSON.stringify({
        version: 1,
        payMonths: {
          advanceTaxYearly: {
            "2026": 120_000,
            "26": 5,
            "2025": -1,
            "2024": 1.5,
          },
          taxRate: -3,
        },
      })
    )
    expect(parsed.payMonths?.advanceTaxYearly).toEqual({ "2026": 120_000 })
    expect(parsed.payMonths?.taxRate).toBeNull()
  })

  it("ignores keys it does not know", () => {
    expect(parseSettings(JSON.stringify({ future: true }))).toEqual({})
  })

  /*
   * Reading stays lenient — a newer file still opens — but the loss is said
   * out loud rather than left for the user to discover (§8).
   */
  it("flags a file written by a newer version", () => {
    expect(parseSettings(JSON.stringify({ version: 9, future: true }))).toEqual(
      { fromNewerVersion: true }
    )
    expect(
      parseSettings(JSON.stringify({ version: SETTINGS_VERSION }))
        .fromNewerVersion
    ).toBe(undefined)
  })

  /*
   * Absent means "the file did not say", which leaves the book's own export
   * language alone. A file that names one must be saved back in it (§7.1).
   */
  it("leaves out an export language the file does not give", () => {
    expect(parseSettings(JSON.stringify({ theme: "dark" })).exportLang).toBe(
      undefined
    )
    expect(parseSettings(JSON.stringify({ exportLang: "en" }))).toEqual({
      exportLang: "en",
    })
  })
})

describe("mergeCategories", () => {
  it("adds defaults an older file lacks and keeps the retired one disabled", () => {
    const old = defaultCategories()
      .filter((c) => !c.id.startsWith("300-eu-"))
      .map((c) => (c.id === "300-eu" ? { ...c, enabled: true } : c))
    const byId = new Map(mergeCategories(old).map((c) => [c.id, c]))
    expect(byId.get("300-eu-goods")?.enabled).toBe(true)
    expect(byId.get("300-eu-services")?.enabled).toBe(true)
    expect(byId.get("300-eu")?.enabled).toBe(false)
  })

  it("keeps the chart of accounts and takes only the user's choices", () => {
    const merged = mergeCategories([
      {
        id: "333",
        line: "301",
        name: "Renamed",
        vatRate: 14,
        enabled: false,
        custom: false,
      },
    ])
    const c333 = merged.find((c) => c.id === "333")
    const original = defaultCategories().find((c) => c.id === "333")
    expect(c333).toEqual({ ...original, enabled: false, vatRate: 14 })
    expect(merged).toHaveLength(defaultCategories().length)
  })

  it("brings custom categories across and puts back missing defaults", () => {
    const merged = mergeCategories([
      {
        id: "c-1",
        line: "334",
        name: "Ohjelmistot",
        vatRate: 25.5,
        enabled: true,
        custom: true,
      },
    ])
    expect(merged.at(-1)?.id).toBe("c-1")
    expect(merged).toHaveLength(defaultCategories().length + 1)
  })

  it("skips a category whose line is not in the chart of accounts", () => {
    const parsed = parseSettings(
      JSON.stringify({
        categories: [
          {
            id: "c-1",
            line: "999",
            name: "X",
            vatRate: 0,
            enabled: true,
            custom: true,
          },
        ],
      })
    )
    expect(parsed.categories).toEqual(defaultCategories())
  })
})

describe("overview layout", () => {
  it("fills in every widget once, in the stored order", () => {
    const layout = normalizeLayout([
      { id: "checks", size: "L", hidden: true },
      { id: "nope" },
      { id: "checks", size: "S" },
      { id: "vat", size: "huge" },
    ])
    expect(layout.slice(0, 2)).toEqual([
      { id: "checks", size: "L", hidden: true },
      { id: "vat", size: "S", hidden: false },
    ])
    expect(layout.map((w) => w.id).sort()).toEqual(
      DEFAULT_LAYOUT.map((w) => w.id).sort()
    )
  })

  it("puts a missing widget after the one it follows by default", () => {
    const ids = normalizeLayout([
      { id: "checks", size: "S", hidden: false },
      { id: "result", size: "L", hidden: false },
      { id: "vat", size: "S", hidden: false },
      { id: "months", size: "L", hidden: false },
      { id: "sales", size: "S", hidden: false },
      { id: "expenses", size: "S", hidden: false },
      { id: "recent", size: "L", hidden: false },
    ]).map((w) => w.id)
    expect(ids).toEqual([
      "checks",
      "result",
      "vat",
      "bank",
      "months",
      "sales",
      "expenses",
      "recent",
    ])
  })

  it("keeps the stored first widget first when the default's first is missing", () => {
    const ids = normalizeLayout(
      DEFAULT_LAYOUT.filter((w) => w.id !== "result")
    ).map((w) => w.id)
    expect(ids[0]).toBe("vat")
    expect(ids.at(-1)).toBe("result")
  })

  it("returns the default for something that is not a list", () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
  })

  it("moves a widget onto another's place", () => {
    const ids = moveWidget(DEFAULT_LAYOUT, "checks", "result").map((w) => w.id)
    expect(ids.slice(0, 2)).toEqual(["checks", "result"])
  })

  it("steps over hidden widgets", () => {
    const layout = DEFAULT_LAYOUT.map((w) =>
      w.id === "vat" || w.id === "bank" ? { ...w, hidden: true } : w
    )
    const ids = stepWidget(layout, "result", 1).map((w) => w.id)
    expect(ids.indexOf("months")).toBeLessThan(ids.indexOf("result"))
    expect(stepWidget(layout, "result", -1)).toEqual(layout)
  })
})

describe("change log records", () => {
  const AT = "2026-11-03T10:00:00.000Z"
  const read = (changeLog: unknown) =>
    parseSettings(JSON.stringify({ changeLog })).changeLog

  it("rebuilds each record from the fields it may hold", () => {
    expect(
      read([
        {
          at: AT,
          action: "edit",
          entryId: "e",
          voucher: 1,
          description: { a: 1 },
          changes: [
            { field: "amount", from: 100, to: 200 },
            { field: "amount", from: { a: 1 }, to: 2 },
            { field: "nope", from: 1, to: 2 },
          ],
        },
      ])
    ).toEqual([
      {
        at: AT,
        action: "edit",
        entryId: "e",
        voucher: 1,
        changes: [{ field: "amount", from: 100, to: 200 }],
      },
    ])
  })

  it("drops a record whose time cannot be read", () => {
    expect(read([{ at: "x", action: "add" }])).toEqual([])
  })

  it("drops an edit's changes that are not a list", () => {
    expect(read([{ at: AT, action: "edit", changes: "oops" }])).toEqual([
      { at: AT, action: "edit" },
    ])
  })

  it("keeps an action this version does not know", () => {
    expect(read([{ at: AT, action: "archive" }])).toEqual([
      { at: AT, action: "archive" },
    ])
  })
})
