import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { filedPeriodChanges } from "@/lib/domain/filed-changes"
import { filterPeriod } from "@/lib/domain/period"
import { entryLock } from "@/lib/domain/period-lock"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  cashBasisCovers,
  twelveMonthsOn,
  vatBasisEntries,
  vatDate,
  type VatCashBasis,
} from "@/lib/domain/vat-basis"

const cats = indexCategories(defaultCategories())
const cash: VatCashBasis = { from: "2026-01", to: null }

function sale(over: Partial<Entry> = {}): Entry {
  return {
    id: "s",
    date: "2026-01-20",
    description: "Lasku",
    type: "income",
    catId: "300-domestic",
    amount: 125_500,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

function bill(over: Partial<Entry> = {}): Entry {
  return {
    id: "b",
    date: "2026-01-10",
    description: "Ostolasku",
    type: "expense",
    catId: "333",
    amount: 12_550,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("vatDate", () => {
  it("is the entry's own date without the cash basis", () => {
    expect(vatDate(sale({ paidOn: "2026-05-02" }), cats, null)).toBe(
      "2026-01-20"
    )
  })

  it("puts a sale in the month it was paid", () => {
    expect(vatDate(sale({ paidOn: "2026-05-02" }), cats, cash)).toBe(
      "2026-05-02"
    )
  })

  it("reports an unpaid sale in the month 12 months after it at the latest", () => {
    expect(vatDate(sale({ paidOn: null }), cats, cash)).toBe("2027-01-20")
    expect(vatDate(sale({ paidOn: "2027-03-01" }), cats, cash)).toBe(
      "2027-01-20"
    )
  })

  it("leaves an unpaid purchase off every return", () => {
    expect(vatDate(bill({ paidOn: null }), cats, cash)).toBeNull()
    expect(vatDate(bill({ paidOn: "2026-02-03" }), cats, cash)).toBe(
      "2026-02-03"
    )
  })

  it("keeps EU trade and EU purchases on their own date", () => {
    expect(
      vatDate(
        sale({ catId: "300-eu-goods", vatRate: 0, paidOn: "2026-04-01" }),
        cats,
        cash
      )
    ).toBe("2026-01-20")
    expect(
      vatDate(
        bill({
          catId: "333-eu-goods",
          euPurchase: "goods",
          vatRate: 25.5,
          paidOn: null,
        }),
        cats,
        cash
      )
    ).toBe("2026-01-10")
  })

  it("reads an entry dated before the basis began on its own date", () => {
    const later: VatCashBasis = { from: "2026-03", to: null }
    expect(vatDate(sale({ paidOn: "2026-04-02" }), cats, later)).toBe(
      "2026-01-20"
    )
  })

  it("reports what is unpaid when the basis ends in the month after", () => {
    const ended: VatCashBasis = { from: "2026-01", to: "2026-06" }
    expect(vatDate(sale({ paidOn: null }), cats, ended)).toBe("2026-07-01")
    expect(vatDate(bill({ paidOn: "2026-09-01" }), cats, ended)).toBe(
      "2026-07-01"
    )
    expect(
      vatDate(sale({ date: "2026-08-01", paidOn: null }), cats, ended)
    ).toBe("2026-08-01")
  })

  it("leaves entries the return does not count alone", () => {
    const fee = bill({ catId: "344-other", vatRate: 0, paidOn: null })
    expect(vatDate(fee, cats, cash)).toBe(fee.date)
  })
})

describe("twelveMonthsOn", () => {
  it("falls back to the 28th where the month is shorter", () => {
    expect(twelveMonthsOn("2024-02-29")).toBe("2025-02-28")
  })
})

describe("vatBasisEntries", () => {
  it("moves the period's VAT to the payment month", () => {
    const entries = [
      sale({ paidOn: "2026-02-10" }),
      bill({ paidOn: null }),
      bill({ id: "b2", paidOn: "2026-01-31" }),
    ]
    const onVat = vatBasisEntries(entries, cats, cash)
    const jan = vatReport(
      filterPeriod(onVat, { kind: "month", year: 2026, month: 1 }),
      cats
    )
    const feb = vatReport(
      filterPeriod(onVat, { kind: "month", year: 2026, month: 2 }),
      cats
    )
    expect(jan.sales.total.vat).toBe(0)
    expect(jan.purchases.total.vat).toBe(2_550)
    expect(feb.sales.total.vat).toBe(25_500)
  })

  it("returns the same list without the cash basis", () => {
    const entries = [sale()]
    expect(vatBasisEntries(entries, cats, null)).toBe(entries)
  })
})

describe("cashBasisCovers", () => {
  it("tells whether a period has cash-basis months", () => {
    const ended: VatCashBasis = { from: "2026-03", to: "2026-06" }
    expect(
      cashBasisCovers(ended, { from: "2026-01-01", to: "2026-03-31" })
    ).toBe(true)
    expect(
      cashBasisCovers(ended, { from: "2026-07-01", to: "2026-07-31" })
    ).toBe(false)
    expect(
      cashBasisCovers(null, { from: "2026-01-01", to: "2026-12-31" })
    ).toBe(false)
  })
})

describe("on cash basis, a filed period", () => {
  const marks = {
    vatFiled: { "2026-02": "2026-03-10" },
    yearsArchived: {},
    form5Filed: {},
    vatCash: cash,
  }

  it("locks what was paid in it, not what is dated in it", () => {
    expect(entryLock(sale({ paidOn: "2026-02-10" }), marks, cats)?.kind).toBe(
      "filed"
    )
    expect(
      entryLock(sale({ date: "2026-02-03", paidOn: null }), marks, cats)
    ).toBeNull()
  })

  it("asks before a payment dated in it", () => {
    const before = [sale({ date: "2026-02-03", paidOn: null })]
    const after = [sale({ date: "2026-02-03", paidOn: "2026-02-20" })]
    const changes = filedPeriodChanges(
      before,
      after,
      cats,
      "month",
      marks.vatFiled,
      cash
    )
    expect(changes.map((c) => c.period.key)).toEqual(["2026-02"])
    expect(
      filedPeriodChanges(before, after, cats, "month", marks.vatFiled)
    ).toEqual([])
  })
})
