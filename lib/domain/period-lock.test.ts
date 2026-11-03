import { describe, expect, it } from "vitest"

import { lockOn } from "@/lib/domain/period-lock"

const none = { vatFiled: {}, yearsArchived: {} }

describe("lockOn", () => {
  it("leaves an unmarked date open", () => {
    expect(lockOn("2026-03-10", none)).toBeNull()
  })

  it("locks a date in a filed month, and only that month", () => {
    const marks = { ...none, vatFiled: { "2026-03": "2026-05-12" } }
    expect(lockOn("2026-03-10", marks)).toEqual({
      kind: "filed",
      key: "2026-03",
      since: "2026-05-12",
    })
    expect(lockOn("2026-04-10", marks)).toBeNull()
  })

  it("locks a date in a filed quarter or year", () => {
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026-Q2": "2026-08-12" } })
        ?.key
    ).toBe("2026-Q2")
    expect(
      lockOn("2026-05-10", { ...none, vatFiled: { "2026": "2027-03-01" } })?.key
    ).toBe("2026")
  })

  it("names a stored year first", () => {
    const marks = {
      vatFiled: { "2026-03": "2026-05-12" },
      yearsArchived: { "2026": "2027-01-20" },
    }
    expect(lockOn("2026-03-10", marks)?.kind).toBe("year")
  })
})
