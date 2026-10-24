import { describe, expect, it } from "vitest"

import { demoEntries } from "@/lib/domain/demo"
import { createIdFactory } from "@/lib/domain/id"
import { filterPeriod, inPeriod, periodRange } from "@/lib/domain/period"

const demo = demoEntries(createIdFactory())

describe("inPeriod", () => {
  it("matches a whole year", () => {
    expect(inPeriod({ pvm: "2026-07-01" }, { kind: "year", year: 2026 })).toBe(
      true
    )
    expect(inPeriod({ pvm: "2025-12-31" }, { kind: "year", year: 2026 })).toBe(
      false
    )
  })

  it("matches a single month", () => {
    const p = { kind: "month", year: 2026, month: 10 } as const
    expect(inPeriod({ pvm: "2026-10-01" }, p)).toBe(true)
    expect(inPeriod({ pvm: "2026-10-31" }, p)).toBe(true)
    expect(inPeriod({ pvm: "2026-09-30" }, p)).toBe(false)
    expect(inPeriod({ pvm: "2026-11-01" }, p)).toBe(false)
  })

  it("matches a quarter at both edges", () => {
    const q4 = { kind: "quarter", year: 2026, quarter: 4 } as const
    expect(inPeriod({ pvm: "2026-10-01" }, q4)).toBe(true)
    expect(inPeriod({ pvm: "2026-12-31" }, q4)).toBe(true)
    expect(inPeriod({ pvm: "2026-09-30" }, q4)).toBe(false)
    expect(inPeriod({ pvm: "2027-01-01" }, q4)).toBe(false)
  })
})

describe("filterPeriod", () => {
  it("slices the demo data", () => {
    expect(filterPeriod(demo, { kind: "year", year: 2026 })).toHaveLength(16)
    expect(
      filterPeriod(demo, { kind: "month", year: 2026, month: 10 })
    ).toHaveLength(3)
    expect(
      filterPeriod(demo, { kind: "quarter", year: 2026, quarter: 1 })
    ).toHaveLength(8)
    expect(filterPeriod(demo, { kind: "year", year: 2025 })).toEqual([])
  })
})

describe("periodRange", () => {
  it("spans the whole year", () => {
    expect(periodRange({ kind: "year", year: 2026 })).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    })
  })

  it("ends a month on its real last day", () => {
    expect(periodRange({ kind: "month", year: 2026, month: 2 })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    })
    expect(periodRange({ kind: "month", year: 2024, month: 2 })).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    })
    expect(periodRange({ kind: "month", year: 2026, month: 10 })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
  })

  it("spans a quarter", () => {
    expect(periodRange({ kind: "quarter", year: 2026, quarter: 1 })).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
    })
    expect(periodRange({ kind: "quarter", year: 2026, quarter: 4 })).toEqual({
      from: "2026-10-01",
      to: "2026-12-31",
    })
  })
})
