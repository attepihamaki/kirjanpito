// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CalendarView } from "@/components/calendar/calendar-view"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import { NO_PAY_MONTHS } from "@/lib/domain/tax-calendar"
import { useBookStore } from "@/stores/book-store"

/* The tax calendar lists the year's due dates and takes the payment months (§8.22). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function mount() {
  render(
    <LangProvider lang="fi">
      <CalendarView />
    </LangProvider>
  )
}

describe("tax calendar", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      year: 2026,
      vatPeriod: "month",
      bookStart: "2026-10",
      vatFiled: {},
      form5Filed: {},
      payMonths: NO_PAY_MONTHS,
    })
  })

  it("lists the VAT returns from the start month, without Form 5 for a year before the book began", () => {
    mount()
    expect(screen.getByText("ALV-ilmoitus, Lokakuu 2026")).toBeInTheDocument()
    expect(
      screen.queryByText("Lomake 5, verovuosi 2025")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("ALV-ilmoitus, Syyskuu 2026")
    ).not.toBeInTheDocument()
  })

  it("lists Form 5 for the previous year when the book began before it", () => {
    useBookStore.setState({ bookStart: "2025-01" })
    mount()
    expect(screen.getByText("Lomake 5, verovuosi 2025")).toBeInTheDocument()
  })

  it("lists a YEL date for a chosen month and links to the settings", () => {
    useBookStore.setState({ payMonths: { ...NO_PAY_MONTHS, yel: [7] } })
    mount()
    expect(screen.getByText("YEL-maksu")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /asetuksissa/ })).toHaveAttribute(
      "href",
      "/app/settings/calendar"
    )
  })
})
