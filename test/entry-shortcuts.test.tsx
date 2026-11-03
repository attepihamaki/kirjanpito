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

/* Holds a receipt in preparation for as long as a test wants. */
const preparing = vi.hoisted(() => ({
  release: (() => {}) as () => void,
}))

vi.mock("@/lib/browser/receipt-store", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isReceiptStorageSupported: () => true,
  putReceipt: () =>
    new Promise<void>((resolve) => {
      preparing.release = resolve
    }),
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

function mount(
  mode: "new" | "edit" | "copy",
  entryId?: string,
  files?: File[]
) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [original],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatFiled: {},
    dialog: { kind: "entry", mode, entryId, files },
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

describe("a receipt still being stored (§8.5)", () => {
  const receipt = () => new File(["x"], "kuitti.jpg", { type: "image/jpeg" })

  beforeEach(() => {
    useBookStore.setState({ dialog: { kind: "none" }, draftAttachmentIds: [] })
  })

  it("holds back every way of saving until it is in the form", async () => {
    mount("copy", "a", [receipt()])

    const save = screen.getByRole("button", { name: "Tallenna" })
    const saveAndNew = screen.getByRole("button", { name: /Tallenna ja uusi/ })
    expect(save).toBeDisabled()
    expect(saveAndNew).toBeDisabled()
    press({ ctrlKey: true })
    expect(useBookStore.getState().entries).toHaveLength(1)

    preparing.release()

    await waitFor(() => expect(save).toBeEnabled())
    press({ ctrlKey: true })
    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(2))
    expect(useBookStore.getState().entries[1].atts).toHaveLength(1)
  })

  it("is protected from the sweep from before its bytes are stored", async () => {
    mount("new", undefined, [receipt()])
    preparing.release()

    await waitFor(() =>
      expect(useBookStore.getState().draftAttachmentIds).toHaveLength(1)
    )
    const [id] = useBookStore.getState().draftAttachmentIds
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Tallenna" })).toBeEnabled()
    )
    expect(useBookStore.getState().draftAttachmentIds).toEqual([id])
  })
})
