import { describe, expect, it } from "vitest"

import { memoFileName, toWinAnsi } from "@/lib/domain/memo-voucher"

describe("toWinAnsi", () => {
  it("keeps Finnish letters, the euro sign and no-break spaces", () => {
    expect(toWinAnsi("Työhuonevähennys 1\u00a0234,56 €")).toBe(
      "Työhuonevähennys 1\u00a0234,56 €"
    )
  })

  it("keeps the dashes and quotes WinAnsi has", () => {
    expect(toWinAnsi("Myynti – EU ”x” ’y’")).toBe("Myynti – EU ”x” ’y’")
  })

  it("writes the minus sign and narrow spaces as their nearest equivalent", () => {
    expect(toWinAnsi("\u2212100\u202f€")).toBe("-100 €")
  })

  it("replaces what the standard fonts cannot draw", () => {
    expect(toWinAnsi("ok 😀 ✓")).toBe("ok ? ?")
    expect(toWinAnsi("a\nb")).toBe("a b")
  })
})

describe("memoFileName", () => {
  it("names the file after the memo, as a safe receipt name", () => {
    expect(
      memoFileName({ title: "Muistiotosite", heading: "Poisto 2026" })
    ).toBe("Muistiotosite - Poisto 2026.pdf")
    expect(
      memoFileName({ title: "Muistiotosite", heading: "Vähennys 1/2: a*b" })
    ).not.toMatch(/[/*:]/)
  })
})
