import { describe, expect, it } from "vitest"

import rulesJson from "@/data/rules.json"
import {
  LIMIT_KEYS,
  RULES,
  limitOn,
  parseRuleTables,
  ruleGaps,
} from "@/lib/domain/rule-tables"

type Raw = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** A copy of the shipped file with one mistake made in it. */
function broken(change: (raw: Raw) => void): unknown {
  const raw = structuredClone(rulesJson) as Raw
  change(raw)
  return raw
}

describe("the shipped tables", () => {
  it("parse, and give every limit a value", () => {
    for (const key of LIMIT_KEYS) {
      expect(RULES.limits[key].length).toBeGreaterThan(0)
    }
    expect(RULES.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("keep the figures the rest of the app relies on", () => {
    expect(limitOn("vatThreshold", "2026-06-01")).toBe(2_000_000)
    expect(limitOn("privateUseFree", "2026-06-01")).toBe(85_000)
    expect(limitOn("depreciationPercent", "2026-06-01")).toBe(25)
  })
})

describe("limitOn", () => {
  const tables = parseRuleTables(
    broken((raw) => {
      raw.limits.vatThreshold = [
        { from: null, value: 1_500_000, source: "old" },
        { from: "2025-01-01", value: 2_000_000, source: "new" },
      ]
    })
  )

  it("takes the value in force on the date", () => {
    expect(limitOn("vatThreshold", "2024-12-31", tables)).toBe(1_500_000)
    expect(limitOn("vatThreshold", "2025-01-01", tables)).toBe(2_000_000)
    expect(limitOn("vatThreshold", "2030-01-01", tables)).toBe(2_000_000)
  })

  it("gives the first value to a date before the first dated one", () => {
    const only = parseRuleTables(rulesJson)
    expect(limitOn("vatThreshold", "2000-01-01", only)).toBe(2_000_000)
  })
})

describe("parseRuleTables", () => {
  it("names the value that does not fit", () => {
    expect(() =>
      parseRuleTables(broken((raw) => (raw.travel[0].km = 0.57)))
    ).toThrow("travel[0].km")
    expect(() =>
      parseRuleTables(broken((raw) => (raw.form5Due[0].due = "1.4.2026")))
    ).toThrow("form5Due[0].due")
    expect(() =>
      parseRuleTables(broken((raw) => delete raw.limits.privateUseFree))
    ).toThrow("limits.privateUseFree")
  })

  it("wants a source on every value", () => {
    expect(() =>
      parseRuleTables(broken((raw) => (raw.homeOffice[0].source = " ")))
    ).toThrow("homeOffice[0].source")
  })

  it("wants years in order with none twice", () => {
    expect(() =>
      parseRuleTables(
        broken((raw) => raw.travel.push({ ...raw.travel[0], year: 2024 }))
      )
    ).toThrow("travel[4]")
  })

  it("lets only the first dated value have no start", () => {
    expect(() =>
      parseRuleTables(
        broken((raw) =>
          raw.limits.vatThreshold.push({ from: null, value: 1, source: "x" })
        )
      )
    ).toThrow("limits.vatThreshold[1].from")
  })
})

describe("ruleGaps", () => {
  it("is empty while the year is covered", () => {
    expect(ruleGaps("2026-11-05")).toEqual([])
  })

  it("lists what the new year lacks", () => {
    expect(ruleGaps("2027-01-01")).toEqual([
      "homeOffice",
      "incomeTax",
      "form5Due",
    ])
  })

  it("lists travel too once its year runs out", () => {
    expect(ruleGaps("2028-01-01")).toEqual([
      "travel",
      "homeOffice",
      "incomeTax",
      "form5Due",
    ])
  })
})
