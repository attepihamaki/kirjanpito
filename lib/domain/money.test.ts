import { describe, expect, it } from "vitest"

import {
  formatAmountForCsv,
  formatFileSize,
  formatMoney,
  formatMoneyPlain,
  formatRate,
  MINUS,
  NBSP,
  parseAmount,
  parseRate,
  roundCents,
  sumCents,
} from "@/lib/domain/money"

describe("Intl availability", () => {
  /*
   * If this fails, the runtime is a small-ICU build and every format
   * assertion below will fail for the same reason.
   */
  it("has full ICU with Finnish locale data", () => {
    expect(Intl.NumberFormat.supportedLocalesOf(["fi-FI"])).toEqual(["fi-FI"])
  })
})

describe("roundCents", () => {
  it("rounds half away from zero", () => {
    expect(roundCents(0.5)).toBe(1)
    expect(roundCents(1.4)).toBe(1)
  })

  it("normalises negative zero", () => {
    expect(Object.is(roundCents(-0.2), 0)).toBe(true)
    expect(Object.is(roundCents((-1 * 25.5) / 125.5), 0)).toBe(true)
  })
})

describe("formatMoney", () => {
  it("groups with NBSP and separates the euro sign with NBSP", () => {
    expect(formatMoney(123456)).toBe(`1${NBSP}234,56${NBSP}€`)
  })

  it("formats zero", () => {
    expect(formatMoney(0)).toBe(`0,00${NBSP}€`)
  })

  it("uses a Unicode minus for negatives", () => {
    expect(formatMoney(-76022)).toBe(`${MINUS}760,22${NBSP}€`)
  })

  it("never renders negative zero", () => {
    expect(formatMoney(roundCents(-0.2))).toBe(`0,00${NBSP}€`)
  })

  it("formats the §10 check figures", () => {
    expect(formatMoney(1250000)).toBe(`12${NBSP}500,00${NBSP}€`)
    expect(formatMoney(185747)).toBe(`1${NBSP}857,47${NBSP}€`)
    expect(formatMoney(76022)).toBe(`760,22${NBSP}€`)
    expect(formatMoney(36218)).toBe(`362,18${NBSP}€`)
  })
})

describe("formatMoneyPlain", () => {
  it("omits the euro sign", () => {
    expect(formatMoneyPlain(188250)).toBe(`1${NBSP}882,50`)
  })
})

describe("formatAmountForCsv", () => {
  it("uses a decimal comma and no grouping", () => {
    expect(formatAmountForCsv(188250)).toBe("1882,50")
    expect(formatAmountForCsv(123456789)).toBe("1234567,89")
  })

  it("uses an ASCII hyphen, never a Unicode minus", () => {
    expect(formatAmountForCsv(-5099)).toBe("-50,99")
    expect(formatAmountForCsv(-5099)).not.toContain(MINUS)
  })

  it("always writes two decimals", () => {
    expect(formatAmountForCsv(100)).toBe("1,00")
    expect(formatAmountForCsv(0)).toBe("0,00")
    expect(formatAmountForCsv(5)).toBe("0,05")
  })
})

describe("parseAmount", () => {
  it.each([
    ["1 234,56", 123456],
    [`1${NBSP}234,56`, 123456],
    ["1 234,56", 123456],
    ["1 234,56 €", 123456],
    [`${MINUS}1234,56`, -123456],
    ["-1234,56", -123456],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1234.5", 123450],
    [".5", 50],
    ["1 234 567,89", 123456789],
    ["0", 0],
  ])("parses %j as %i cents", (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  // "1,234" is one euro twenty-three, never 1234.
  it("treats a lone comma as a decimal comma regardless of language", () => {
    expect(parseAmount("1,234")).toBe(123)
  })

  it.each(["", "   ", "abc", "1,2,3", "--5"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull()
  })

  it("rejects null and undefined", () => {
    expect(parseAmount(null)).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
  })
})

describe("parseRate", () => {
  it.each([
    ["25,5", 25.5],
    ["25.5", 25.5],
    [" 14 % ", 14],
    ["0", 0],
  ])("parses %j as %f", (input, expected) => {
    expect(parseRate(input)).toBe(expected)
  })

  it.each(["", "abc", "  ", null])("rejects %j", (input) => {
    expect(parseRate(input)).toBeNull()
  })
})

describe("formatRate", () => {
  it("uses a comma and a space in Finnish", () => {
    expect(formatRate(25.5, "fi")).toBe(`25,5${NBSP}%`)
    expect(formatRate(0, "fi")).toBe(`0${NBSP}%`)
  })

  it("uses a point and no space in English", () => {
    expect(formatRate(25.5, "en")).toBe("25.5%")
  })
})

describe("formatFileSize", () => {
  it("uses kt/Mt in Finnish", () => {
    expect(formatFileSize(139000, "fi")).toBe(`136${NBSP}kt`)
    expect(formatFileSize(1572864, "fi")).toBe(`1,5${NBSP}Mt`)
  })

  it("uses KB/MB in English", () => {
    expect(formatFileSize(139000, "en")).toBe(`136${NBSP}KB`)
    expect(formatFileSize(1572864, "en")).toBe(`1.5${NBSP}MB`)
  })

  it("never reports zero kilobytes", () => {
    expect(formatFileSize(1, "fi")).toBe(`1${NBSP}kt`)
  })
})

describe("sumCents", () => {
  it("sums and normalises negative zero", () => {
    expect(sumCents([100, -40, 5])).toBe(65)
    expect(Object.is(sumCents([]), 0)).toBe(true)
  })
})
