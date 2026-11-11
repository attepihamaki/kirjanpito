// @vitest-environment jsdom
import * as React from "react"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import {
  AccountListView,
  GeneralLedgerView,
  JournalView,
} from "@/components/ledger/books-view"
import { StatementView } from "@/components/statement/statement-view"
import { YearEndDialog } from "@/components/statement/year-end-dialog"
import { VatReturnDialog } from "@/components/vat/vat-return-dialog"
import { VatShell } from "@/components/vat/vat-shell"
import { SummaryView } from "@/components/summary/summary-view"
import { VatView as VatPage } from "@/components/vat/vat-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
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

/** The calculation as it is routed, with the shell's period strip. */
function VatView() {
  return (
    <VatShell>
      <VatPage />
    </VatShell>
  )
}

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: sampleEntries(createIdFactory("d")),
    cats: defaultCategories(),
    year: 2026,
    vatPeriod: "month",
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

  it("has no period toggle of its own", () => {
    mount(<VatView />)
    expect(screen.queryByRole("button", { name: "Vuosi" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Neljännesvuosi" })).toBeNull()
  })

  it("shows the whole year for a yearly filer", () => {
    useBookStore.setState({ vatPeriod: "year" })
    mount(<VatView />)

    expect(screen.getByText(eur(76022))).toBeInTheDocument()
    expect(screen.getByText("Vuosi 2026")).toBeInTheDocument()
  })

  it("reports EU and reverse-charge sales separately, not as VAT", () => {
    useBookStore.setState({ vatPeriod: "year" })
    mount(<VatView />)

    expect(
      screen.getByText("Tavaroiden myynti muihin EU-maihin")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Palveluiden myynti muihin EU-maihin")
    ).toBeInTheDocument()
    // The row for the retired category appears only while an entry uses it.
    expect(screen.queryByText(/ei merkitty tavaraksi/)).toBeNull()
    // The EU invoice is 3 200,00 € and the reverse-charge one 4 800,00 €.
    expect(screen.getByText(eur(320000))).toBeInTheDocument()
    expect(screen.getByText(eur(480000))).toBeInTheDocument()
  })

  it("leaves a rate with no amount out until asked, and 0 % purchases always", () => {
    useBookStore.setState({ vatPeriod: "year" })
    mount(<VatView />)

    const tables = screen.getAllByRole("table")
    const sales = within(tables[0])
    const purchases = within(tables[1])
    expect(sales.queryByText("0 %")).not.toBeInTheDocument()

    fireEvent.click(
      sales.getByRole("button", { name: /Näytä myös tyhjät verokannat/ })
    )
    fireEvent.click(
      purchases.getByRole("button", { name: /Näytä myös tyhjät verokannat/ })
    )
    expect(sales.getByText("0 %")).toBeInTheDocument()
    expect(purchases.queryByText("0 %")).not.toBeInTheDocument()
  })

  it("stays on October's quarter when the filing period becomes quarterly", () => {
    useBookStore.getState().setVatPeriod("quarter")
    mount(<VatView />)

    // October is in Q4; Q4 is empty beyond October, so the figures match.
    expect(useBookStore.getState().vatIndex).toBe(4)
    expect(screen.getByText(eur(36218))).toBeInTheDocument()
  })

  it("owes nothing for the months before the start month", () => {
    useBookStore.setState({ bookStart: "2026-10", vatIndex: 9 })
    mount(<VatView />)

    // Only the selected one of them is left in the strip, to carry the banner.
    expect(screen.queryByText("Tammi")).toBeNull()
    expect(screen.getAllByText("Ei ilmoitusta")).toHaveLength(1)
    expect(screen.queryByText("Myöhässä")).toBeNull()
    expect(screen.getByText(/ennen kirjanpidon aloituskuukautta/)).toBeVisible()
    expect(
      screen.queryByRole("button", { name: /Merkitse ilmoitetuksi/ })
    ).toBeNull()
  })

  it("carries the VAT note", () => {
    mount(<VatView />)
    expect(
      screen.getByText(/Tarkista luvut ennen ilmoittamista/)
    ).toBeInTheDocument()
  })
})

describe("StatementView", () => {
  it("leaves the way into the return out while the year is running", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 11, 9, 0) })
    useBookStore.setState({ form5Filed: {}, dialog: { kind: "none" } })
    mount(<StatementView />)

    expect(screen.getByText("Tilikausi kesken")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Ilmoita OmaVerossa" })
    ).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it("opens the year-end dialog from the sheet once the year has ended", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2027, 1, 10, 9, 0) })
    useBookStore.setState({ form5Filed: {}, dialog: { kind: "none" } })
    mount(<StatementView />)

    fireEvent.click(screen.getByRole("button", { name: "Ilmoita OmaVerossa" }))

    expect(useBookStore.getState().dialog).toEqual({ kind: "year-end" })
    vi.useRealTimers()
  })

  it("shows a locked year with the date it was marked", () => {
    useBookStore.setState({ year: 2025, form5Filed: { "2025": "2026-03-20" } })
    mount(<StatementView />)

    expect(screen.getByRole("button", { name: "Vuosi lukittu" })).toBeVisible()
    expect(screen.getByText(/Merkitty ilmoitetuksi 20\.3\.2026/)).toBeVisible()
  })

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

  it("renders every line on request, with a dash for the empty ones", () => {
    mount(<StatementView />)
    expect(screen.queryByText("–")).not.toBeInTheDocument()
    expect(screen.queryByText("Maksetut palkat")).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Näytä myös tyhjät rivit (39)" })
    )
    /*
     * All 33 lines render; the sample touches eight, so 25 show a dash. The
     * assets, liabilities and wages below the result add 14 more.
     */
    expect(screen.getAllByText("–")).toHaveLength(39)
    expect(screen.getByText("Elinkeinotoiminnan varat")).toBeInTheDocument()
    expect(screen.getByText("Elinkeinotoiminnan velat")).toBeInTheDocument()
    expect(screen.getByText("Maksetut palkat")).toBeInTheDocument()
    expect(
      screen.getByText("Osingot muista kuin julkisesti noteeratuista yhtiöistä")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Sakot ja muut rangaistusmaksut")
    ).toBeInTheDocument()
    // 354 is listed, and sits before 346 so it stays under its own heading.
    expect(
      screen.getByText("Kirjanpidon ulkopuoliset vähennyskelpoiset kulut")
    ).toBeInTheDocument()
    // Line 312 has no group heading repeating its name (§5).
    expect(screen.getAllByText("Varausten vähennys")).toHaveLength(1)
    // An indent shows where a group ends, so 337 is not read as a staff cost.
    expect(screen.getByText("Eläke- ja henkilösivukulut")).toHaveClass("pl-3")
    expect(screen.getByText("Poistot")).not.toHaveClass("pl-3")
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

    expect(screen.getAllByText("359 Elinkeinotoiminnan tappio")).toHaveLength(2)
    // Positive, as form 5 expects (§6.3).
    expect(screen.getAllByText(eur(50000))).toHaveLength(2)
  })

  it("translates the lines into English while keeping Finnish money", () => {
    mount(<StatementView />, "en")
    expect(screen.getByText("Net sales")).toBeInTheDocument()
    // Once at the head of the sheet and once on the result line.
    expect(screen.getAllByText("358 Business profit")).toHaveLength(2)
    expect(screen.getAllByText(eur(1064253))).toHaveLength(2)
  })
})

describe("YearEndDialog", () => {
  const openDialog = () => {
    useBookStore.setState({ dialog: { kind: "year-end" } })
    return mount(<YearEndDialog />)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2027, 1, 10, 9, 0))
  })
  afterEach(() => vi.useRealTimers())

  it("walks through the topics, each with its own findings", () => {
    openDialog()
    expect(
      screen.getByText("Vuoden 2026 ilmoitus OmaVeroon")
    ).toBeInTheDocument()
    // The sample year has entries without a receipt, and no year-end figures.
    expect(screen.getByText(/ilman liitettä/i)).toBeInTheDocument()
    expect(
      screen.queryByText("Vuoden lopun varat ja velat puuttuvat")
    ).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Varat ja velat$/ }))
    expect(
      screen.getByText("Vuoden lopun varat ja velat puuttuvat")
    ).toBeInTheDocument()
    expect(screen.queryByText(/ilman liitettä/i)).toBeNull()
  })

  it("lists the fields in the form's order and copies an amount by its code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))

    // It opens on the fields to fill in, then the totals to check.
    expect(screen.getByText("Liikevaihto")).toBeInTheDocument()
    expect(screen.queryByText("Saadut avustukset ja tuet")).toBeNull()
    expect(
      screen.getByText("Elinkeinotoiminnan veronalaiset tuotot yhteensä")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^Kopioi kohta 358:/ })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Kopioi kohta 300: 12500,00" })
    )
    expect(writeText).toHaveBeenCalledWith("12500,00")
    expect(
      await screen.findByRole("button", {
        name: "Kopioitu: kohta 300, 12500,00. Kopioi uudelleen",
      })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^Kaikki kohdat/ }))
    expect(screen.getByText("Saadut avustukset ja tuet")).toBeInTheDocument()
    expect(screen.getByText("Maksetut palkat")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^Kopioi kohta 318:/ })
    ).toBeNull()
  })

  it("adds the year-end figures to the fields and totals to fill in", () => {
    useBookStore.setState({
      yearEnd: { 2026: { ...EMPTY_YEAR_END, goods: 120_000 } },
    })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))

    expect(
      screen.getByRole("button", { name: "Kopioi kohta 708: 1200,00" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Elinkeinotoiminnan varat yhteensä")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Elinkeinotoiminnan positiivinen nettovarallisuus")
    ).toBeInTheDocument()
  })

  it("locks the year in one step and the mark can be undone", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Lukitus/ }))
    fireEvent.click(
      screen.getByRole("button", { name: "Merkitse ilmoitetuksi ja lukitse" })
    )

    expect(useBookStore.getState().form5Filed["2026"]).toBe("2027-02-10")
    // The dialog stays open on the retention package step.
    expect(useBookStore.getState().dialog.kind).toBe("year-end")
    expect(
      screen.getByRole("button", { name: "Säilytyspaketti" })
    ).toBeEnabled()
  })

  it("keeps the retention package disabled until the year is filed", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Säilytys$/ }))

    expect(
      screen.getByRole("button", { name: "Säilytyspaketti" })
    ).toBeDisabled()
  })

  it("will not lock a year that has not ended", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 9, 0))
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Lukitus/ }))

    expect(
      screen.getByRole("button", { name: "Merkitse ilmoitetuksi ja lukitse" })
    ).toBeDisabled()
  })
})

describe("VatReturnDialog", () => {
  const openDialog = () => {
    useBookStore.setState({ dialog: { kind: "vat-return" } })
    return mount(<VatReturnDialog />)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 20, 9, 0))
  })
  afterEach(() => vi.useRealTimers())

  it("opens on the checks and lists what stands in the way", () => {
    openDialog()
    expect(
      screen.getByText("Arvonlisäveroilmoitus: Lokakuu 2026")
    ).toBeInTheDocument()
    expect(screen.getByText(/ilman liitettä/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Aiempia kausia ei ole merkitty/)
    ).toBeInTheDocument()
  })

  it("will not mark a period that has not closed", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 9, 0))
    openDialog()
    expect(screen.getByText("Lokakuu 2026 on vielä kesken")).toBeInTheDocument()
  })

  it("lists October's fields and copies an amount", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))

    // Only the fields with an amount, then the payable tax to check against.
    expect(screen.getByText("25,5 %:n vero (myös 24 %)")).toBeInTheDocument()
    expect(screen.getByText("Verokauden vähennettävä vero")).toBeInTheDocument()
    expect(screen.queryByText("10 %:n vero")).toBeNull()
    expect(screen.getByText("Maksettava vero")).toBeInTheDocument()
    expect(screen.getByText(eur(36218))).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^Kopioi kohta 308:/ })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Kopioi kohta 301: 382,50" })
    )
    expect(writeText).toHaveBeenCalledWith("382,50")
    expect(await screen.findByText("1/2 kopioitu")).toBeInTheDocument()
  })

  it("offers no activity for a period with nothing to fill in", () => {
    useBookStore.setState({ vatIndex: 8 })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))
    expect(screen.getByText(/Ei toimintaa verokaudella/)).toBeInTheDocument()
  })

  it("warns about a sales rate the return has no field for", () => {
    useBookStore.setState({
      entries: [
        {
          id: "x",
          date: "2026-10-05",
          description: "Vanha verokanta",
          type: "income",
          catId: "300-domestic",
          amount: 10000,
          vatRate: 22,
          amountMode: "net",
        },
      ],
    })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))
    expect(screen.getByText(/ei ole kohtaa/)).toBeInTheDocument()
  })

  it("marks the period as filed and the mark can be removed", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Merkintä/ }))
    fireEvent.click(
      screen.getByRole("button", { name: "Merkitse ilmoitetuksi" })
    )
    expect(useBookStore.getState().vatFiled["2026-10"]).toBe("2026-11-20")

    fireEvent.click(screen.getByRole("button", { name: "Poista merkintä" }))
    expect(useBookStore.getState().vatFiled["2026-10"]).toBeUndefined()
  })

  it("opens a filed period on the payment still to book", () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-11-12" } })
    openDialog()
    expect(screen.getByText("Ilmoitettu 12.11.2026")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Kirjaa maksu tai palautus" })
    ).toBeInTheDocument()
    /* The checks stay one click away. */
    expect(screen.getByRole("button", { name: /Tarkistukset/ })).toBeVisible()
  })

  it("opens an unfiled period on the checks, without the chip", () => {
    openDialog()
    expect(screen.queryByText(/^Ilmoitettu /)).toBeNull()
    expect(
      screen.queryByRole("heading", { name: "Kirjaa maksu tai palautus" })
    ).toBeNull()
  })

  it("shows the due date of the payment, and says when it has passed", () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-11-12" } })
    const { unmount } = openDialog()
    expect(screen.getByText("Eräpäivä 14.12.2026")).toBeInTheDocument()
    unmount()

    vi.setSystemTime(new Date(2027, 0, 5, 9, 0))
    openDialog()
    expect(
      screen.getByText(/Eräpäivä 14.12.2026 on mennyt/)
    ).toBeInTheDocument()
  })

  it("marks the period on the date chosen and keeps the figures it had", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Merkintä/ }))
    const date = screen.getByLabelText("Ilmoituspäivä")
    fireEvent.change(date, { target: { value: "12.11.2026" } })
    fireEvent.blur(date)
    fireEvent.click(
      screen.getByRole("button", { name: "Merkitse ilmoitetuksi" })
    )
    const state = useBookStore.getState()
    expect(state.vatFiled["2026-10"]).toBe("2026-11-12")
    expect(
      Object.keys(state.vatFiledFigures["2026-10"]).length
    ).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Poista merkintä" }))
    expect(useBookStore.getState().vatFiledFigures["2026-10"]).toBeUndefined()
  })

  it("refuses a filing date before the period ended or after today", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Merkintä/ }))
    const mark = screen.getByRole("button", { name: "Merkitse ilmoitetuksi" })
    const date = screen.getByLabelText("Ilmoituspäivä")
    for (const value of ["15.10.2026", "21.11.2026"]) {
      fireEvent.change(date, { target: { value } })
      fireEvent.blur(date)
      expect(mark).toBeDisabled()
    }
    fireEvent.change(date, { target: { value: "12.11.2026" } })
    fireEvent.blur(date)
    expect(mark).toBeEnabled()
  })

  it("shows what changed since the return was filed", () => {
    useBookStore.setState({
      vatFiled: { "2026-10": "2026-11-12" },
      vatFiledFigures: { "2026-10": { "301": 1 } },
    })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Merkintä/ }))
    expect(
      screen.getByText("Luvut ovat muuttuneet ilmoittamisen jälkeen")
    ).toBeInTheDocument()
  })

  it("keeps the payment details in the book and offers them to copy", () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Maksu/ }))
    fireEvent.click(screen.getByRole("button", { name: "Muokkaa" }))
    fireEvent.change(screen.getByLabelText("Verotilin IBAN"), {
      target: { value: "FI21 1234 5600 0007 85" },
    })
    fireEvent.change(screen.getByLabelText("Viitenumero"), {
      target: { value: "1234567" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))
    expect(useBookStore.getState().taxPayment).toEqual({
      iban: "FI21 1234 5600 0007 85",
      reference: "1234567",
    })
    expect(
      screen.getByRole("button", { name: /Kopioi: Viitenumero/ })
    ).toBeInTheDocument()
  })

  it("disables the filed button on a period still to come, and says why", () => {
    useBookStore.setState({ year: 2999, vatIndex: 1 })
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Merkintä/ }))

    const button = screen.getByRole("button", {
      name: "Merkitse ilmoitetuksi",
    })
    expect(button).toBeDisabled()
    expect(screen.getByText(/on vielä kesken/)).toBeVisible()
    expect(useBookStore.getState().vatFiled).toEqual({})
  })

  it("books the payment from the last step", async () => {
    openDialog()
    fireEvent.click(screen.getByRole("button", { name: /Maksu/ }))
    fireEvent.click(screen.getByRole("button", { name: "Kirjaa maksu" }))
    await waitFor(() =>
      expect(useBookStore.getState().dialog).toMatchObject({
        kind: "entry",
        prefill: { catId: "vat-payment", settles: "2026-10" },
      })
    )
  })

  it("has no payment step for a nil return", () => {
    useBookStore.setState({ vatIndex: 8 })
    openDialog()
    expect(screen.queryByRole("button", { name: /Maksu/ })).toBeNull()
  })
})

describe("the way into the VAT return dialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 20, 9, 0))
  })
  afterEach(() => vi.useRealTimers())

  it("opens from the calculation's banner", () => {
    mount(<VatView />)
    fireEvent.click(screen.getByRole("button", { name: "Ilmoita OmaVerossa" }))
    expect(useBookStore.getState().dialog.kind).toBe("vat-return")
  })

  it("shows a filed period with its date", () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-11-12" } })
    mount(<VatView />)
    expect(
      screen.getByRole("button", { name: "Kirjaa maksu" })
    ).toBeInTheDocument()
    expect(screen.getByText(/Merkitty ilmoitetuksi/)).toBeInTheDocument()
  })
})

describe("journal and general ledger (§8.4)", () => {
  it("prints the journal by month with the year's totals", () => {
    mount(<JournalView />)
    expect(
      screen.getByRole("heading", { name: "Päiväkirja 2026" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Lokakuu" })
    ).toBeInTheDocument()
    const income = screen.getByRole("row", { name: /Tulot yhteensä/ })
    expect(flattenSpaces(income.textContent ?? "")).toContain(eur(1_250_000))
    expect(screen.getByText(/Kirjanpitolaki 2:10/)).toBeInTheDocument()
  })

  it("prints the general ledger by account", () => {
    mount(<GeneralLedgerView />)
    expect(
      screen.getByRole("heading", { name: "Pääkirja 2026" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /343s*Vuokrat/ })
    ).toBeInTheDocument()
  })

  it("ends the account list with what to do when the business closes", () => {
    mount(<AccountListView />)
    expect(screen.getByText(/Y6-lomake YTJ:ssä/)).toBeInTheDocument()
  })

  it("says so when the year has no entries", () => {
    useBookStore.setState({ year: 2025 })
    mount(<JournalView />)
    expect(screen.getByText("Ei tositteita vuonna 2025")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Uusi tosite/ })).toBeVisible()
  })

  it("offers a first step on the VAT, summary and statement views too", () => {
    useBookStore.setState({ year: 2025 })
    for (const View of [VatPage, SummaryView, StatementView]) {
      const { unmount } = mount(<View />)
      expect(screen.getByText("Ei tositteita vuonna 2025")).toBeVisible()
      expect(screen.getByRole("button", { name: /Uusi tosite/ })).toBeVisible()
      unmount()
    }
  })
})
