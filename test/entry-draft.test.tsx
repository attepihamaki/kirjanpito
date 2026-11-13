// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { readEntryDraft } from "@/lib/browser/entry-draft"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

/* The half-typed new voucher kept in the browser (§8.5). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function mount(fileName = "kirjanpito.zip") {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatFiled: {},
    fileName,
    demo: false,
    dialog: { kind: "entry", mode: "new" },
  })
  render(
    <LangProvider lang="fi">
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

/** Leave the dialog the way a closed tab does: nothing asked, nothing cleared. */
function crash() {
  cleanup()
  useBookStore.setState({ dialog: { kind: "none" } })
}

beforeEach(() => {
  window.localStorage.clear()
})

describe("the entry draft", () => {
  it("keeps what was typed and offers it the next time", async () => {
    mount()
    fireEvent.change(screen.getByLabelText("Kuvaus"), {
      target: { value: "Neste, diesel" },
    })
    await waitFor(() =>
      expect(readEntryDraft("kirjanpito.zip")?.form.description).toBe(
        "Neste, diesel"
      )
    )
    crash()

    mount()
    expect(screen.getByLabelText("Kuvaus")).toHaveValue("")
    fireEvent.click(screen.getByRole("button", { name: "Jatka luonnosta" }))
    expect(screen.getByLabelText("Kuvaus")).toHaveValue("Neste, diesel")
  })

  it("is not offered in another book, and is gone once discarded", async () => {
    mount()
    fireEvent.change(screen.getByLabelText("Kuvaus"), {
      target: { value: "Neste" },
    })
    await waitFor(() => expect(readEntryDraft("kirjanpito.zip")).not.toBeNull())
    crash()

    mount("toinen.zip")
    expect(screen.queryByRole("button", { name: "Jatka luonnosta" })).toBeNull()
    crash()

    mount()
    fireEvent.click(screen.getByRole("button", { name: "Hylkää" }))
    expect(readEntryDraft("kirjanpito.zip")).toBeNull()
  })
})
