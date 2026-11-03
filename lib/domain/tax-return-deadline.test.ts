import { describe, expect, it } from "vitest"

import { form5Due, form5Reminder } from "@/lib/domain/tax-return-deadline"
import type { Entry } from "@/lib/domain/types"

const entry = (date: string): Entry => ({
  id: date,
  date,
  description: "",
  type: "income",
  catId: "301",
  amount: 100,
  vatRate: 0,
  amountMode: "gross",
})

describe("form5Reminder", () => {
  it("knows Verohallinto's date for 2025", () => {
    expect(form5Due(2025)).toBe("2026-04-01")
  })

  it("reminds until the date, and not after it", () => {
    const entries = [entry("2025-06-01")]
    expect(form5Reminder(entries, "2026-04-01")).toEqual({
      taxYear: 2025,
      due: "2026-04-01",
    })
    expect(form5Reminder(entries, "2026-04-02")).toBeNull()
  })

  it("gives no date for a year not in the table, and stops after April", () => {
    const entries = [entry("2030-06-01")]
    expect(form5Reminder(entries, "2031-02-01")).toEqual({
      taxYear: 2030,
      due: null,
    })
    expect(form5Reminder(entries, "2031-05-01")).toBeNull()
  })

  it("stops once the return is marked as filed", () => {
    const filed = { "2025": "2026-03-20" }
    expect(form5Reminder([entry("2025-06-01")], "2026-02-01", filed)).toBeNull()
  })

  it("stays quiet without last year's entries", () => {
    expect(form5Reminder([entry("2026-06-01")], "2026-02-01")).toBeNull()
  })
})
