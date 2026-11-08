import { describe, expect, it } from "vitest"

import { formatIban, isFinnishIban, parseIban } from "@/lib/domain/iban"

describe("parseIban", () => {
  it("reads an IBAN with spaces and lower case", () => {
    expect(parseIban("fi21 1234 5600 0007 85")).toBe("FI2112345600000785")
  })

  it("accepts an IBAN of another country", () => {
    expect(parseIban("DE89 3704 0044 0532 0130 00")).toBe(
      "DE89370400440532013000"
    )
  })

  it.each([
    "",
    "FI2112345600000786",
    "FI21",
    "1234567890",
    "FI21 1234 5600 000",
  ])("refuses %s", (value) => {
    expect(parseIban(value)).toBeNull()
  })
})

describe("isFinnishIban", () => {
  it("is true for a valid Finnish IBAN", () => {
    expect(isFinnishIban("FI21 1234 5600 0007 85")).toBe(true)
  })

  it("is false for a valid IBAN of another country", () => {
    expect(isFinnishIban("DE89370400440532013000")).toBe(false)
  })

  it("is false for a bad check", () => {
    expect(isFinnishIban("FI2112345600000786")).toBe(false)
  })
})

describe("formatIban", () => {
  it("groups by four", () => {
    expect(formatIban("FI2112345600000785")).toBe("FI21 1234 5600 0007 85")
  })
})
