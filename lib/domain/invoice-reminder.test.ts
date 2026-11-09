import { describe, expect, it } from "vitest"

import { DEFAULT_INVOICE_SETTINGS } from "@/lib/domain/invoice"
import {
  lateInterest,
  reminderFigures,
  reminderRate,
  reminderRecord,
  statutoryRate,
} from "@/lib/domain/invoice-reminder"

describe("statutoryRate", () => {
  it("is the stored rate from the day it took effect", () => {
    expect(statutoryRate("2026-07-01")).toBe(9.5)
    expect(statutoryRate("2026-12-31")).toBe(9.5)
  })

  it("does not guess a rate for a day before the first stored one", () => {
    expect(statutoryRate("2026-06-30")).toBeNull()
  })
})

describe("reminderRate", () => {
  it("prefers the seller's own rate", () => {
    const own = { ...DEFAULT_INVOICE_SETTINGS, interestRate: 12 }
    expect(reminderRate(own, "2026-11-10")).toBe(12)
    expect(reminderRate(DEFAULT_INVOICE_SETTINGS, "2026-11-10")).toBe(9.5)
    expect(reminderRate(DEFAULT_INVOICE_SETTINGS, "2025-01-01")).toBeNull()
  })
})

describe("lateInterest", () => {
  it("is simple interest for the whole days late on a 365-day year", () => {
    /* 1 000,00 at 9,5 % for 30 days: 100 000 * 9.5 * 30 / 36 500 = 7 808,2 cents. */
    expect(lateInterest(100_000, "2026-10-01", "2026-10-31", 9.5)).toBe(781)
  })

  it("is nothing on or before the due date, or on nothing owed", () => {
    expect(lateInterest(100_000, "2026-10-01", "2026-10-01", 9.5)).toBe(0)
    expect(lateInterest(100_000, "2026-10-01", "2026-09-01", 9.5)).toBe(0)
    expect(lateInterest(0, "2026-10-01", "2026-12-01", 9.5)).toBe(0)
  })
})

describe("reminderFigures", () => {
  it("adds the interest and the fee to the balance and gives a week", () => {
    const figures = reminderFigures(
      { dueDate: "2026-10-01" },
      100_000,
      "2026-10-31",
      9.5,
      500
    )
    expect(figures).toMatchObject({
      open: 100_000,
      days: 30,
      interest: 781,
      fee: 500,
      total: 101_281,
      newDueDate: "2026-11-07",
    })
    expect(reminderRecord("r1", "2026-10-31", figures)).toEqual({
      id: "r1",
      date: "2026-10-31",
      open: 100_000,
      rate: 9.5,
      interest: 781,
      fee: 500,
      newDueDate: "2026-11-07",
    })
  })
})
