import { describe, expect, it } from "vitest"

import { defineRules, evaluate, type Rule } from "@/lib/domain/rules/engine"

const even: Rule<number, number> = {
  id: "even",
  severity: "warn",
  source: "test",
  check: (n) => (n % 2 === 0 ? [] : [n]),
}
const small: Rule<number, number> = {
  id: "small",
  severity: "blocker",
  source: "test",
  check: (n) => (n < 10 ? [] : [n, n * 2]),
}

describe("rule engine", () => {
  it("returns one finding per breach, in rule order", () => {
    const set = defineRules([even, small])
    expect(evaluate(set, 11).map((f) => [f.ruleId, f.data])).toEqual([
      ["even", 11],
      ["small", 11],
      ["small", 22],
    ])
    expect(evaluate(set, 4)).toEqual([])
  })

  it("carries the severity and source of the rule", () => {
    const [finding] = evaluate(defineRules([small]), 12)
    expect(finding).toMatchObject({ severity: "blocker", source: "test" })
  })

  it("runs only the named rules", () => {
    const set = defineRules([even, small])
    expect(evaluate(set, 11, ["small"]).map((f) => f.ruleId)).toEqual([
      "small",
      "small",
    ])
  })

  it("refuses duplicate ids and unknown lookups", () => {
    expect(() => defineRules([even, even])).toThrow(/Duplicate/)
    expect(() => defineRules([even]).get("nope")).toThrow(/Unknown/)
  })
})
