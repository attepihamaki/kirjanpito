import { describe, expect, it } from "vitest"

import { lossAvailable, lossLedger } from "@/lib/domain/tax-loss"

/* Losses carried forward (§6.15, TVL 119 §). */

const results = (pairs: [number, number][]) => new Map(pairs)

describe("lossLedger", () => {
  it("deducts losses from later profits, oldest first", () => {
    const ledger = lossLedger(
      {
        results: results([
          [2022, -300_000],
          [2023, -200_000],
          [2024, 400_000],
          [2025, 500_000],
        ]),
        confirmed: {},
      },
      2025
    )
    expect(ledger.years.find((y) => y.year === 2024)?.deductions).toEqual([
      { from: 2022, amount: 300_000 },
      { from: 2023, amount: 100_000 },
    ])
    expect(ledger.years.find((y) => y.year === 2025)).toMatchObject({
      profit: 500_000,
      deducted: 100_000,
    })
    expect(ledger.origins.map((o) => [o.year, o.left])).toEqual([
      [2022, 0],
      [2023, 0],
    ])
  })

  it("uses the confirmed figure, takes a loss from before the book and leaves out 373", () => {
    const ledger = lossLedger(
      {
        results: results([
          [2024, -100_000],
          [2025, 50_000],
        ]),
        confirmed: { "2020": 30_000, "2024": 90_000 },
        toCapital: { "2024": 20_000 },
      },
      2025
    )
    expect(ledger.origins).toEqual([
      expect.objectContaining({ year: 2020, amount: 30_000, used: 30_000 }),
      expect.objectContaining({
        year: 2024,
        amount: 90_000,
        confirmed: true,
        used: 20_000,
        left: 70_000,
        lastYear: 2034,
      }),
    ])
    const own = lossLedger(
      {
        results: results([[2024, -100_000]]),
        confirmed: {},
        toCapital: { "2024": 20_000 },
      },
      2024
    )
    expect(own.origins[0]).toMatchObject({ amount: 80_000, confirmed: false })
  })

  it("lets a loss run out after ten years", () => {
    const ledger = lossLedger(
      {
        results: results([
          [2014, -100_000],
          [2024, 10_000],
          [2025, 500_000],
        ]),
        confirmed: {},
      },
      2025
    )
    expect(ledger.origins[0]).toMatchObject({
      lastYear: 2024,
      used: 10_000,
      left: 0,
      expired: 90_000,
    })
    expect(ledger.years.at(-1)?.deducted).toBe(0)
  })

  it("is what is left before a year, up to its profit", () => {
    const input = {
      results: results([
        [2025, -100_000],
        [2026, 30_000],
      ]),
      confirmed: {},
    }
    expect(lossAvailable(input, 2026, 30_000)).toBe(30_000)
    expect(lossAvailable(input, 2026, 250_000)).toBe(100_000)
    expect(lossAvailable(input, 2026, -5)).toBe(0)
  })
})
