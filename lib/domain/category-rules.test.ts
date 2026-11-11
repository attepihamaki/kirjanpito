import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { BankRow } from "@/lib/domain/bank-csv"
import { proposeForRows } from "@/lib/domain/bank-match"
import {
  findCategoryRule,
  ruleForBankRow,
  ruleMatches,
  type CategoryRule,
} from "@/lib/domain/category-rules"
import { parseSettings } from "@/lib/domain/settings-file"
import { indexCategories } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

const rule = (over: Partial<CategoryRule>): CategoryRule => ({
  id: "r",
  contains: "elisa",
  catId: "344-other",
  vatRate: 25.5,
  ...over,
})

function row(over: Partial<BankRow>): BankRow {
  return {
    date: "2026-10-28",
    amount: -2_990,
    counterparty: "",
    message: "",
    reference: "",
    kind: "TILISIIRTO",
    ...over,
  }
}

describe("ruleMatches", () => {
  it("ignores case, accents and punctuation", () => {
    expect(ruleMatches(rule({ contains: "makinen" }), "MÄKINEN Oy")).toBe(true)
    expect(ruleMatches(rule({ contains: "k-rauta" }), "K RAUTA Oulu")).toBe(
      true
    )
  })

  it("never matches on a single character", () => {
    expect(ruleMatches(rule({ contains: "e" }), "Elisa")).toBe(false)
  })
})

describe("findCategoryRule", () => {
  it("takes the first matching rule in order", () => {
    const rules = [
      rule({ id: "a", contains: "elisa oyj", catId: "334", vatRate: null }),
      rule({ id: "b" }),
    ]
    expect(findCategoryRule(rules, "Elisa Oyj lasku", cats)?.rule.id).toBe("a")
    expect(findCategoryRule(rules, "Elisa Mobiili", cats)?.rule.id).toBe("b")
  })

  it("skips a rule whose category is missing, off or on the wrong side", () => {
    const off = new Map(cats)
    off.set("344-other", { ...cats.get("344-other")!, enabled: false })
    expect(findCategoryRule([rule({})], "Elisa", off)).toBeNull()
    expect(
      findCategoryRule([rule({ catId: "nope" })], "Elisa", cats)
    ).toBeNull()
    expect(findCategoryRule([rule({})], "Elisa", cats, "income")).toBeNull()
  })
})

describe("bank import with rules", () => {
  it("proposes the rule's category and rate for a new entry", () => {
    const [p] = proposeForRows([row({ counterparty: "ELISA OYJ" })], {
      entries: [],
      cats,
      rules: [rule({})],
    })
    expect(p.kind).toBe("new")
    if (p.kind === "new") {
      expect(p.draft.catId).toBe("344-other")
      expect(p.draft.vatRate).toBe(25.5)
    }
  })

  it("leaves the rate open when the rule has none", () => {
    const [p] = proposeForRows([row({ message: "Elisa" })], {
      entries: [],
      cats,
      rules: [rule({ vatRate: null })],
    })
    if (p.kind === "new") expect(p.draft.vatRate).toBeNull()
  })

  it("beats the book's history", () => {
    const [p] = proposeForRows([row({ counterparty: "Elisa" })], {
      entries: [
        {
          id: "e",
          date: "2026-09-01",
          description: "Elisa lasku",
          type: "expense",
          catId: "333",
          amount: 1000,
          vatRate: 0,
          amountMode: "gross",
          paidOn: "2026-09-01",
        },
      ],
      cats,
      rules: [rule({})],
    })
    if (p.kind === "new") expect(p.draft.catId).toBe("344-other")
  })
})

describe("settings file", () => {
  it("round-trips rules and drops bad ones", () => {
    const text = JSON.stringify({
      version: 1,
      categoryRules: [
        { id: "a", contains: "Elisa", catId: "344-other", vatRate: 25.5 },
        { id: "b", contains: "Neste", catId: "344-vehicle" },
        { id: "c", contains: "x", catId: "344-other", vatRate: null },
        { id: "d", contains: "Telia", catId: "344-other", vatRate: 250 },
      ],
    })
    const parsed = parseSettings(text)
    expect(parsed.categoryRules).toEqual([
      { id: "a", contains: "Elisa", catId: "344-other", vatRate: 25.5 },
      { id: "b", contains: "Neste", catId: "344-vehicle", vatRate: null },
    ])
  })
})

describe("rules on the account and the reference", () => {
  const ibanRule = rule({ contains: "FI2112345600000785", field: "iban" })
  const refRule = rule({ contains: "1234", field: "reference" })

  it("matches the other party's IBAN, in any spacing", () => {
    expect(
      ruleMatches(ibanRule, { text: "", iban: "fi21 1234 5600 0007 85" })
    ).toBe(true)
    expect(ruleMatches(ibanRule, { text: "FI2112345600000785" })).toBe(false)
    expect(ruleMatches(ibanRule, "FI2112345600000785")).toBe(false)
  })

  it("matches the start of the reference", () => {
    expect(ruleMatches(refRule, { text: "", reference: "1234 5674" })).toBe(
      true
    )
    expect(ruleMatches(refRule, { text: "", reference: "9123 4" })).toBe(false)
  })

  it("never matches an invalid IBAN or a one-character reference", () => {
    expect(
      ruleMatches(rule({ contains: "FI0012345600000785", field: "iban" }), {
        text: "",
        iban: "FI0012345600000785",
      })
    ).toBe(false)
    expect(
      ruleMatches(rule({ contains: "1", field: "reference" }), {
        text: "",
        reference: "1234",
      })
    ).toBe(false)
  })

  it("lets the bank import pick a category by account when the name differs", () => {
    const [p] = proposeForRows(
      [
        row({
          counterparty: "ELISA OYJ / LASKUTUS",
          iban: "FI2112345600000785",
        }),
      ],
      {
        entries: [],
        cats,
        rules: [rule({ id: "t", contains: "telia" }), ibanRule],
      }
    )
    if (p.kind !== "new") throw new Error(p.kind)
    expect(p.draft.catId).toBe("344-other")
  })

  it("lets the bank import pick a category by reference", () => {
    const [p] = proposeForRows([row({ reference: "12345674" })], {
      entries: [],
      cats,
      rules: [refRule],
    })
    if (p.kind !== "new") throw new Error(p.kind)
    expect(p.draft.catId).toBe("344-other")
  })
})

describe("ruleForBankRow", () => {
  it("prefers the account and falls back to the name", () => {
    expect(
      ruleForBankRow(
        { counterparty: "Elisa", iban: "FI2112345600000785" },
        "344-other"
      )
    ).toEqual({
      contains: "FI2112345600000785",
      field: "iban",
      catId: "344-other",
      vatRate: null,
    })
    expect(ruleForBankRow({ counterparty: " Elisa " }, "344-other")).toEqual({
      contains: "Elisa",
      catId: "344-other",
      vatRate: null,
    })
    expect(ruleForBankRow({ counterparty: "" }, "344-other")).toBeNull()
  })
})

describe("settings file, rule fields", () => {
  it("keeps the field, stores the value compact and drops unusable ones", () => {
    const parsed = parseSettings(
      JSON.stringify({
        version: 1,
        categoryRules: [
          {
            id: "a",
            contains: "FI21 1234 5600 0007 85",
            field: "iban",
            catId: "344-other",
          },
          {
            id: "b",
            contains: "rf18 5390",
            field: "reference",
            catId: "344-other",
          },
          { id: "c", contains: "FI00 1234", field: "iban", catId: "344-other" },
          { id: "d", contains: "Elisa", field: "name", catId: "344-other" },
          { id: "e", contains: "Elisa", field: "text", catId: "344-other" },
        ],
      })
    )
    expect(parsed.categoryRules).toEqual([
      {
        id: "a",
        contains: "FI2112345600000785",
        field: "iban",
        catId: "344-other",
        vatRate: null,
      },
      {
        id: "b",
        contains: "RF185390",
        field: "reference",
        catId: "344-other",
        vatRate: null,
      },
      { id: "e", contains: "Elisa", catId: "344-other", vatRate: null },
    ])
  })
})
