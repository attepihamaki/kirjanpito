// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* Which period the VAT view is on (§6.5, §8.7). */

const october: Entry = {
  id: "oct",
  voucher: 1,
  date: "2026-10-10",
  description: "Lasku",
  type: "income",
  catId: "300-domestic",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
}

const period = () =>
  renderHook(() => useVatPeriod(), {
    wrapper: ({ children }) => (
      <LangProvider lang="fi">{children}</LangProvider>
    ),
  }).result.current

describe("the VAT view's period", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-02T12:00:00"), toFake: ["Date"] })
    useBookStore.setState({
      year: 2026,
      cats: defaultCategories(),
      entries: [october],
      vatPeriod: "quarter",
      vatIndex: null,
      vatFiled: {},
      bookStart: null,
    })
    return () => vi.useRealTimers()
  })

  it("starts on today's quarter, for the title, the figures and the mark", () => {
    const { label, report, current } = period()

    expect(label).toContain("4.")
    expect(report.due).toBe(2_550)
    expect(current.key).toBe("2026-Q4")
  })

  it("starts on today's month for a monthly filer", () => {
    useBookStore.setState({ vatPeriod: "month" })

    expect(period().current.key).toBe("2026-11")
  })

  it("keeps a number too large for the period on the last one", () => {
    useBookStore.setState({ vatIndex: 11 })
    const { label, report, current } = period()

    expect(label).toContain("4.")
    expect(report.due).toBe(2_550)
    expect(current.key).toBe("2026-Q4")
  })

  it("carries a pick across a change of period", () => {
    useBookStore.setState({ vatPeriod: "month", vatIndex: 5 })
    useBookStore.getState().setVatPeriod("quarter")
    expect(useBookStore.getState().vatIndex).toBe(2)

    useBookStore.getState().setVatPeriod("month")
    expect(useBookStore.getState().vatIndex).toBe(4)
  })

  it("owes nothing for the months before the start month", () => {
    useBookStore.setState({ vatPeriod: "month", bookStart: "2026-10" })
    const { periods, statuses } = period()
    const status = (key: string) =>
      statuses[periods.findIndex((p) => p.key === key)]

    expect(status("2026-09")).toBe("before")
    expect(status("2026-01")).toBe("before")
    expect(status("2026-10")).toBe("due")
  })

  it("owes nothing at all before the first entry of a book with none", () => {
    useBookStore.setState({ vatPeriod: "month", entries: [] })

    expect(period().statuses).not.toContain("overdue")
  })

  it("goes back to today after a year, which has no pick to carry", () => {
    useBookStore.setState({ vatPeriod: "month", vatIndex: 5 })
    useBookStore.getState().setVatPeriod("year")
    useBookStore.getState().setVatPeriod("quarter")

    expect(period().current.key).toBe("2026-Q4")
  })
})
