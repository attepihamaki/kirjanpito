import { describe, expect, it } from "vitest"

import { parseBusinessId } from "@/lib/domain/business-id"

describe("parseBusinessId", () => {
  it.each([
    ["0112038-9", "0112038-9"],
    ["1234567-1", "1234567-1"],
    [" 0112038 - 9 ", "0112038-9"],
    ["01120389", "0112038-9"],
    ["FI01120389", "0112038-9"],
    ["fi0112038-9", "0112038-9"],
  ])("reads %s", (value, expected) => {
    expect(parseBusinessId(value)).toBe(expected)
  })

  it.each([
    "",
    "0112038-8",
    "112038-9",
    "01120389-0",
    "abcdefg-h",
    "SE01120389",
  ])("refuses %s", (value) => {
    expect(parseBusinessId(value)).toBeNull()
  })

  it("gives check digit 0 for a remainder of 0", () => {
    expect(parseBusinessId("0000000-0")).toBe("0000000-0")
  })

  it("refuses a remainder of 1 whatever the check digit", () => {
    expect(parseBusinessId("0000006-0")).toBeNull()
    expect(parseBusinessId("0000006-1")).toBeNull()
  })
})
