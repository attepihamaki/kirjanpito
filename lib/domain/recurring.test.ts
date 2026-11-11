import { describe, expect, it } from "vitest"

import {
  dueRecurring,
  entryToRecurring,
  fallsIn,
  matchRecurring,
  recurringDate,
  recurringToEntry,
  withEvery,
  type RecurringEntry,
} from "@/lib/domain/recurring"
import type { Entry } from "@/lib/domain/types"

const rent: RecurringEntry = {
  id: "r1",
  description: "Työtilan vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  day: 31,
  from: "2026-02",
}

const booked = (date: string, over: Partial<Entry> = {}): Entry => ({
  id: date,
  date,
  description: "Työtilan vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

describe("recurring entries", () => {
  it("uses the month's last day when the template's day does not exist", () => {
    expect(recurringDate(31, "2026-02")).toBe("2026-02-28")
    expect(recurringDate(31, "2028-02")).toBe("2028-02-29")
    expect(recurringDate(31, "2026-03")).toBe("2026-03-31")
  })

  it("is due from its first month until the month has its entry", () => {
    expect(dueRecurring([rent], "2026-01", [])).toEqual([])
    expect(dueRecurring([rent], "2026-02", [])).toEqual([rent])
    expect(dueRecurring([rent], "2026-02", [booked("2026-02-10")])).toEqual([])
    expect(dueRecurring([rent], "2026-03", [booked("2026-02-10")])).toEqual([
      rent,
    ])
  })

  it("counts an entry with another amount, but not another category", () => {
    expect(
      dueRecurring([rent], "2026-03", [
        booked("2026-03-20", { amount: 50_000 }),
      ])
    ).toEqual([])
    expect(
      dueRecurring([rent], "2026-03", [booked("2026-03-20", { catId: "333" })])
    ).toEqual([rent])
  })

  it("matches a description whatever its case and spacing", () => {
    expect(
      matchRecurring([rent], {
        type: "expense",
        catId: "343",
        description: " työtilan VUOKRA ",
      })
    ).toBe(rent)
  })

  it("moves an old rate to the one in force on the date", () => {
    const old = { ...rent, vatRate: 24 }
    expect(recurringToEntry(old, "2026-03", () => "x").vatRate).toBe(25.5)
    expect(recurringToEntry(old, "2024-03", () => "x").vatRate).toBe(24)
  })

  it("takes the day from the entry it is made from", () => {
    const made = entryToRecurring(booked("2026-05-14"), "r2", "2026-05")
    expect(made.day).toBe(14)
    expect(made.from).toBe("2026-05")
    expect(made.amount).toBe(45_000)
  })

  it("falls on its interval, counted from its first month across years", () => {
    const quarterly = { from: "2026-11", every: 3 }
    expect(fallsIn(quarterly, "2026-10")).toBe(false)
    expect(fallsIn(quarterly, "2026-11")).toBe(true)
    expect(fallsIn(quarterly, "2026-12")).toBe(false)
    expect(fallsIn(quarterly, "2027-02")).toBe(true)
    expect(fallsIn({ from: "2026-03", every: 12 }, "2027-03")).toBe(true)
    expect(fallsIn({ from: "2026-03", every: 12 }, "2027-04")).toBe(false)
    expect(fallsIn({ from: "2026-03" }, "2026-07")).toBe(true)
  })

  it("is not due in a month off its interval", () => {
    const yearly = { ...rent, every: 12 }
    expect(dueRecurring([yearly], "2026-02", [])).toEqual([yearly])
    expect(dueRecurring([yearly], "2026-03", [])).toEqual([])
    expect(dueRecurring([yearly], "2027-02", [])).toEqual([yearly])
  })

  it("writes no interval for a monthly template", () => {
    expect(
      entryToRecurring(booked("2026-05-14"), "r2", "2026-05")
    ).not.toHaveProperty("every")
    expect(
      entryToRecurring(booked("2026-05-14"), "r2", "2026-05", 3).every
    ).toBe(3)
    expect(withEvery({ ...rent, every: 6 }, 1)).toEqual(rent)
    expect(withEvery(rent, 6).every).toBe(6)
  })
})
