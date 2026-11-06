// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BookCheckDialog } from "@/components/check/book-check-dialog"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* "Check my book" lists every rule's findings by year (§8.23). */

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

const entry = (over: Partial<Entry>): Entry => ({
  id: over.date ?? "e",
  date: "2025-03-01",
  description: "Osto",
  type: "expense",
  catId: "333",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

function mount(entries: Entry[]) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries,
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    dirty: false,
    vatFiled: {},
    dialog: { kind: "check-book" },
  })
  render(
    <LangProvider lang="fi">
      <BookCheckDialog />
    </LangProvider>
  )
}

describe("BookCheckDialog", () => {
  beforeEach(() => {
    push.mockClear()
    useBookStore.setState({ dialog: { kind: "none" } })
  })

  it("says so when no rule finds anything", () => {
    mount([])
    expect(screen.getByText(/Ei huomautettavaa/)).toBeInTheDocument()
  })

  it("groups findings by year and counts them", () => {
    mount([entry({}), entry({ id: "b", date: "2026-02-01" })])
    expect(screen.getByRole("heading", { name: "Vuosi 2026" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Vuosi 2025" })).toBeInTheDocument()
    expect(screen.getByText(/^Virheitä \d+, huomautuksia \d+, tiedoksi \d+$/)).toBeInTheDocument()
  })

  it("opens the ledger on the year and the check it was shown for", () => {
    mount([entry({}), entry({ id: "b", date: "2026-02-01" })])
    const section = screen.getByRole("region", { name: "Vuosi 2025" })
    const show = section.querySelector("button") as HTMLButtonElement
    fireEvent.click(show)
    const s = useBookStore.getState()
    expect(s.year).toBe(2025)
    expect(s.ledgerCheck).toBe("noReceipt")
    expect(push).toHaveBeenCalledWith("/app/ledger")
    expect(s.dialog.kind).toBe("none")
  })
})
