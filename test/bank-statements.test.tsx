// @vitest-environment jsdom
import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BankImportDialog } from "@/components/bank/bank-import-dialog"
import { LangProvider } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* Saved statement layouts (§8.16) and the statements kept for reconciliation (§8.38). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/ledger",
}))
vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

const cost = (over: Partial<Entry> = {}): Entry => ({
  id: "c1",
  date: "2026-11-03",
  description: "Kauppa Oy",
  type: "expense",
  catId: "333",
  amount: 1290,
  vatRate: 0,
  amountMode: "gross",
  paidOn: null,
  ...over,
})

const FILE = "Date;Amount;Name\n2026-11-05;-12,90;Kauppa Oy"

function open(text = FILE, fileName = "nordea-2026-11.csv") {
  useBookStore.setState({
    dialog: { kind: "bank-import", text, fileName },
  })
  return render(
    <LangProvider lang="fi">
      <BankImportDialog />
    </LangProvider>
  )
}

beforeEach(() => {
  vi.spyOn(toast, "add").mockImplementation(() => "t1")
  useBookStore.setState({
    open: true,
    hydrated: true,
    archiveYear: null,
    cats: defaultCategories(),
    entries: [cost()],
    invoices: [],
    yearsArchived: {},
    form5Filed: {},
    vatFiled: {},
    categoryRules: [],
    bankSeen: [],
    bankMappings: [],
    bankStatements: [],
  })
})

afterEach(cleanup)

describe("saved statement layouts", () => {
  it("keeps the columns chosen and reads the next file with them", async () => {
    const first = open()
    expect(
      await screen.findByText("Sarakkeet päätelty otsikoista.")
    ).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Vaihda sarakkeet" }))
    const name = screen.getByRole("textbox", { name: /Muodon nimi/ })
    expect((name as HTMLInputElement).value).toBe("nordea")
    fireEvent.change(name, { target: { value: "Nordea" } })
    fireEvent.click(
      screen.getByRole("button", { name: "Käytä näitä sarakkeita" })
    )

    const [kept] = useBookStore.getState().bankMappings
    expect(kept).toMatchObject({
      name: "Nordea",
      mapping: { date: "Date", amount: "Amount", counterparty: "Name" },
    })
    expect(
      await screen.findByText("Luettu tallennetulla muodolla ”Nordea”.")
    ).toBeTruthy()

    first.unmount()
    open("Name;Amount;Date\nKauppa Oy;-1,00;2026-11-06", "toinen.csv")
    expect(
      await screen.findByText("Luettu tallennetulla muodolla ”Nordea”.")
    ).toBeTruthy()
  })
})

describe("statements kept for reconciliation", () => {
  it("keeps a record of a booked statement with the book as booked", async () => {
    open()
    fireEvent.click(await screen.findByRole("button", { name: /^Kirjaa/ }))
    await vi.waitFor(() =>
      expect(useBookStore.getState().bankStatements).toHaveLength(1)
    )
    expect(useBookStore.getState().bankStatements[0]).toMatchObject({
      from: "2026-11-05",
      to: "2026-11-05",
      rows: 1,
      movement: -1290,
      bookMovement: -1290,
      fileName: "nordea-2026-11.csv",
    })
  })

  it("keeps a statement with nothing left to book", async () => {
    useBookStore.setState({ entries: [cost({ paidOn: "2026-11-05" })] })
    open()
    fireEvent.click(
      await screen.findByRole("button", { name: "Tallenna täsmäytykseen" })
    )
    expect(useBookStore.getState().bankStatements).toHaveLength(1)
    expect(useBookStore.getState().bankStatements[0].bookMovement).toBe(-1290)
  })
})
