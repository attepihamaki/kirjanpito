// @vitest-environment jsdom
import * as React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { StatementView } from "@/components/statement/statement-view"
import { VatView } from "@/components/vat/vat-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { useBookStore } from "@/stores/book-store"
import type { Lang } from "@/lib/domain/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/vat",
}))

const flattenSpaces = (text: string) =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code === 0xa0 || code === 0x202f ? " " : ch
    })
    .join("")

const eur = (cents: number) =>
  flattenSpaces(
    new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100)
  )

function mount(ui: React.ReactElement, lang: Lang = "fi") {
  return render(<LangProvider lang={lang}>{ui}</LangProvider>)
}

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: sampleEntries(createIdFactory("d")),
    cats: defaultCategories(),
    year: 2026,
    vatMode: "month",
    vatIndex: 10,
  })
})

describe("VatView", () => {
  /*
   * The only October sale is 1 882,50 € gross at 25,5 %, so sales VAT is
   * 382,50 € and the payable 362,18 € (§10).
   */
  it("shows October's corrected figures", () => {
    mount(<VatView />)
    expect(screen.getByText("Maksettava arvonlisävero")).toBeInTheDocument()
    expect(screen.getByText(eur(36218))).toBeInTheDocument()
    expect(
      screen.getByText(
        `Myynnin vero ${eur(38250)} − ostojen vähennettävä vero ${eur(2032)}`
      )
    ).toBeInTheDocument()
  })

  it("switches to the whole year", async () => {
    const user = userEvent.setup()
    mount(<VatView />)

    await user.click(screen.getByRole("button", { name: "Vuosi" }))

    expect(screen.getByText(eur(76022))).toBeInTheDocument()
    expect(screen.getByText("Vuosi 2026")).toBeInTheDocument()
  })

  it("reports EU and reverse-charge sales separately, not as VAT", async () => {
    const user = userEvent.setup()
    mount(<VatView />)
    await user.click(screen.getByRole("button", { name: "Vuosi" }))

    expect(
      screen.getByText("Tavaroiden ja palveluiden myynti muihin EU-maihin")
    ).toBeInTheDocument()
    // The EU invoice is 3 200,00 € and the reverse-charge one 4 800,00 €.
    expect(screen.getByText(eur(320000))).toBeInTheDocument()
    expect(screen.getByText(eur(480000))).toBeInTheDocument()
  })

  it("hides the 0 % row on purchases but keeps it on sales", async () => {
    const user = userEvent.setup()
    mount(<VatView />)
    await user.click(screen.getByRole("button", { name: "Vuosi" }))

    const tables = screen.getAllByRole("table")
    const sales = within(tables[0])
    const purchases = within(tables[1])
    expect(sales.getByText("0 %")).toBeInTheDocument()
    expect(purchases.queryByText("0 %")).not.toBeInTheDocument()
  })

  it("clamps the period index when switching to quarters", async () => {
    const user = userEvent.setup()
    mount(<VatView />)

    await user.click(screen.getByRole("button", { name: "Neljännesvuosi" }))

    // October is in Q4; Q4 is empty beyond October, so the figures match.
    expect(useBookStore.getState().vatIndex).toBe(4)
    expect(screen.getByText(eur(36218))).toBeInTheDocument()
  })

  it("carries the VAT note", () => {
    mount(<VatView />)
    expect(
      screen.getByText(/Tarkista luvut ennen ilmoittamista/)
    ).toBeInTheDocument()
  })
})

describe("StatementView", () => {
  it("shows the §10 result on line 358", () => {
    mount(<StatementView />)
    const result = screen.getByRole("row", {
      name: /358 Elinkeinotoiminnan tulos/,
    })
    expect(within(result).getByText(eur(1064253))).toBeInTheDocument()
    /*
     * 12 500,00 € shows three times over: the revenue section total, line
     * 300 itself, and the "Tuotot yhteensä" footer.
     */
    expect(screen.getAllByText(eur(1250000))).toHaveLength(3)
    expect(
      screen.getByText("Vähennyskelpoiset kulut yhteensä")
    ).toBeInTheDocument()
  })

  it("renders every line, with a dash for the empty ones", () => {
    mount(<StatementView />)
    // All 29 lines render; the sample touches eight, so 21 show a dash.
    expect(screen.getAllByText("–")).toHaveLength(21)
    expect(screen.getByText("Saadut osingot")).toBeInTheDocument()
    expect(
      screen.getByText("Sakot ja muut rangaistusmaksut")
    ).toBeInTheDocument()
    // 354 is listed, and sits before 346 so it stays under its own heading.
    expect(
      screen.getByText("Kirjanpidon ulkopuoliset vähennyskelpoiset kulut")
    ).toBeInTheDocument()
    // "Varausten vähennys" is both a group heading and line 312 (§5).
    expect(screen.getAllByText("Varausten vähennys")).toHaveLength(2)
  })

  it("covers the period 1.1.-31.12.", () => {
    mount(<StatementView />)
    expect(screen.getByText(/1\.1\.2026/)).toBeInTheDocument()
  })

  it("reports a loss on 359 as a positive figure", () => {
    useBookStore.setState({
      entries: [
        {
          id: "a",
          date: "2026-01-01",
          description: "Myynti",
          type: "income",
          catId: "300-domestic",
          amount: 100000,
          vatRate: 0,
          amountMode: "net",
        },
        {
          id: "b",
          date: "2026-01-02",
          description: "Osto",
          type: "expense",
          catId: "333",
          amount: 150000,
          vatRate: 0,
          amountMode: "net",
        },
      ],
    })
    mount(<StatementView />)

    expect(
      screen.getByText("359 Elinkeinotoiminnan tappio")
    ).toBeInTheDocument()
    // Positive, as form 5 expects (§6.3).
    expect(screen.getByText(eur(50000))).toBeInTheDocument()
  })

  it("translates the lines into English while keeping Finnish money", () => {
    mount(<StatementView />, "en")
    expect(screen.getByText("Business revenue")).toBeInTheDocument()
    expect(screen.getByText("358 Business profit")).toBeInTheDocument()
    expect(screen.getByText(eur(1064253))).toBeInTheDocument()
  })
})
