import { describe, expect, it } from "vitest"

import { retentionDates, yearsToArchive } from "@/lib/domain/retention"
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
