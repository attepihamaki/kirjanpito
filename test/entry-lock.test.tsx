// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

/* The reason a locked entry cannot be edited (§8.11). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function mount(vatFiled: Record<string, string>) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [
      {
        id: "a",
        voucher: 1,
        date: "2026-03-10",
        description: "Vuokra",
        type: "expense",
        catId: "343",
        amount: 45_000,
        vatRate: 25.5,
        amountMode: "gross",
      },
    ],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatFiled,
    dialog: { kind: "entry", mode: "edit", entryId: "a" },
  })
  render(
    <LangProvider lang="fi">
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

describe("a locked entry in the dialog", () => {
  it("keeps the reason out of the form until it is asked for", async () => {
    mount({ "2026-03": "2026-04-12" })

    expect(screen.queryByText(/Kirjanpitolaki/)).not.toBeInTheDocument()
    expect(screen.getByLabelText("Kuvaus")).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Lukittu" }))

    expect(await screen.findByText(/Kirjanpitolaki/)).toBeVisible()
  })

  it("still opens the extra options", () => {
    mount({ "2026-03": "2026-04-12" })

    fireEvent.click(screen.getByRole("tab", { name: /Maksu/ }))

    expect(
      screen.getByRole("checkbox", { name: "Toista säännöllisesti" })
    ).toBeVisible()
  })

  it("shows no lock on an open entry", () => {
    mount({})

    expect(
      screen.queryByRole("button", { name: "Lukittu" })
    ).not.toBeInTheDocument()
  })
})
