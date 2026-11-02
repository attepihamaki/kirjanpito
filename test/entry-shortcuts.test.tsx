// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* Ctrl+Enter in the entry dialog (§8.5). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const original: Entry = {
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

function mount(mode: "new" | "edit" | "copy", entryId?: string) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [original],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatFiled: {},
    dialog: { kind: "entry", mode, entryId },
  })
  render(
    <LangProvider lang="fi">
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

const press = (mods: { ctrlKey?: boolean; metaKey?: boolean }) =>
  fireEvent.keyDown(screen.getByLabelText("Selite"), { key: "Enter", ...mods })

describe("Ctrl+Enter in the entry dialog", () => {
  beforeEach(() => {
    useBookStore.setState({ dialog: { kind: "none" } })
  })

  it("saves a copy and starts the next entry on the date field", async () => {
    mount("copy", "a")
    press({ ctrlKey: true })

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    expect(useBookStore.getState().dialog.kind).toBe("entry")
    expect(screen.getByLabelText("Selite")).toHaveValue("")
    expect(document.activeElement).toBe(screen.getByLabelText("Päivämäärä"))
  })

  it("saves an edit and closes, on ⌘Enter too", async () => {
    mount("edit", "a")
    fireEvent.change(screen.getByLabelText("Selite"), {
      target: { value: "Vuokra, maaliskuu" },
    })
    press({ metaKey: true })

    await waitFor(() =>
      expect(useBookStore.getState().dialog.kind).toBe("none")
    )
    expect(useBookStore.getState().entries[0].description).toBe(
      "Vuokra, maaliskuu"
    )
  })

  it("shows the error rather than saving an incomplete entry", async () => {
    mount("new")
    press({ ctrlKey: true })

    expect(await screen.findByText("Anna summa, esim. 124,50.")).toBeVisible()
    expect(useBookStore.getState().entries).toHaveLength(1)
  })

  it("leaves a plain Enter alone", () => {
    mount("copy", "a")
    press({})

    expect(useBookStore.getState().entries).toHaveLength(1)
  })
})
