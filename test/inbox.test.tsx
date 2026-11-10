// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { InboxView } from "@/components/ledger/inbox-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { todayIso } from "@/lib/domain/dates"
import type { InboxItem } from "@/lib/domain/inbox"
import { useBookStore } from "@/stores/book-store"

/* The receipt inbox (§8.31): adding, booking and removing receipts. */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/ledger/inbox",
}))

const stored = new Map<string, Blob>()
vi.mock("@/lib/browser/receipt-store", async (original) => {
  const actual = await original<typeof import("@/lib/browser/receipt-store")>()
  return {
    ...actual,
    putReceipt: vi.fn(async (id: string, blob: Blob) => {
      stored.set(id, blob)
    }),
    getReceipt: vi.fn(async (id: string) => stored.get(id)),
  }
})

// A PDF with no text layer, as a scan is: nothing to pre-fill.
vi.mock("@/lib/browser/pdf", () => ({
  extractPdfText: vi.fn(async () => ""),
  renderPdfThumbnail: vi.fn(async () => "data:image/jpeg;base64,"),
}))

const today = todayIso()
const year = Number(today.slice(0, 4))

const waiting: InboxItem = {
  id: "a-wait",
  name: "kuitti.jpg",
  type: "image/jpeg",
  size: 3,
  added: today,
  guess: { date: `${year}-01-05`, amount: 12_550, vendor: "Nurmi" },
}

function mount(inbox: InboxItem[] = []) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year,
    inbox,
    dirty: false,
    dialog: { kind: "none" },
  })
  return render(
    <LangProvider lang="fi">
      <InboxView />
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

beforeEach(() => {
  stored.clear()
  useBookStore.setState(useBookStore.getInitialState())
})

describe("the inbox", () => {
  it("says so when nothing is waiting", () => {
    mount()
    expect(screen.getByText("Ei odottavia tositteita")).toBeTruthy()
  })

  it("adds picked receipts and refuses other files", async () => {
    const { container } = mount()
    const input = container.querySelector<HTMLInputElement>(
      "input[type=file][multiple]"
    )!
    const pdf = new File(["%PDF"], "lasku.pdf", { type: "application/pdf" })
    const text = new File(["x"], "muistio.txt", { type: "text/plain" })
    fireEvent.change(input, { target: { files: [pdf, text] } })

    await waitFor(() => expect(useBookStore.getState().inbox).toHaveLength(1))
    const [item] = useBookStore.getState().inbox
    expect(item).toMatchObject({ name: "lasku.pdf", added: today })
    expect(item.guess).toBeUndefined()
    expect(stored.has(item.id)).toBe(true)
    expect(useBookStore.getState().dirty).toBe(true)
    expect(await screen.findByText("lasku.pdf")).toBeTruthy()
    expect(screen.getByText(/Tietoja ei luettu/)).toBeTruthy()
  })

  it("shows what was read and opens the entry dialog with the receipt", async () => {
    stored.set(waiting.id, new Blob(["img"], { type: "image/jpeg" }))
    mount([waiting])
    expect(screen.getByText(/125,50/)).toBeTruthy()
    expect(screen.getByText(/Nurmi/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Kirjaa" }))
    await waitFor(() =>
      expect(useBookStore.getState().dialog).toMatchObject({
        kind: "entry",
        mode: "new",
        inboxId: waiting.id,
      })
    )
    const dialog = useBookStore.getState().dialog
    expect(dialog.kind === "entry" && dialog.files?.[0].name).toBe("kuitti.jpg")
  })

  it("takes the item out once its entry is saved", async () => {
    stored.set(waiting.id, new Blob(["img"], { type: "image/jpeg" }))
    mount([waiting])
    useBookStore.getState().openDialog({
      kind: "entry",
      mode: "new",
      files: [new File(["img"], "kuitti.jpg", { type: "image/jpeg" })],
      inboxId: waiting.id,
      prefill: {
        date: `${year}-01-05`,
        description: "Tarvikkeet",
        type: "expense",
        catId: "333",
        amount: 12_550,
        vatRate: 25.5,
        amountMode: "gross",
      },
    })
    // The receipt is stored before the form can be saved.
    await screen.findByRole("img", { name: "kuitti.jpg" })
    fireEvent.click(screen.getByRole("button", { name: /^Tallenna$/ }))

    await waitFor(() => expect(useBookStore.getState().entries).toHaveLength(1))
    expect(useBookStore.getState().entries[0].atts).toHaveLength(1)
    expect(useBookStore.getState().inbox).toEqual([])
  })
})
