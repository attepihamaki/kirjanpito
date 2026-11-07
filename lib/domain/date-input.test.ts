import { describe, expect, it } from "vitest"
import { parseDateInput } from "@/lib/domain/date-input"

const today = "2026-03-01"

describe("parseDateInput", () => {
  it.each([
    ["15.3.", "2026-03-15"],
    ["15.3", "2026-03-15"],
    ["5.3.", "2026-03-05"],
    ["15.3.26", "2026-03-15"],
    ["15.3.2025", "2025-03-15"],
    ["15032026", "2026-03-15"],
    ["150325", "2025-03-15"],
    ["15/3", "2026-03-15"],
    ["2025-03-15", "2025-03-15"],
    [" 15.3. ", "2026-03-15"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseDateInput(input, 2026, today)).toBe(expected)
  })

  it("uses the open year when the year is missing", () => {
    expect(parseDateInput("15.3.", 2024, today)).toBe("2024-03-15")
  })

  it("counts words from today, not the open year", () => {
    expect(parseDateInput("eilen", 2024, today)).toBe("2026-02-28")
    expect(parseDateInput("Yesterday", 2026, today)).toBe("2026-02-28")
    expect(parseDateInput("tänään", 2026, today)).toBe("2026-03-01")
    expect(parseDateInput("huomenna", 2026, today)).toBe("2026-03-02")
  })

  it.each(["", "abc", "31.2.", "32.1.", "15.13.", "1234", "15.3.202"])(
    "rejects %j",
    (input) => {
      expect(parseDateInput(input, 2026, today)).toBeNull()
    }
  )

  it("rejects null", () => {
    expect(parseDateInput(null, 2026, today)).toBeNull()
  })
})
