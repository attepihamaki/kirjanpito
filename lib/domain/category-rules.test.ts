import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { BankRow } from "@/lib/domain/bank-csv"
import { proposeForRows } from "@/lib/domain/bank-match"
import {
  findCategoryRule,
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
