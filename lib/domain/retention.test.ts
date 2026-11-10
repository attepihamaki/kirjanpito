import { describe, expect, it } from "vitest"

import {
  heldYears,
  retentionDates,
  retentionEnded,
  retentionStage,
  yearsToArchive,
} from "@/lib/domain/retention"
import type { Entry } from "@/lib/domain/types"

/* KPL 2:10 retention and the overview's reminder (§8.12). */

const on = (date: string): Entry => ({
  id: date,
  date,
  description: "",
  type: "expense",
  catId: "333",
  amount: 100,
  vatRate: 0,
  amountMode: "gross",
})

describe("retentionDates", () => {
  it("keeps the books 10 years and the vouchers 6", () => {
    expect(retentionDates(2025)).toEqual({
      books: "2035-12-31",
      vouchers: "2031-12-31",
    })
  })
})

describe("yearsToArchive", () => {
  const entries = [on("2024-03-01"), on("2025-06-01"), on("2026-01-10")]

  it("lists the closed years with entries, oldest first", () => {
    expect(yearsToArchive(entries, "2026-11-02", {})).toEqual([2024, 2025])
  })

  it("leaves out the current year and a year marked as stored", () => {
    expect(
      yearsToArchive(entries, "2026-11-02", { "2024": "2025-01-20" })
    ).toEqual([2025])
  })

  it("leaves out a year whose books no longer have to be kept", () => {
    expect(yearsToArchive([on("2014-05-05")], "2026-11-02", {})).toEqual([])
    expect(yearsToArchive([on("2016-05-05")], "2026-11-02", {})).toEqual([2016])
  })
})

describe("retention reminders", () => {
  it("holds the book's years and the years kept outside it", () => {
    expect(
      heldYears(
        [on("2024-05-01"), on("2022-01-01")],
        { "2020": "x" },
        {
          "2018": {},
          bad: {},
        }
      )
    ).toEqual([2018, 2020, 2022, 2024])
  })

  it("reaches the vouchers after 6 years and the books after 10", () => {
    expect(retentionStage(2019, "2025-12-31")).toBeNull()
    expect(retentionStage(2019, "2026-01-01")).toBe("vouchers")
    expect(retentionStage(2019, "2030-01-01")).toBe("books")
  })

  it("names each stage until it is noted, and the books after the vouchers", () => {
    const today = "2030-01-01"
    expect(retentionEnded([2019, 2023], today, {})).toEqual([
      { year: 2019, stage: "books" },
      { year: 2023, stage: "vouchers" },
    ])
    expect(retentionEnded([2019], today, { "2019": "vouchers" })).toEqual([
      { year: 2019, stage: "books" },
    ])
    expect(retentionEnded([2019], today, { "2019": "books" })).toEqual([])
  })
})
