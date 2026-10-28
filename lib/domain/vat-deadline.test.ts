import { describe, expect, it } from "vitest"

import {
  asPeriod,
  bankHolidays,
  bookStartDate,
  daysBetween,
  nextWorkingDay,
  periodContaining,
  periodStatus,
  vatPeriods,
  vatTimeline,
} from "@/lib/domain/vat-deadline"

describe("bankHolidays", () => {
  it("lists the moving holidays of 2026", () => {
    const h = bankHolidays(2026)
    // Easter Sunday is 5 April 2026.
    expect(h.has("2026-04-03")).toBe(true)
    expect(h.has("2026-04-06")).toBe(true)
    expect(h.has("2026-05-14")).toBe(true)
    expect(h.has("2026-06-19")).toBe(true)
    expect(h.has("2026-04-05")).toBe(false)
  })
})

describe("nextWorkingDay", () => {
  it("keeps a working day", () => {
    expect(nextWorkingDay("2026-11-12")).toBe("2026-11-12")
  })

  it("moves a Saturday or Sunday to Monday", () => {
    expect(nextWorkingDay("2026-12-12")).toBe("2026-12-14")
    expect(nextWorkingDay("2026-04-12")).toBe("2026-04-13")
  })

  it("skips a holiday that follows a weekend", () => {
    // 12 April 2020 was Easter Sunday, and the Monday after it a holiday.
    expect(nextWorkingDay("2020-04-12")).toBe("2020-04-14")
  })
})

describe("vatPeriods", () => {
  it("puts a monthly return on the 12th of the second month after", () => {
    const months = vatPeriods("month", 2026)
    expect(months).toHaveLength(12)
    expect(months[8]).toMatchObject({
      key: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
      due: "2026-11-12",
    })
    // The 12th is a Saturday.
    expect(months[9].due).toBe("2026-12-14")
    // December rolls into the next year.
    expect(months[11]).toMatchObject({ key: "2026-12", due: "2027-02-12" })
    // February has 28 days in 2026.
    expect(months[1].to).toBe("2026-02-28")
  })

  it("dates quarters the same way", () => {
    const q = vatPeriods("quarter", 2026)
    expect(q.map((p) => p.key)).toEqual([
      "2026-Q1",
      "2026-Q2",
      "2026-Q3",
      "2026-Q4",
    ])
    expect(q.map((p) => p.due)).toEqual([
      "2026-05-12",
      "2026-08-12",
      "2026-11-12",
      "2027-02-12",
    ])
    expect(q[3]).toMatchObject({ from: "2026-10-01", to: "2026-12-31" })
  })

  it("puts a yearly return at the end of February", () => {
    // 28 February 2027 is a Sunday.
    expect(vatPeriods("year", 2026)[0]).toMatchObject({
      key: "2026",
      due: "2027-03-01",
    })
    // 2028 is a leap year; 29 February 2028 is a Tuesday.
    expect(vatPeriods("year", 2027)[0].due).toBe("2028-02-29")
  })

  // The examples Verohallinto publishes for these rules (§6.5).
  it("matches Verohallinto's own examples", () => {
    // "You must file and pay your VAT for 2020 by 1 March 2021."
    expect(vatPeriods("year", 2020)[0].due).toBe("2021-03-01")
    // The yearly return for 2025 was due 2.3.2026.
    expect(vatPeriods("year", 2025)[0].due).toBe("2026-03-02")
    // "You must file and pay your VAT for March by 12 May."
    expect(vatPeriods("month", 2026)[2].due).toBe("2026-05-12")
  })
})

describe("periodContaining and asPeriod", () => {
  it("finds the period around a date", () => {
    expect(periodContaining("month", "2026-10-27").key).toBe("2026-10")
    expect(periodContaining("quarter", "2026-10-27").key).toBe("2026-Q4")
    expect(periodContaining("year", "2026-10-27").key).toBe("2026")
  })

  it("converts to a filter period", () => {
    expect(asPeriod(vatPeriods("quarter", 2026)[2])).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 3,
    })
    expect(asPeriod(vatPeriods("month", 2026)[0])).toEqual({
      kind: "month",
      year: 2026,
      month: 1,
    })
  })
})

describe("periodStatus", () => {
  const sep = vatPeriods("month", 2026)[8]

  it("walks future, open, due and overdue", () => {
    expect(periodStatus(sep, "2026-08-31", {})).toBe("future")
    expect(periodStatus(sep, "2026-09-30", {})).toBe("open")
    expect(periodStatus(sep, "2026-10-01", {})).toBe("due")
    expect(periodStatus(sep, "2026-11-12", {})).toBe("due")
    expect(periodStatus(sep, "2026-11-13", {})).toBe("overdue")
  })

  it("counts a filed mark only once the period has closed", () => {
    const filed = { "2026-09": "2026-11-10" }
    expect(periodStatus(sep, "2026-11-20", filed)).toBe("filed")
    expect(periodStatus(sep, "2026-09-15", filed)).toBe("open")
  })
})

describe("daysBetween", () => {
  it("counts whole days across months", () => {
    expect(daysBetween("2026-10-31", "2026-11-12")).toBe(12)
    expect(daysBetween("2026-11-12", "2026-10-31")).toBe(-12)
  })
})

describe("periodStatus before the bookkeeping began", () => {
  const sep = vatPeriods("month", 2026)[8]
  const q3 = vatPeriods("quarter", 2026)[2]

  it("owes nothing for a period that ended before the start", () => {
    expect(periodStatus(sep, "2026-12-20", {}, "2026-10-01")).toBe("before")
  })

  it("still owes the period the start falls in", () => {
    expect(periodStatus(q3, "2026-12-20", {}, "2026-09-15")).toBe("overdue")
  })
})

describe("bookStartDate", () => {
  it("prefers the start month over the first entry", () => {
    expect(bookStartDate("2026-10", "2026-03-18")).toBe("2026-10-01")
    expect(bookStartDate(null, "2026-03-18")).toBe("2026-03-18")
    expect(bookStartDate(null, null)).toBeNull()
  })
})

describe("vatTimeline", () => {
  it("starts at the first entry and ends one period past today", () => {
    const t = vatTimeline("month", "2026-03-18", "2026-10-31", {})
    expect(t[0].key).toBe("2026-03")
    expect(t.at(-1)?.key).toBe("2026-11")
    expect(t.find((p) => p.key === "2026-10")?.status).toBe("open")
    expect(t.find((p) => p.key === "2026-09")?.status).toBe("due")
    expect(t.find((p) => p.key === "2026-08")?.status).toBe("overdue")
  })

  it("crosses into the next year", () => {
    const t = vatTimeline("month", "2026-11-02", "2027-01-20", {})
    expect(t.map((p) => p.key)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ])
  })

  it("starts at the start month even before the first entry", () => {
    const start = bookStartDate("2026-10", "2026-03-18")
    const t = vatTimeline("month", start, "2026-12-01", {})
    expect(t[0].key).toBe("2026-10")
    expect(t[0].status).toBe("due")
  })

  it("is empty for a book with no entries", () => {
    expect(vatTimeline("month", null, "2026-10-31", {})).toEqual([])
  })
})
