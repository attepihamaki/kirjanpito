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
    }
  })
})
