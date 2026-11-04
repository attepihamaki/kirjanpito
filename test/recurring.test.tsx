// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import {
  RecurringDialog,
  RecurringNotice,
} from "@/components/ledger/recurring-dialog"
import { AssetsView } from "@/components/statement/assets-view"
import { DeductionsView } from "@/components/statement/deductions-view"
import { defaultCategories } from "@/lib/domain/accounts"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))

const rent: RecurringEntry = {
  id: "r1",
  description: "Vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  day: 20,
  from: "2026-01",
}

const entry: Entry = {
  id: "a",
  voucher: 1,
  date: "2026-03-10",
  description: "Vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
}

function mount(ui: React.ReactElement) {
  return render(<LangProvider lang="fi">{ui}</LangProvider>)
}

beforeEach(() => {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    month: 3,
    vatFiled: {},
    recurring: [],
    assetOpening: null,
    dirty: false,
    dialog: { kind: "none" },
  })
})

describe("recurring entries", () => {
  it("offers a month's missing entries and adds the ticked ones", async () => {
    useBookStore.setState({ recurring: [rent] })
    mount(
      <>
        <RecurringNotice />
        <RecurringDialog />
      </>
    )
    fireEvent.click(screen.getByRole("button", { name: "Tarkista ja lisää" }))
    fireEvent.click(
      await screen.findByRole("button", { name: "Lisää 1 tosite" })
    )

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(1))
    const [added] = useBookStore.getState().entries
    expect(added.date).toBe("2026-03-20")
    expect(added.voucher).toBe(1)
    expect(useBookStore.getState().dialog.kind).toBe("none")
    expect(screen.queryByText(/lisäämättä/)).not.toBeInTheDocument()
  })

  it("explains the box on request and leaves it unticked", async () => {
    useBookStore.setState({
      entries: [entry],
      dialog: { kind: "entry", mode: "edit", entryId: "a" },
    })
    mount(<EntryDialog registerDropTarget={() => {}} />)
    expect(screen.queryByText(/Mikään ei kirjaudu/)).toBeNull()

    fireEvent.click(screen.getByLabelText("Mitä toistaminen tekee?"))

    expect(await screen.findByText(/Mikään ei kirjaudu/)).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", {
        name: "Toista joka kuukausi",
        hidden: true,
      })
    ).not.toBeChecked()
  })

  it("makes a template from an entry", async () => {
    useBookStore.setState({
      entries: [entry],
      dialog: { kind: "entry", mode: "edit", entryId: "a" },
    })
    mount(<EntryDialog registerDropTarget={() => {}} />)
    const box = screen.getByRole("checkbox", { name: "Toista joka kuukausi" })
    fireEvent.click(box)
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))
    await waitFor(() =>
      expect(useBookStore.getState().recurring).toHaveLength(1)
    )
    expect(useBookStore.getState().recurring[0]).toMatchObject({
      description: "Vuokra",
      day: 10,
      from: "2026-03",
    })
  })
})

describe("an entry with a template", () => {
  it("removes the template when the box is unticked", async () => {
    useBookStore.setState({
      entries: [entry],
      recurring: [rent],
      dialog: { kind: "entry", mode: "edit", entryId: "a" },
    })
    mount(<EntryDialog registerDropTarget={() => {}} />)
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Toista joka kuukausi" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))
    await waitFor(() => expect(useBookStore.getState().recurring).toEqual([]))
  })
})

describe("the statement's new pages", () => {
  it("books the year's maximum depreciation by default", async () => {
    useBookStore.setState({
      entries: [
        { ...entry, catId: "asset-purchase", amount: 1_000_000, vatRate: 0 },
      ],
    })
    mount(<AssetsView />)
    fireEvent.click(screen.getByRole("button", { name: "Kirjaa poisto" }))

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    const booked = useBookStore
      .getState()
      .entries.find((e) => e.catId === "337")
    expect(booked?.amount).toBe(250_000)
  })

  it("books a mileage deduction on line 354, less the booked costs", async () => {
    useBookStore.setState({
      entries: [{ ...entry, catId: "344-vehicle", amount: 10_000, vatRate: 0 }],
    })
    mount(<DeductionsView />)
    fireEvent.change(screen.getByLabelText("Työajot, km"), {
      target: { value: "1000" },
    })
    fireEvent.click(
      screen.getAllByRole("button", { name: "Kirjaa vähennys" })[0]
    )

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    const booked = useBookStore
      .getState()
      .entries.find((e) => e.catId === "354")
    // 1 000 km × 0,55 € − 100,00 €.
    expect(booked?.amount).toBe(45_000)
    expect(booked?.vatRate).toBe(0)
  })

  it("says so when the app has no amounts for the year", () => {
    useBookStore.setState({ year: 2010 })
    mount(<DeductionsView />)
    expect(
      screen.getByText(/matkakorvausten määriä vuodelle 2010/)
    ).toBeVisible()
    expect(
      screen.getByText(/työhuonevähennyksen määrää vuodelle 2010/)
    ).toBeVisible()
  })
})
