import { describe, expect, it } from "vitest"

import {
  normalizeReceiptText,
  receiptTextMatches,
  RECEIPT_TEXT_LIMIT,
} from "@/lib/domain/receipt-text"
import type { Entry } from "@/lib/domain/types"

const entry = (ids: (string | null)[]): Entry =>
  ({
    id: "e1",
    atts: ids.map((id) => ({
      id,
      name: "x.pdf",
      type: "application/pdf",
      size: 1,
    })),
  }) as Entry

describe("normalizeReceiptText", () => {
  it("lower-cases and collapses whitespace", () => {
    expect(normalizeReceiptText("  Lasku\n\nNro  123 ")).toBe("lasku nro 123")
  })

  it("cuts a long text", () => {
    expect(
      normalizeReceiptText("a".repeat(RECEIPT_TEXT_LIMIT + 5))
    ).toHaveLength(RECEIPT_TEXT_LIMIT)
  })
})

describe("receiptTextMatches", () => {
  const texts = new Map([["a1", "lasku nro 123 oy esimerkki ab"]])

  it("finds text in any receipt of the entry", () => {
    expect(receiptTextMatches(entry(["a0", "a1"]), "esimerkki", texts)).toBe(
      true
    )
  })

  it("matches a phrase across the whitespace the search box allows", () => {
    expect(receiptTextMatches(entry(["a1"]), "nro  123", texts)).toBe(true)
  })

  it("does not match an unindexed or missing receipt", () => {
    expect(receiptTextMatches(entry(["a9", null]), "lasku", texts)).toBe(false)
    expect(receiptTextMatches(entry(["a1"]), "lasku", undefined)).toBe(false)
  })
})
