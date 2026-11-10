// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import { todayIso } from "@/lib/domain/dates"
import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
} from "@/lib/domain/invoice"
import type { Entry } from "@/lib/domain/types"
import { useBookStore, type EntryPrefill } from "@/stores/book-store"

/* A credit of a voucher (§8.4) and the counterparty field (§8.29). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const year = Number(todayIso().slice(0, 4))

const rent: Entry = {
  id: "a",
  voucher: 1,
  date: `${year}-01-10`,
  description: "Vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  paidOn: null,
}

const landlord: Customer = {
  ...CUSTOMER_DEFAULTS,
  ...emptyParty(),
  id: "p1",
  name: "Kiinteistö Oy Kulma",
  language: "fi",
  role: "supplier",
  expenseCat: "343",
}

function mount(
  dialog:
    | { kind: "entry"; mode: "edit"; entryId: string }
    | { kind: "entry"; mode: "new"; prefill?: EntryPrefill },
  customers: Customer[] = []
) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [rent],
    cats: defaultCategories(),
    customers,
    year,
    month: 0,
    vatFiled: {},
    form5Filed: {},
    dialog,
  })
  render(
    <LangProvider lang="fi">
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

beforeEach(() => {
  useBookStore.setState({ dialog: { kind: "none" } } as never)
})

describe("a credit", () => {
  it("is offered on an open voucher and opens linked, with the opposite amount", async () => {
    mount({ kind: "entry", mode: "edit", entryId: "a" })

    fireEvent.click(screen.getByRole("button", { name: "Lisää toimintoja" }))
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Tee hyvitys/ })
    )

    await waitFor(() => {
      const dialog = useBookStore.getState().dialog
      expect(dialog).toMatchObject({
        kind: "entry",
        mode: "new",
        prefill: { reverses: "a", amount: -45_000, catId: "343" },
      })
    })
  })

  it("that cancels an open voucher in full marks both paid on its date", async () => {
    const date = `${year}-01-20`
    mount({
      kind: "entry",
      mode: "new",
      prefill: {
        date,
        description: "Hyvitys: tosite 1, Vuokra",
        type: "expense",
        catId: "343",
        amount: -45_000,
        vatRate: 25.5,
        amountMode: "gross",
        reverses: "a",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Tallenna$/ }))

    await waitFor(() => {
      const entries = useBookStore.getState().entries
      expect(entries).toHaveLength(2)
      expect(entries.find((e) => e.id === "a")?.paidOn).toBe(date)
      const credit = entries.find((e) => e.id !== "a")
      expect(credit?.reverses).toBe("a")
      expect(credit?.paidOn).toBeUndefined()
    })
  })

  it("that takes only part leaves both open", async () => {
    mount({
      kind: "entry",
      mode: "new",
      prefill: {
        date: `${year}-01-20`,
        type: "expense",
        catId: "343",
        amount: -10_000,
        vatRate: 25.5,
        amountMode: "gross",
        reverses: "a",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Tallenna$/ }))

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    expect(
      useBookStore.getState().entries.find((e) => e.id === "a")?.paidOn
    ).toBeNull()
  })
})

describe("the counterparty field", () => {
  it("is absent while the register is empty", () => {
    mount({ kind: "entry", mode: "new", prefill: { type: "expense" } })
    expect(
      screen.queryByRole("button", { name: "Toimittaja" })
    ).not.toBeInTheDocument()
  })

  it("is named for the entry's side", () => {
    mount({ kind: "entry", mode: "new", prefill: { type: "income" } }, [
      { ...landlord, role: "both" },
    ])
    expect(screen.getByRole("button", { name: "Asiakas" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Toimittaja" })
    ).not.toBeInTheDocument()
  })

  it("fills the description and category, and saves the link", async () => {
    mount({ kind: "entry", mode: "new", prefill: { type: "expense" } }, [
      landlord,
    ])

    fireEvent.click(screen.getByRole("button", { name: "Toimittaja" }))
    fireEvent.click(await screen.findByText("Kiinteistö Oy Kulma"))

    expect(screen.getByLabelText("Kuvaus")).toHaveValue("Kiinteistö Oy Kulma")

    fireEvent.change(screen.getByLabelText(/Summa/), {
      target: { value: "120" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Tallenna$/ }))

    await waitFor(() => {
      const saved = useBookStore.getState().entries.find((e) => e.id !== "a")
      expect(saved).toMatchObject({ party: "p1", catId: "343" })
    })
  })
})
