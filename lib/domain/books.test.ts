import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { accountList, generalLedger, journal } from "@/lib/domain/books"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { assignVouchers } from "@/lib/domain/voucher"

/* The journal and the general ledger (KPL 2:4, §8.4). */

const cats = indexCategories(defaultCategories())
const sample = [...assignVouchers(sampleEntries(createIdFactory("b")))]

describe("journal", () => {
  const book = journal([...sample].reverse(), cats, 2026)

  it("lists the year in date order, by month", () => {
    expect(book.months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 9, 10])
    const vouchers = book.months.flatMap((m) =>
      m.rows.map((r) => r.entry.voucher)
    )
    expect(vouchers).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
  })

  it("adds up to the §10 figures", () => {
    expect(book.income.net).toBe(1_250_000)
    expect(book.expense.net).toBe(185_747)
    expect(book.income.vat).toBe(114_750)
    expect(book.expense.vat).toBe(38_728)
  })

  it("leaves other years out", () => {
    expect(journal(sample, cats, 2025).months).toEqual([])
  })

  it("orders one day's entries by voucher number", () => {
    const sameDay = sample.map((e) => ({ ...e, date: "2026-05-05" }))
    const rows = journal(sameDay.reverse(), cats, 2026).months[0].rows
    expect(rows.map((r) => r.entry.voucher)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1)
    )
  })
})

describe("generalLedger", () => {
  const accounts = generalLedger(sample, cats, 2026)

  it("groups by account in chart-of-accounts order", () => {
    expect(accounts.map((a) => a.line.key)).toEqual([
      "300",
      "333",
      "336",
      "343",
      "344-vehicle",
      "344-meeting",
      "344-other",
      "349",
    ])
  })

  it("totals each account", () => {
    const rent = accounts.find((a) => a.line.key === "343")!
    expect(rent.rows).toHaveLength(3)
    expect(rent.totals.gross).toBe(135_000)
  })

  it("lists every entry once", () => {
    const rows = accounts.flatMap((a) => a.rows)
    expect(rows).toHaveLength(16)
    expect(new Set(rows.map((r) => r.entry.id)).size).toBe(16)
  })
})

describe("accountList", () => {
  it("lists enabled categories and any used one, in chart order", () => {
    const list = defaultCategories().map((c) =>
      c.line === "349" ? { ...c, enabled: false } : c
    )
    const used: Entry = {
      id: "e",
      date: "2026-02-01",
      description: "",
      type: "expense",
      catId: "349",
      amount: 100,
      vatRate: 0,
      amountMode: "gross",
    }
    const has = (year: number) =>
      accountList([used], list, year).some((r) => r.line.key === "349")
    expect(has(2026)).toBe(true)
    expect(has(2025)).toBe(false)
    expect(accountList([], list, 2026)[0].line.key).toBe("300")
  })
})
