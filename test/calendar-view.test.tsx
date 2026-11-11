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

  it("lists a YEL date for a chosen month and asks for the months still missing", () => {
    useBookStore.setState({ payMonths: { ...NO_PAY_MONTHS, yel: [7] } })
    mount()
    expect(screen.getByText("YEL-maksu")).toBeInTheDocument()
    expect(screen.getByText("Puuttuuko jotain?")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "YEL-maksut" })).toBeNull()
    expect(screen.getByRole("link", { name: "Ennakkovero" })).toHaveAttribute(
      "href",
      "/app/settings/calendar"
    )
  })

  it("links to the settings under the list once both sets of months are chosen", () => {
    useBookStore.setState({
      payMonths: { ...NO_PAY_MONTHS, yel: [7], advanceTax: [3] },
    })
    mount()
    expect(screen.queryByText("Puuttuuko jotain?")).toBeNull()
    expect(screen.getByRole("link", { name: /asetuksissa/ })).toHaveAttribute(
      "href",
      "/app/settings/calendar"
    )
  })

  it("folds the filed returns of the past under the dates still ahead", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 11, 9, 0) })
    useBookStore.setState({
      bookStart: "2026-07",
      vatFiled: { "2026-07": "2026-09-01" },
    })
    mount()

    const fold = screen.getByRole("button", {
      name: /Hoidetut tänä vuonna · 1/,
    })
    expect(fold).toHaveAttribute("aria-expanded", "false")
    // August's return fell due in October and is not filed, so it is late.
    expect(screen.getByRole("heading", { name: "Myöhässä" })).toBeTruthy()
    const august = screen.getByText("ALV-ilmoitus, Elokuu 2026")
    expect(
      fold.compareDocumentPosition(august) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
    const july = screen.getByText("ALV-ilmoitus, Heinäkuu 2026")
    expect(
      fold.compareDocumentPosition(july) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    vi.useRealTimers()
  })
})
