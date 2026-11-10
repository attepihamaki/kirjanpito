import { describe, expect, it } from "vitest"

import { DEFAULT_INVOICE_SETTINGS, emptyParty } from "@/lib/domain/invoice"
import {
  chargeIds,
  interestBasis,
  lateInterest,
  openCharges,
  REMINDER_FEE_CAT,
  REMINDER_INTEREST_CAT,
  reminderEntries,
  reminderFigures,
  reminderRate,
  reminderRecord,
  statutoryRate,
} from "@/lib/domain/invoice-reminder"
import type { Entry } from "@/lib/domain/types"

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

describe("booking a reminder's charges", () => {
  const sale: Entry = {
    id: "e1",
    date: "2026-09-01",
    description: "Lasku 1001 – Asiakas Oy",
    type: "income",
    catId: "300-domestic",
    amount: 100_000,
    vatRate: 0,
    amountMode: "gross",
    paidOn: null,
  }
  const invoice = {
    number: 1001,
    language: "fi" as const,
    customer: { ...emptyParty(), name: "Asiakas Oy" },
    dueDate: "2026-10-01",
    entryIds: ["e1"],
  }

  it("books the interest and the fee as open income outside VAT", () => {
    const ids = ["c1", "c2"]
    const entries = reminderEntries(
      invoice,
      "2026-10-31",
      { interest: 781, fee: 500 },
      () => ids.shift()!
    )
    expect(entries).toEqual([
      expect.objectContaining({
        id: "c1",
        catId: REMINDER_INTEREST_CAT,
        amount: 781,
        vatRate: 0,
        paidOn: null,
        date: "2026-10-31",
        description: "Maksumuistutus, lasku 1001 – Asiakas Oy",
      }),
      expect.objectContaining({
        id: "c2",
        catId: REMINDER_FEE_CAT,
        amount: 500,
      }),
    ])
    expect(
      reminderEntries(invoice, "2026-10-31", { interest: 0, fee: 0 }, () => "x")
    ).toEqual([])
  })

  it("charges the next reminder's interest on the invoice alone, from the last booked one", () => {
    const interest = {
      ...sale,
      id: "c1",
      catId: REMINDER_INTEREST_CAT,
      amount: 781,
      date: "2026-10-31",
    }
    const fee = {
      ...sale,
      id: "c2",
      catId: REMINDER_FEE_CAT,
      amount: 500,
      date: "2026-10-31",
    }
    const reminded = {
      ...invoice,
      entryIds: ["e1", "c1", "c2"],
      reminders: [
        reminderRecord(
          "r1",
          "2026-10-31",
          reminderFigures(invoice, 100_000, "2026-10-31", 9.5, 500),
          ["c1", "c2"]
        ),
      ],
    }
    const byId = new Map([sale, interest, fee].map((e) => [e.id, e]))
    expect(interestBasis(reminded, byId)).toEqual({
      principal: 100_000,
      from: "2026-10-31",
    })
    expect(openCharges(reminded, byId).map((e) => e.id)).toEqual(["c1", "c2"])
    expect(chargeIds(reminded)).toEqual(new Set(["c1", "c2"]))

    const second = reminderFigures(
      reminded,
      101_281,
      "2026-11-30",
      9.5,
      500,
      interestBasis(reminded, byId)
    )
    expect(second).toMatchObject({
      open: 101_281,
      days: 30,
      interest: 781,
      total: 102_562,
    })

    /* Interest given up is charged again, from the due date. */
    const waived = new Map([sale, fee].map((e) => [e.id, e]))
    expect(interestBasis(reminded, waived).from).toBe("2026-10-01")
  })
})
