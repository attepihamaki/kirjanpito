import { describe, expect, it } from "vitest"

import { formatQuantity, parseQuantity } from "@/lib/domain/invoice-input"

describe("parseQuantity", () => {
  it.each([
    ["2", 2000],
    ["1,5", 1500],
    ["0.25", 250],
    [" 12 ", 12_000],
    ["0,001", 1],
  ])("reads %s as %i thousandths", (text, milli) => {
    expect(parseQuantity(text)).toBe(milli)
  })

  it.each(["", "0", "0,000", "-1", "1,2345", "1,5 h", "abc", "1 000"])(
    "refuses %s",
    (text) => {
      expect(parseQuantity(text)).toBeNull()
    }
  )
})

describe("parseQuantity, signed", () => {
  it.each([
    ["-1", -1000],
    ["-1,5", -1500],
    ["\u22122", -2000],
  ])("reads %s as %i thousandths on a credit note", (text, milli) => {
    expect(parseQuantity(text, true)).toBe(milli)
  })

  it("refuses a positive or zero quantity on a credit note, and a negative one elsewhere", () => {
    expect(parseQuantity("1", true)).toBeNull()
    expect(parseQuantity("0", true)).toBeNull()
    expect(parseQuantity("-1")).toBeNull()
  })
})

describe("formatQuantity", () => {
  it("writes a decimal comma and no trailing zeros", () => {
    expect(formatQuantity(1500)).toBe("1,5")
    expect(formatQuantity(2000)).toBe("2")
    expect(formatQuantity(250)).toBe("0,25")
    expect(formatQuantity(12_000)).toBe("12")
  })

  it("round-trips what parseQuantity reads", () => {
    for (const milli of [1, 10, 100, 1500, 42_500, 999_999]) {
      expect(parseQuantity(formatQuantity(milli))).toBe(milli)
      expect(parseQuantity(formatQuantity(-milli), true)).toBe(-milli)
    }
  })

  it("writes a negative quantity with an ASCII minus", () => {
    expect(formatQuantity(-1500)).toBe("-1,5")
  })
})
