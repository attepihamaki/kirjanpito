import { describe, expect, it } from "vitest"

import {
  compactReference,
  finnishReference,
  formatReference,
  isFinnishReference,
  isRfReference,
  rfReference,
} from "@/lib/domain/invoice-reference"

describe("finnishReference", () => {
  it.each([
    ["123456", "1234561"],
    ["1001", "10016"],
    [1002, "10029"],
    ["100", "1009"],
  ])("gives %s the reference %s", (base, expected) => {
    expect(finnishReference(base)).toBe(expected)
  })

  it("gives a reference that isFinnishReference accepts, for every number in a series", () => {
    for (let n = 100; n < 3000; n += 1) {
      expect(isFinnishReference(finnishReference(n) as string)).toBe(true)
    }
  })

  it.each(["", "12", "12a45", "1".repeat(20), "-1001"])(
    "refuses the base %s",
    (base) => {
      expect(finnishReference(base)).toBeNull()
    }
  )

  it("takes 19 digits as the longest base", () => {
    expect(finnishReference("1".repeat(19))).toHaveLength(20)
  })
})

describe("isFinnishReference", () => {
  it("accepts a right check digit and refuses a wrong one", () => {
    expect(isFinnishReference("1234561")).toBe(true)
    expect(isFinnishReference("1234562")).toBe(false)
  })

  it("refuses a short, long or non-numeric text", () => {
    expect(isFinnishReference("123")).toBe(false)
    expect(isFinnishReference("1".repeat(21))).toBe(false)
    expect(isFinnishReference("12345a1")).toBe(false)
  })
})

describe("rfReference", () => {
  it("gives the check digits of a known reference", () => {
    expect(rfReference("539007547034")).toBe("RF18539007547034")
  })

  it("pads a one-digit check to two digits", () => {
    const reference = rfReference("1") as string
    expect(reference).toMatch(/^RF\d{2}1$/)
    expect(isRfReference(reference)).toBe(true)
  })

  it("round-trips through isRfReference", () => {
    for (let n = 1; n < 500; n += 1) {
      expect(isRfReference(rfReference(n) as string)).toBe(true)
    }
  })

  it.each(["", "a1", "1".repeat(22)])("refuses the base %s", (base) => {
    expect(rfReference(base)).toBeNull()
  })
})

describe("isRfReference", () => {
  it("refuses a wrong check", () => {
    expect(isRfReference("RF18539007547034")).toBe(true)
    expect(isRfReference("RF19539007547034")).toBe(false)
  })

  it("refuses letters in the body and a missing prefix", () => {
    expect(isRfReference("RF18ABC")).toBe(false)
    expect(isRfReference("18539007547034")).toBe(false)
  })
})

describe("formatReference", () => {
  it("groups a Finnish reference in fives from the right", () => {
    expect(formatReference("1234561")).toBe("12 34561")
    expect(formatReference("10016")).toBe("10016")
    expect(formatReference("1234567890")).toBe("12345 67890")
  })

  it("groups an RF reference in fours from the left", () => {
    expect(formatReference("RF18539007547034")).toBe("RF18 5390 0754 7034")
  })
})

describe("compactReference", () => {
  it("drops spaces and upper-cases", () => {
    expect(compactReference("rf18 5390 0754 7034")).toBe("RF18539007547034")
  })
})
