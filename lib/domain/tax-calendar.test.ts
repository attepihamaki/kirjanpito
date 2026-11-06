import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  NO_PAY_MONTHS,
  taxCalendar,
  toIcs,
  type CalendarInput,
} from "@/lib/domain/tax-calendar"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function sale(date: string): Entry {
  return {
    id: date,
    date,
    description: "",
    type: "income",
    catId: "300-eu-goods",
    amount: 100_000,
    vatRate: 0,
    amountMode: "gross",
  }
}

function input(over: Partial<CalendarInput> = {}): CalendarInput {
  return {
    year: 2026,
    today: "2026-11-06",
    vatPeriod: "month",
    startDate: "2025-10-01",
    vatFiled: {},
    form5Filed: {},
    payMonths: NO_PAY_MONTHS,
    entries: [],
    cats,
    ...over,
  }
}

const dates = (kind: string, over?: Partial<CalendarInput>) =>
  taxCalendar(input(over))
    .filter((e) => e.kind === kind)
    .map((e) => [e.ref, e.date])

describe("taxCalendar", () => {
  it("lists the VAT returns that fall due in the year, last year's first", () => {
    const vat = dates("vat")
    expect(vat).toHaveLength(12)
    expect(vat[0]).toEqual(["2025-11", "2026-01-12"])
    expect(vat[1]).toEqual(["2025-12", "2026-02-12"])
    // 12.12.2026 is a Saturday.
    expect(vat.at(-1)).toEqual(["2026-10", "2026-12-14"])
  })

  it("follows the filing period", () => {
    expect(dates("vat", { vatPeriod: "quarter" })).toEqual([
      ["2025-Q4", "2026-02-12"],
      ["2026-Q1", "2026-05-12"],
      ["2026-Q2", "2026-08-12"],
      ["2026-Q3", "2026-11-12"],
    ])
    expect(dates("vat", { vatPeriod: "year" })).toEqual([
      ["2025", "2026-03-02"],
    ])
  })

  it("leaves out periods before the book began, and all of them without a start", () => {
    expect(dates("vat", { startDate: "2026-10-01" })).toEqual([
      ["2026-10", "2026-12-14"],
    ])
    expect(dates("vat", { startDate: null })).toEqual([])
  })

  it("marks a filed return as done", () => {
    const e = taxCalendar(input({ vatFiled: { "2025-11": "2026-01-10" } }))
    expect(e.find((x) => x.id === "vat-2025-11")?.done).toBe(true)
    expect(e.find((x) => x.id === "vat-2025-12")?.done).toBe(false)
  })

  it("lists an EC Sales List only for a month with EU sales", () => {
    const entries = [sale("2026-03-03"), sale("2025-12-10")]
    expect(dates("ec", { entries })).toEqual([
      ["2025-12", "2026-01-20"],
      ["2026-03", "2026-04-20"],
    ])
    expect(dates("ec")).toEqual([])
  })

  it("lists Form 5 on Verohallinto's date and marks it filed", () => {
    expect(dates("form5")).toEqual([["2025", "2026-04-01"]])
    const e = taxCalendar(input({ form5Filed: { "2025": "2026-03-20" } }))
    expect(e.find((x) => x.kind === "form5")?.done).toBe(true)
    expect(dates("form5", { year: 2027 })).toEqual([])
  })

  it("puts YEL on the 20th and advance tax on the 23rd of the chosen months", () => {
    const payMonths = { yel: [7, 1, 7], advanceTax: [8, 13, 0] }
    expect(dates("yel", { payMonths })).toEqual([
      ["2026-01", "2026-01-20"],
      ["2026-07", "2026-07-20"],
    ])
    // 23.8.2026 is a Sunday.
    expect(dates("advanceTax", { payMonths })).toEqual([
      ["2026-08", "2026-08-24"],
    ])
  })

  it("sorts by date", () => {
    const e = taxCalendar(
      input({ payMonths: { yel: [1, 2, 3], advanceTax: [1, 2, 3] } })
    )
    const d = e.map((x) => x.date)
    expect(d).toEqual([...d].sort())
  })
})

describe("toIcs", () => {
  const now = new Date("2026-11-06T09:30:00Z")

  it("writes all-day events with a reminder", () => {
    const ics = toIcs(
      [{ id: "vat-2026-10", date: "2026-12-14", title: "ALV, lokakuu" }],
      "Verokalenteri",
      now
    )
    expect(ics).toContain("BEGIN:VCALENDAR\r\n")
    expect(ics).toContain("UID:vat-2026-10@kirjanpito\r\n")
    expect(ics).toContain("DTSTAMP:20261106T093000Z\r\n")
    expect(ics).toContain("DTSTART;VALUE=DATE:20261214\r\n")
    expect(ics).toContain("DTEND;VALUE=DATE:20261215\r\n")
    expect(ics).toContain("TRIGGER:-P1D\r\n")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
  })

  it("rolls the end date over a month and a year", () => {
    const ics = toIcs([{ id: "a", date: "2026-12-31", title: "x" }], "k", now)
    expect(ics).toContain("DTEND;VALUE=DATE:20270101\r\n")
  })

  it("escapes text and folds long lines", () => {
    const ics = toIcs(
      [
        {
          id: "a",
          date: "2026-01-02",
          title: "A, B; C\\D",
          description: "ä".repeat(80),
        },
      ],
      "k",
      now
    )
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D\r\n")
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})
