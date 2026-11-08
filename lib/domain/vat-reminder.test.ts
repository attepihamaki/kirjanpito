import { describe, expect, it } from "vitest"

import { vatTimeline } from "@/lib/domain/vat-deadline"
import { vatReminder } from "@/lib/domain/vat-reminder"

const start = "2026-01-01"

describe("vatReminder", () => {
  it("is quiet while the due date is further off than the lead time", () => {
    // September's return is due 12.11.2026, eight days after 4.11.
    const filed = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`2026-0${i + 1}`, "2026-09-01"])
    )
    const timeline = vatTimeline("month", start, "2026-11-04", filed)
    expect(vatReminder(timeline, "2026-11-04")).toBeNull()
  })

  it("shows within seven days of the due date", () => {
    const filed = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`2026-0${i + 1}`, "2026-09-01"])
    )
    const timeline = vatTimeline("month", start, "2026-11-05", filed)
    const r = vatReminder(timeline, "2026-11-05")
    expect(r?.period.key).toBe("2026-09")
    expect(r?.days).toBe(7)
    expect(r?.overdue).toBe(false)
  })

  it("counts down to the working day when the 12th is a Saturday", () => {
    // October's return is due 14.12.2026.
    const filed = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`2026-0${i + 1}`, "2026-10-01"])
    )
    const timeline = vatTimeline("month", start, "2026-12-11", filed)
    const r = vatReminder(timeline, "2026-12-11")
    expect(r?.period.key).toBe("2026-10")
    expect(r?.days).toBe(3)
  })

  it("reports the oldest overdue return first", () => {
    const timeline = vatTimeline("month", start, "2026-11-20", {})
    const r = vatReminder(timeline, "2026-11-20")
    expect(r?.overdue).toBe(true)
    expect(r?.period.key).toBe("2026-01")
  })

  it("never reminds about a filed return", () => {
    const filed = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`2026-0${i + 1}`, "2026-10-01"])
    )
    const timeline = vatTimeline("month", start, "2026-11-10", filed)
    expect(vatReminder(timeline, "2026-11-10")).toBeNull()
  })

  it("is empty for a book that has not begun", () => {
    expect(
      vatReminder(vatTimeline("month", null, "2026-11-10", {}), "2026-11-10")
    ).toBeNull()
  })
})
