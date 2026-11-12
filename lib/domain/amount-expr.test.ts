import { describe, expect, it } from "vitest"
import { evalAmount, isExpression } from "@/lib/domain/amount-expr"

describe("evalAmount", () => {
  it("leaves a plain amount to parseAmount", () => {
    expect(evalAmount("124,50")).toBe(12450)
    expect(evalAmount("-5")).toBe(-500)
    expect(evalAmount("1 234,50 €")).toBe(123450)
    expect(evalAmount("1,234")).toBeNull()
  })

  it("multiplies, adds, subtracts and divides", () => {
    expect(evalAmount("12,50*3")).toBe(3750)
    expect(evalAmount("12,50 x 3")).toBe(3750)
    expect(evalAmount("100+24,60")).toBe(12460)
    expect(evalAmount("100-24,60")).toBe(7540)
    expect(evalAmount("100/3")).toBe(3333)
    expect(evalAmount("10×2÷4")).toBe(500)
  })

  it("follows precedence and brackets", () => {
    expect(evalAmount("2+3*4")).toBe(1400)
    expect(evalAmount("(45+30)/2")).toBe(3750)
    expect(evalAmount("-(5+5)")).toBe(-1000)
    expect(evalAmount("5*-2")).toBe(-1000)
  })

  it("allows a factor with three decimals", () => {
    expect(evalAmount("1000*1,255")).toBe(125500)
  })

  it("accepts a Unicode minus", () => {
    expect(evalAmount("10−3")).toBe(700)
  })

  it("rejects what is not an amount", () => {
    expect(evalAmount("")).toBeNull()
    expect(evalAmount("abc")).toBeNull()
    expect(evalAmount("12*")).toBeNull()
    expect(evalAmount("(1+2")).toBeNull()
    expect(evalAmount("1+2)")).toBeNull()
    expect(evalAmount("5/0")).toBeNull()
    expect(evalAmount("1;2")).toBeNull()
    expect(evalAmount("9999999999*9")).toBeNull()
    expect(evalAmount(null)).toBeNull()
  })

  it("rounds half away from zero like the rest of the domain", () => {
    expect(evalAmount("1/8")).toBe(13)
    expect(evalAmount("-1/8")).toBe(-13)
  })
})

describe("isExpression", () => {
  it("is false for one amount", () => {
    expect(isExpression("12,50")).toBe(false)
    expect(isExpression("-12,50")).toBe(false)
    expect(isExpression("−12,50 €")).toBe(false)
    expect(isExpression("")).toBe(false)
    expect(isExpression("12,30-")).toBe(false)
    expect(isExpression("+45,00")).toBe(false)
    expect(isExpression("45,-")).toBe(false)
  })

  it("is true once there is an operator", () => {
    expect(isExpression("12,50*3")).toBe(true)
    expect(isExpression("10-3")).toBe(true)
    expect(isExpression("(5)")).toBe(true)
  })
})
