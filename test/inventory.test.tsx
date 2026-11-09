// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InventoryView } from "@/components/inventory/inventory-view"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import { EMPTY_INVENTORY, type StockItem } from "@/lib/domain/inventory"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))

function row(over: Partial<StockItem> = {}): StockItem {
  return {
    id: "s1",
    name: "Kahvi",
    sku: "K-1",
    unit: "kpl",
    kind: "goods",
    quantityMilli: 10_000,
    unitCents: 500,
    layers: [],
    lowerUnitCents: null,
    lowerReason: "",
    ...over,
  }
}

function mount() {
  return render(
    <LangProvider lang="fi">
      <InventoryView />
    </LangProvider>
  )
}

beforeEach(() => {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    form5Filed: {},
    inventory: EMPTY_INVENTORY,
    dirty: false,
    dialog: { kind: "none" },
  })
})

describe("the stocktake page", () => {
  it("offers last year's list when this year has none", () => {
    useBookStore.setState({
      inventory: { method: "average", years: { "2025": [row()] } },
    })
    mount()
    expect(
      screen.getByRole("button", { name: "Aloita vuoden 2025 listasta" })
    ).toBeEnabled()
  })

  it("adds a row and values it from what is typed", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("button", { name: "Lisää rivi" }))

    await user.type(screen.getByRole("textbox", { name: "Nimi" }), "Paita")
    await user.tab()
    await user.type(screen.getByRole("textbox", { name: "Määrä" }), "3")
    await user.tab()
    await user.type(
      screen.getByRole("textbox", { name: "Yksikköhinta" }),
      "19,90"
    )
    await user.tab()

    const [stored] = useBookStore.getState().inventory.years["2026"]
    expect(stored).toMatchObject({
      name: "Paita",
      quantityMilli: 3000,
      unitCents: 1990,
    })
    expect(useBookStore.getState().dirty).toBe(true)
    expect(screen.getAllByText(/59,70/).length).toBeGreaterThan(0)
  })

  it("replaces the zero of a number when the field is entered", async () => {
    const user = userEvent.setup()
    useBookStore.setState({
      inventory: {
        method: "average",
        years: { "2026": [row({ unitCents: 0 })] },
      },
    })
    mount()
    await user.click(screen.getByRole("textbox", { name: "Yksikköhinta" }))
    await user.keyboard("4,50")
    await user.tab()
    expect(useBookStore.getState().inventory.years["2026"][0].unitCents).toBe(
      450
    )
  })

  it("keeps the old value when the text cannot be read", async () => {
    const user = userEvent.setup()
    useBookStore.setState({
      inventory: { method: "average", years: { "2026": [row()] } },
    })
    mount()
    const field = screen.getByRole("textbox", { name: "Määrä" })
    await user.click(field)
    await user.keyboard("abc")
    await user.tab()
    expect(field).toHaveValue("10")
    expect(
      useBookStore.getState().inventory.years["2026"][0].quantityMilli
    ).toBe(10_000)
  })

  it("shows the write-down and flags a lower value with no reason", async () => {
    useBookStore.setState({
      inventory: {
        method: "average",
        years: {
          "2026": [row({ lowerUnitCents: 300 })],
        },
      },
    })
    mount()
    expect(
      screen.getByText("Alemmalle arvolle ei ole annettu syytä.")
    ).toBeInTheDocument()
    expect(screen.getAllByText(/20,00/).length).toBeGreaterThan(0)
  })

  it("locks the list once Form 5 is filed", () => {
    useBookStore.setState({
      form5Filed: { "2026": "2027-03-01" },
      inventory: { method: "average", years: { "2026": [row()] } },
    } as never)
    mount()
    expect(screen.getByRole("button", { name: "Lisää rivi" })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: "Nimi" })).toBeDisabled()
  })

  it("filters the rows by name or code", async () => {
    useBookStore.setState({
      inventory: {
        method: "average",
        years: {
          "2026": [row(), row({ id: "s2", name: "Tee", sku: "T-9" })],
        },
      },
    })
    mount()
    expect(screen.getAllByRole("textbox", { name: "Nimi" })).toHaveLength(2)
    fireEvent.change(screen.getByPlaceholderText("Hae nimellä tai koodilla"), {
      target: { value: "t-9" },
    })
    await waitFor(() =>
      expect(screen.getAllByRole("textbox", { name: "Nimi" })).toHaveLength(1)
    )
  })
})
