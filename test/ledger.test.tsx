// @vitest-environment jsdom
import * as React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { LedgerView } from "@/components/ledger/ledger-view"
import { TotalsStrip } from "@/components/ledger/totals-strip"
import { defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { NBSP } from "@/lib/domain/money"
import { filterPeriod } from "@/lib/domain/period"
import { indexCategories } from "@/lib/domain/types"
import { ledgerTotals } from "@/lib/domain/vat"
import { useBookStore } from "@/stores/book-store"
import type { Lang } from "@/lib/domain/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/ledger",
}))

function mount(ui: React.ReactElement, lang: Lang = "fi") {
  return render(<LangProvider lang={lang}>{ui}</LangProvider>)
}

/** Load the §10 sample entries straight into the store. */
function loadSampleIntoStore() {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: sampleEntries(createIdFactory("d")),
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    dirty: true,
    fileName: null,
    ledgerQuery: "",
    ledgerType: "all",
    ledgerCat: "all",
    ledgerSort: { key: "date", dir: 1 },
    ledgerPage: 1,
    ledgerSize: 10,
  })
}

/**
 * The Finnish currency string with its no-break spaces flattened.
 *
 * Testing Library normalises whitespace in the *element* text but not in the
 * matcher, so a raw NBSP in the query would never match. One test below
 * asserts the real NBSP separately, so flattening here hides nothing.
 */
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

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
})

describe("TotalsStrip", () => {
  it("shows the §10 year figures", () => {
    const cats = indexCategories(defaultCategories())
    const totals = ledgerTotals(sampleEntries(createIdFactory()), cats)
    mount(<TotalsStrip totals={totals} />)

    expect(screen.getByText("Tulot, veroton")).toBeInTheDocument()
    expect(screen.getByText(eur(1250000))).toBeInTheDocument()
    expect(screen.getByText(eur(185747))).toBeInTheDocument()
    expect(screen.getByText("Maksettava ALV")).toBeInTheDocument()
    expect(screen.getByText(eur(76022))).toBeInTheDocument()
  })

  it("labels a negative balance as refundable", () => {
    const cats = indexCategories(defaultCategories())
    const totals = ledgerTotals(
      [
        {
          id: "e1",
          date: "2026-01-01",
          description: "Osto",
          type: "expense",
          catId: "333",
          amount: 12550,
          vatRate: 25.5,
          amountMode: "gross",
        },
      ],
      cats
    )
    mount(<TotalsStrip totals={totals} />)
    expect(screen.getByText("Palautettava ALV")).toBeInTheDocument()
    expect(screen.getByText(eur(2550))).toBeInTheDocument()
  })
})

describe("LedgerView with the sample data", () => {
  beforeEach(loadSampleIntoStore)

  it("renders the header, period and entry count", () => {
    mount(<LedgerView />)
    expect(
      screen.getByRole("heading", { name: "Kirjanpito", level: 1 })
    ).toBeInTheDocument()
    expect(screen.getByText("Koko vuosi 2026")).toBeInTheDocument()
    expect(screen.getByText("16 kirjausta")).toBeInTheDocument()
  })

  it("paginates at ten rows by default", () => {
    mount(<LedgerView />)
    // One header row plus ten entries.
    expect(screen.getAllByRole("row")).toHaveLength(11)
    expect(screen.getByText("Sivu 1 / 2")).toBeInTheDocument()
  })

  it("sorts by date ascending, so the first row is 8.1.2026", () => {
    mount(<LedgerView />)
    const rows = screen.getAllByRole("row")
    expect(within(rows[1]).getByText("8.1.2026")).toBeInTheDocument()
    expect(
      within(rows[1]).getByText("Lasku 1001 – Mäkinen Rakennus Oy")
    ).toBeInTheDocument()
  })

  it("shows income positive and expenses with a minus", () => {
    mount(<LedgerView />)
    const rows = screen.getAllByRole("row")
    // Row 1 is the 2 510,00 € invoice, row 2 the 186,40 € purchase.
    expect(within(rows[1]).getByText(eur(251000))).toBeInTheDocument()
    expect(within(rows[2]).getByText(`−${eur(18640)}`)).toBeInTheDocument()
  })

  it("filters to October via the month chips", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    await user.click(screen.getByRole("button", { name: /^Loka/ }))

    expect(screen.getByText("Lokakuu 2026")).toBeInTheDocument()
    expect(screen.getByText("3 kirjausta")).toBeInTheDocument()
    // §10, corrected: October's VAT payable is 362,18 €, not 617,18 €.
    expect(screen.getByText(eur(36218))).toBeInTheDocument()
  })

  it("narrows the list with the search box", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    await user.type(
      screen.getByLabelText("Hae selitteestä tai luokasta"),
      "vuokra"
    )

    expect(screen.getByText("3 kirjausta")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(4)
  })

  it("filters by type and offers to clear the filters", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    await user.click(screen.getByRole("button", { name: "Tulot" }))
    expect(screen.getByText("5 kirjausta")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Tyhjennä suodattimet" })
    )
    expect(screen.getByText("16 kirjausta")).toBeInTheDocument()
  })

  it("reverses the order when the date header is clicked", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    await user.click(screen.getByRole("button", { name: /^Päivämäärä/ }))

    const rows = screen.getAllByRole("row")
    expect(within(rows[1]).getByText("30.10.2026")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /^Päivämäärä/ })
    ).toHaveAttribute("aria-sort", "descending")
  })

  it("opens the entry dialog when a row is clicked", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    await user.click(screen.getAllByRole("row")[1])

    const dialog = useBookStore.getState().dialog
    expect(dialog).toMatchObject({ kind: "entry", mode: "edit" })
  })
})

describe("LedgerView in English", () => {
  beforeEach(loadSampleIntoStore)

  it("translates the chrome but keeps Finnish currency (§9)", () => {
    mount(<LedgerView />, "en")
    expect(
      screen.getByRole("heading", { name: "Bookkeeping", level: 1 })
    ).toBeInTheDocument()
    expect(screen.getByText("Whole year 2026")).toBeInTheDocument()
    expect(screen.getByText("16 entries")).toBeInTheDocument()
    // Finnish formatting even in English (§9).
    expect(screen.getByText(eur(1250000))).toBeInTheDocument()
  })

  it("uses real no-break spaces, not plain ones", () => {
    mount(<LedgerView />, "en")
    expect(document.body.textContent).toContain(`12${NBSP}500,00${NBSP}€`)
  })

  it("formats dates as en-GB", () => {
    mount(<LedgerView />, "en")
    const rows = screen.getAllByRole("row")
    expect(within(rows[1]).getByText("8 Jan 2026")).toBeInTheDocument()
  })
})

describe("LedgerView with an empty book", () => {
  it("shows the empty state", () => {
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      year: 2026,
    })
    mount(<LedgerView />)

    expect(screen.getByText("Ei vielä kirjauksia")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Uusi kirjaus" })
    ).toBeInTheDocument()
  })
})

describe("the period slice drives the totals, not the filters", () => {
  beforeEach(loadSampleIntoStore)

  // §8.4: the strip answers "what does this month come to", so a search
  // must not change it even though the entry count does.
  it("keeps the totals steady while a search narrows the list", async () => {
    const user = userEvent.setup()
    mount(<LedgerView />)

    const before = ledgerTotals(
      filterPeriod(useBookStore.getState().entries, {
        kind: "year",
        year: 2026,
      }),
      indexCategories(defaultCategories())
    )

    await user.type(
      screen.getByLabelText("Hae selitteestä tai luokasta"),
      "vuokra"
    )

    expect(screen.getByText("3 kirjausta")).toBeInTheDocument()
    expect(screen.getByText(eur(before.incomeNet))).toBeInTheDocument()
    expect(screen.getByText(eur(before.expenseNet))).toBeInTheDocument()
  })
})
