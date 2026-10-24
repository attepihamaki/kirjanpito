import { describe, expect, it } from "vitest"

import {
  formatDate,
  isoDate,
  monthOf,
  parseCsvDate,
  quarterMonths,
  todayIso,
  yearOf,
} from "@/lib/domain/dates"

describe("isoDate", () => {
  it("pads month and day", () => {
    expect(isoDate(2026, 1, 8)).toBe("2026-01-08")
  })

  it.each([
    [2026, 2, 30],
    [2025, 2, 29],
    [2026, 13, 1],
    [2026, 0, 10],
    [2026, 1, 0],
  ])("rejects %i-%i-%i", (y, m, d) => {
    expect(isoDate(y, m, d)).toBeNull()
  })

  it("accepts a real leap day", () => {
    expect(isoDate(2024, 2, 29)).toBe("2024-02-29")
  })
})

describe("parseCsvDate", () => {
  it.each([
    ["2026-01-08", "2026-01-08"],
    ["2026-1-8", "2026-01-08"],
    ["8.1.2026", "2026-01-08"],
    ["08.01.2026", "2026-01-08"],
    ["  8.1.2026  ", "2026-01-08"],
    ["29.2.2024", "2024-02-29"],
  ])("parses %j", (input, expected) => {
    expect(parseCsvDate(input)).toBe(expected)
  })

  it.each([
    "2026-02-30",
    "30.2.2026",
    "2025-02-29",
    "",
    "8/1/2026",
    "2026.01.08",
    "tomorrow",
  ])("rejects %j", (input) => {
    expect(parseCsvDate(input)).toBeNull()
  })

  it("rejects null and undefined", () => {
    expect(parseCsvDate(null)).toBeNull()
    expect(parseCsvDate(undefined)).toBeNull()
  })
})

describe("formatDate", () => {
  it("formats Finnish without padding", () => {
    expect(formatDate("2026-01-08", "fi")).toBe("8.1.2026")
    expect(formatDate("2026-12-31", "fi")).toBe("31.12.2026")
  })

  it("formats English as en-GB with a short month", () => {
    expect(formatDate("2026-01-08", "en")).toBe("8 Jan 2026")
    expect(formatDate("2026-12-31", "en")).toBe("31 Dec 2026")
  })

  // Built with a local-time Date, this renders as "31 Dec 2025" west of
  // Greenwich. The UTC pairing in formatDate is what prevents that.
  it("never shifts across the date line", () => {
    expect(formatDate("2026-01-01", "en")).toBe("1 Jan 2026")
  })
})

describe("yearOf / monthOf", () => {
  it("slices the ISO string", () => {
    expect(yearOf("2026-10-28")).toBe(2026)
    expect(monthOf("2026-10-28")).toBe(10)
    expect(monthOf("2026-01-08")).toBe(1)
  })
})

describe("todayIso", () => {
  it("uses the local date, not UTC", () => {
    expect(todayIso(new Date(2026, 9, 24, 23, 30))).toBe("2026-10-24")
  })
})

describe("quarterMonths", () => {
  it.each([
    [1, [1, 3]],
    [2, [4, 6]],
    [3, [7, 9]],
    [4, [10, 12]],
  ] as const)("maps Q%i", (q, expected) => {
    expect(quarterMonths(q)).toEqual(expected)
  })
})
