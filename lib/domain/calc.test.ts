import { describe, expect, it } from "vitest"

import { RATES } from "@/lib/domain/accounts"
import { calcEntry, signedGross } from "@/lib/domain/calc"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"

describe("calcEntry", () => {
  it("splits a gross amount", () => {
    expect(
      calcEntry({ amount: 251000, vatRate: 25.5, amountMode: "gross" })
    ).toEqual({
      gross: 251000,
      vat: 51000,
      net: 200000,
    })
    expect(
      calcEntry({ amount: 4860, vatRate: 13.5, amountMode: "gross" })
    ).toEqual({
      gross: 4860,
      vat: 578,
      net: 4282,
    })
  })

  it("adds VAT to a net amount", () => {
    expect(
      calcEntry({ amount: 200000, vatRate: 25.5, amountMode: "net" })
    ).toEqual({
      net: 200000,
      vat: 51000,
      gross: 251000,
    })
  })

  it("leaves a zero-rated amount untouched", () => {
    expect(
      calcEntry({ amount: 320000, vatRate: 0, amountMode: "gross" })
    ).toEqual({
      gross: 320000,
      vat: 0,
      net: 320000,
    })
  })

  it("treats a missing or non-numeric rate as zero", () => {
    expect(
      calcEntry({ amount: 1000, vatRate: Number.NaN, amountMode: "gross" }).vat
    ).toBe(0)
  })

  it("never produces negative zero", () => {
    const { vat } = calcEntry({
      amount: -1,
      vatRate: 25.5,
      amountMode: "gross",
    })
    expect(Object.is(vat, 0)).toBe(true)
  })

  it("holds net + vat === gross for every rate and mode", () => {
    for (const vatRate of RATES) {
      for (const amountMode of ["gross", "net"] as const) {
        for (let amount = 0; amount <= 20000; amount += 97) {
          const r = calcEntry({ amount, vatRate, amountMode })
          expect(r.net + r.vat).toBe(r.gross)
          expect(Number.isInteger(r.net)).toBe(true)
          expect(Number.isInteger(r.vat)).toBe(true)
          expect(Number.isInteger(r.gross)).toBe(true)
        }
      }
    }
  })

  // Documented, not fixed: the two directions round differently, so toggling
  // the mode can shift a value by one cent. The CSV stores the amount together
  // with its mode, so nothing is actually lost.
  it("is deliberately not round-trip stable", () => {
    const net = calcEntry({ amount: 2, vatRate: 25.5, amountMode: "gross" }).net
    expect(net).toBe(2)
    expect(
      calcEntry({ amount: net, vatRate: 25.5, amountMode: "net" }).gross
    ).toBe(3)
  })
})

describe("signedGross", () => {
  it("negates expenses and leaves income positive", () => {
    const base = { amount: 10000, vatRate: 25.5, amountMode: "gross" } as const
    expect(signedGross({ ...base, type: "income" })).toBe(10000)
    expect(signedGross({ ...base, type: "expense" })).toBe(-10000)
  })
})

describe("the sixteen sample entries", () => {
  const entries = sampleEntries(createIdFactory())
  const expected: ReadonlyArray<readonly [string, number, number]> = [
    ["2026-01-08", 200000, 51000],
    ["2026-01-15", 14853, 3787],
    ["2026-01-31", 2382, 608],
    ["2026-02-12", 100000, 25500],
    ["2026-02-20", 35857, 9143],
    ["2026-03-03", 320000, 0],
    ["2026-03-18", 7359, 1876],
    ["2026-03-20", 35857, 9143],
    ["2026-04-09", 4282, 578],
    ["2026-04-20", 35857, 9143],
    ["2026-05-14", 480000, 0],
    ["2026-06-02", 31000, 0],
    ["2026-09-22", 9482, 2418],
    ["2026-10-10", 7968, 2032],
    ["2026-10-28", 150000, 38250],
    ["2026-10-30", 850, 0],
  ]

  it.each(expected.map((row, i) => [row[0], i, row[1], row[2]] as const))(
    "%s splits into net %i / VAT %i",
    (_pvm, index, net, vat) => {
      const r = calcEntry(entries[index])
      expect(r.net).toBe(net)
      expect(r.vat).toBe(vat)
    }
  )
})
