import { describe, expect, it } from "vitest"

import { rateMismatch, rateOnDate } from "@/lib/domain/vat-rates"

describe("rateOnDate", () => {
  it("moves the general rate across 1 September 2024", () => {
    expect(rateOnDate(25.5, "2024-08-31")).toBe(24)
    expect(rateOnDate(25.5, "2024-09-01")).toBe(25.5)
    expect(rateOnDate(24, "2024-09-01")).toBe(25.5)
    expect(rateOnDate(24, "2023-05-10")).toBe(24)
  })

  it("moves the reduced rate across 1 January 2026", () => {
    expect(rateOnDate(13.5, "2025-12-31")).toBe(14)
    expect(rateOnDate(14, "2026-01-01")).toBe(13.5)
  })

  it("leaves rates no change touched, and partial dates, alone", () => {
    expect(rateOnDate(10, "2020-01-01")).toBe(10)
    expect(rateOnDate(0, "2026-03-01")).toBe(0)
    expect(rateOnDate(25.5, "2024-08")).toBe(25.5)
  })
})

describe("rateMismatch", () => {
  it("names a rate that had not yet taken effect", () => {
    expect(rateMismatch(25.5, "2024-08-15")).toEqual({
      kind: "notYet",
      rate: 25.5,
      since: "2024-09-01",
      suggested: 24,
    })
  })

  it("names a rate that had already been replaced", () => {
    expect(rateMismatch(14, "2026-02-03")).toEqual({
      kind: "ended",
      rate: 14,
      until: "2025-12-31",
      suggested: 13.5,
    })
  })

  it("is null for a rate that fits its date", () => {
    expect(rateMismatch(25.5, "2026-10-28")).toBeNull()
    expect(rateMismatch(24, "2024-08-31")).toBeNull()
    expect(rateMismatch(13.5, "2026-04-09")).toBeNull()
    expect(rateMismatch(0, "2026-06-02")).toBeNull()
  })
})
