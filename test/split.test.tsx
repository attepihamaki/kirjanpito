// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { SplitDialog } from "@/components/entry/split-dialog"
import { LangProvider } from "@/components/lang-provider"
import { LedgerView } from "@/components/ledger/ledger-view"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/ledger",
}))

const receipt: Entry = {
  id: "a",
  voucher: 1,
  date: "2026-03-10",
  description: "K-Rauta",
  type: "expense",
  catId: "333",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
}

function load(entries: Entry[]) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries,
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    dirty: false,
    dialog: { kind: "none" },
    ledgerQuery: "",
    ledgerType: "all",
    ledgerCat: "all",
    ledgerSort: null,
    ledgerPage: 1,
    ledgerSize: 10,
  })
}

const ui = (el: React.ReactElement) =>
  render(<LangProvider lang="fi">{el}</LangProvider>)

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
})

describe("the ledger pill", () => {
  it("names every voucher of a split on each of its parts", () => {
    load([
      { ...receipt, split: "g1" },
      { ...receipt, id: "b", voucher: 2, split: "g1", description: "Lounas" },
      { ...receipt, id: "c", voucher: 3, description: "Muu" },
    ])
    ui(<LedgerView />)
    expect(screen.getAllByText("Jaettu 1, 2")).toHaveLength(2)
    expect(screen.queryByText(/Jaettu 3/)).not.toBeInTheDocument()
  })

  it("shows nothing for a part whose other parts are gone", () => {
    load([{ ...receipt, split: "g1" }])
    ui(<LedgerView />)
    expect(screen.queryByText(/Jaettu/)).not.toBeInTheDocument()
  })
})

const openMenu = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: "Lisää toimintoja" })
  )
  await screen.findByRole("menu")
}

describe("Jaa tosite in the entry dialog", () => {
  const open = (entry: Entry) => {
    load([entry])
    useBookStore.setState({
      dialog: { kind: "entry", mode: "edit", entryId: entry.id },
    })
    ui(<EntryDialog registerDropTarget={() => {}} />)
  }

  it("is offered on an ordinary voucher and opens the split dialog", async () => {
    open(receipt)
    await openMenu()
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Jaa tosite" })
    )
    await waitFor(() =>
      expect(useBookStore.getState().dialog).toEqual({
        kind: "split",
        entryId: "a",
      })
    )
  })

  it("tells a part that payment and files are shared, and offers to merge", async () => {
    load([
      { ...receipt, split: "g1" },
      { ...receipt, id: "b", voucher: 2, split: "g1", description: "Lounas" },
    ])
    useBookStore.setState({
      dialog: { kind: "entry", mode: "edit", entryId: "a" },
    })
    ui(<EntryDialog registerDropTarget={() => {}} />)
    fireEvent.click(screen.getByRole("tab", { name: /Maksu/ }))
    expect(
      screen.getByText(/Maksupäivä, avoin-tila ja käteismaksu/)
    ).toBeVisible()
    expect(screen.getByText(/Liitteet ovat yhteisiä/)).toBeVisible()
    await openMenu()
    expect(
      await screen.findByRole("menuitem", { name: "Yhdistä osa" })
    ).toBeVisible()
  })

  it("says nothing of the kind on an ordinary voucher", async () => {
    open(receipt)
    expect(screen.queryByText(/Liitteet ovat yhteisiä/)).not.toBeInTheDocument()
    await openMenu()
    expect(
      screen.queryByRole("menuitem", { name: "Yhdistä osa" })
    ).not.toBeInTheDocument()
  })

  it("is not offered on an EU purchase or a VAT payment", async () => {
    open({
      ...receipt,
      catId: "344-eu-services",
      amountMode: "net",
      euPurchase: "services",
    })
    await openMenu()
    expect(
      screen.queryByRole("menuitem", { name: "Jaa tosite" })
    ).not.toBeInTheDocument()
  })
})

describe("the split dialog", () => {
  const mount = () => {
    load([receipt])
    useBookStore.setState({ dialog: { kind: "split", entryId: "a" } })
    ui(<SplitDialog />)
  }

  it("carves the part off and links the two", async () => {
    mount()
    const dialog = screen.getByRole("dialog")
    await userEvent.type(
      within(dialog).getByLabelText(/Uuden osan summa/),
      "25"
    )
    expect(within(dialog).getByText(/jää 100,50/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Jaa" }))

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    const [original, part] = useBookStore.getState().entries
    expect(original.amount).toBe(10_050)
    expect(part.amount).toBe(2_500)
    expect(part.split).toBe(original.split)
    expect(original.split).toBeDefined()
    expect(useBookStore.getState().dialog.kind).toBe("none")
  })

  it("keeps the dialog open and says why when the amount is too large", async () => {
    mount()
    const dialog = screen.getByRole("dialog")
    await userEvent.type(
      within(dialog).getByLabelText(/Uuden osan summa/),
      "500"
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Jaa" }))

    expect(
      await within(dialog).findByText(/oltava nollaa suurempi/)
    ).toBeInTheDocument()
    expect(useBookStore.getState().entries).toHaveLength(1)
  })
})
