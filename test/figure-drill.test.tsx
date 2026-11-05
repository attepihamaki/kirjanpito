// @vitest-environment jsdom
import * as React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FigureDialog } from "@/components/common/figure-dialog"
import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { StatementView } from "@/components/statement/statement-view"
import { YearEndDialog } from "@/components/statement/year-end-dialog"
import { VatReturnDialog } from "@/components/vat/vat-return-dialog"
import { VatShell } from "@/components/vat/vat-shell"
import { VatView as VatPage } from "@/components/vat/vat-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/vat",
}))

function mount(ui: React.ReactElement) {
  return render(
    <LangProvider lang="fi">
      {ui}
      <FigureDialog />
    </LangProvider>
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

describe("click-through on the VAT view (§8.18)", () => {
  it("lists the vouchers behind the tax payable", () => {
    mount(
      <VatShell>
        <VatPage />
      </VatShell>
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "Näytä tositteet: Maksettava arvonlisävero",
      })
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Lasku 1005/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Osto – K-Rauta – Tarvikkeet/)).toBeInTheDocument()
    // Bank fees carry no VAT and are not on the return.
    expect(within(dialog).queryByText(/Pankin palvelumaksut/)).toBeNull()
    // The vouchers add up to the figure, so there is no second line.
    expect(within(dialog).queryByText("Ilmoitettava luku")).toBeNull()
  })

  it("opens a voucher from its row and closes the list", () => {
    mount(
      <VatShell>
        <VatPage />
      </VatShell>
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "Näytä tositteet: Maksettava arvonlisävero",
      })
    )
    fireEvent.click(screen.getByText(/Lasku 1005/))
    const state = useBookStore.getState()
    expect(state.figure).toBeNull()
    expect(state.dialog).toMatchObject({ kind: "entry", mode: "edit" })
  })

  it("has no link on a figure of zero", () => {
    mount(
      <VatShell>
        <VatPage />
      </VatShell>
    )
    expect(
      screen.queryByRole("button", {
        name: /Näytä tositteet: Myynnit muihin EU-maihin/,
      })
    ).toBeNull()
  })
})

describe("click-through on the income statement (§8.18)", () => {
  it("lists the vouchers of a line and of the result", () => {
    mount(<StatementView />)
    fireEvent.click(
      screen.getByRole("button", { name: /Näytä tositteet: 343 / })
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getAllByText(/Työtilan vuokra/)).toHaveLength(3)
  })

  it("adds the result's vouchers up to the figure", () => {
    mount(<StatementView />)
    fireEvent.click(
      screen.getByRole("button", {
        name: "Näytä tositteet: 358 Elinkeinotoiminnan tulos",
      })
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).queryByText("Ilmoitettava luku")).toBeNull()
  })
})

describe("click-through in the dialogs (§8.18)", () => {
  it("keeps the VAT return open under the list", () => {
    useBookStore.setState({ dialog: { kind: "vat-return" } })
    render(
      <LangProvider lang="fi">
        <VatReturnDialog />
        <FigureDialog />
      </LangProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))
    fireEvent.click(
      screen.getByRole("button", { name: /Näytä tositteet: 307 / })
    )
    expect(useBookStore.getState().figure).not.toBeNull()
    expect(useBookStore.getState().dialog.kind).toBe("vat-return")
  })

  it("offers vouchers for Form 5's fields but not for typed-in ones", () => {
    useBookStore.setState({ dialog: { kind: "year-end" } })
    render(
      <LangProvider lang="fi">
        <YearEndDialog />
        <FigureDialog />
      </LangProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: /Summat/ }))
    expect(
      screen.getAllByRole("button", { name: /Näytä tositteet: 300 / }).length
    ).toBeGreaterThan(0)
    expect(
      screen.queryByRole("button", { name: /Näytä tositteet: 708 / })
    ).toBeNull()
  })
})

describe("where a voucher counts (§8.18)", () => {
  function openEntry(description: string) {
    const entry = useBookStore
      .getState()
      .entries.find((e) => e.description.startsWith(description))!
    useBookStore.setState({
      dialog: { kind: "entry", mode: "edit", entryId: entry.id },
    })
    render(
      <LangProvider lang="fi">
        <EntryDialog registerDropTarget={() => {}} />
        <FigureDialog />
      </LangProvider>
    )
  }

  it("lists the return field and Form 5 line a sale is part of", () => {
    openEntry("Lasku 1005")
    expect(screen.getByText("Missä tosite näkyy")).toBeInTheDocument()
    expect(screen.getByText("ALV-ilmoitus, Lokakuu 2026")).toBeInTheDocument()
    expect(screen.getByText("Lomake 5, 2026")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^301 / })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^300 / })).toBeInTheDocument()
  })

  it("opens the list behind a line, over the entry dialog", () => {
    openEntry("Lasku 1005")
    fireEvent.click(screen.getByRole("button", { name: /^301 / }))
    const state = useBookStore.getState()
    expect(state.figure?.title).toMatch(/^301 /)
    expect(state.dialog.kind).toBe("entry")
    expect(state.figure?.rows.some((r) => r.entryId === (state.dialog as { entryId: string }).entryId)).toBe(true)
  })

  it("shows nothing for a voucher that counts nowhere", () => {
    useBookStore.setState({
      entries: [
        {
          ...useBookStore.getState().entries[0],
          id: "pay",
          catId: "vat-payment",
          type: "expense",
          vatRate: 0,
        },
      ],
    })
    useBookStore.setState({
      dialog: { kind: "entry", mode: "edit", entryId: "pay" },
    })
    render(
      <LangProvider lang="fi">
        <EntryDialog registerDropTarget={() => {}} />
      </LangProvider>
    )
    expect(screen.queryByText("Missä tosite näkyy")).toBeNull()
  })
})
