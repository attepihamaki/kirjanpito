import { describe, expect, it } from "vitest"

import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import type { Entry } from "@/lib/domain/types"
import { assignVouchers, keepVoucher } from "@/lib/domain/voucher"

/* Voucher numbers: one series per year, never moved once given (§4). */

function entry(id: string, date: string, voucher?: number): Entry {
  return {
    id,
    date,
    description: id,
    type: "expense",
    catId: "333",
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross",
    ...(voucher ? { voucher } : {}),
  }
}

const numbers = (entries: readonly Entry[]) =>
  Object.fromEntries(entries.map((e) => [e.id, e.voucher]))

describe("assignVouchers", () => {
  it("numbers a book in date order, from 1", () => {
    const sample = sampleEntries(createIdFactory("v"))
    const out = assignVouchers([...sample].reverse())
    const byDate = [...out].sort((a, b) => a.date.localeCompare(b.date))
    expect(byDate.map((e) => e.voucher)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1)
    )
  })

  it("starts a new series each year", () => {
    const out = assignVouchers([
      entry("a", "2025-12-30"),
      entry("b", "2026-01-02"),
      entry("c", "2025-12-31"),
    ])
    expect(numbers(out)).toEqual({ a: 1, b: 1, c: 2 })
  })

  it("keeps existing numbers and continues after the highest", () => {
    const out = assignVouchers([
      entry("a", "2026-03-01", 5),
      entry("b", "2026-01-01"),
      entry("c", "2026-02-01", 2),
    ])
    expect(numbers(out)).toEqual({ a: 5, b: 6, c: 2 })
  })

  it("leaves a gap a deleted entry left", () => {
    const out = assignVouchers([
      entry("a", "2026-01-01", 1),
      entry("c", "2026-01-03", 3),
      entry("d", "2026-01-04"),
    ])
    expect(numbers(out)).toEqual({ a: 1, c: 3, d: 4 })
  })

  it("lets the earlier entry keep a repeated number", () => {
    const out = assignVouchers([
      entry("a", "2026-05-01", 4),
      entry("b", "2026-01-01", 4),
    ])
    expect(numbers(out)).toEqual({ a: 4, b: 5 })
  })

  it("returns the same array when every entry has its number", () => {
    const book = [entry("a", "2026-01-01", 1), entry("b", "2026-01-02", 2)]
    expect(assignVouchers(book)).toBe(book)
  })
})

describe("keepVoucher", () => {
  const before = entry("a", "2026-04-01", 7)

  it("keeps the number of an entry edited within its year", () => {
    const edited = { ...entry("a", "2026-04-20"), amount: 5000 }
    expect(keepVoucher(edited, before).voucher).toBe(7)
  })

  it("drops the number of an entry moved to another year", () => {
    expect(keepVoucher(entry("a", "2027-01-05", 7), before).voucher).toBe(
      undefined
    )
  })

  it("leaves a new entry as it is", () => {
    const fresh = entry("n", "2026-04-01")
    expect(keepVoucher(fresh, undefined)).toBe(fresh)
  })
})
