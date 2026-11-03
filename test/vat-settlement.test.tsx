// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { JournalView } from "@/components/ledger/books-view"
import { VatView } from "@/components/vat/vat-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* Booking the VAT paid or received for a return as an entry (§6.6). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/vat",
}))

const flat = (s: string | null) => (s ?? "").replace(/[  ]/g, " ")

function payment(amount: number, settles: string, over: Partial<Entry> = {}) {
  const e: Entry = {
    id: `pay-${settles}`,
    date: "2026-11-03",
    description: "Arvonlisävero",
    type: amount < 0 ? "income" : "expense",
    catId: amount < 0 ? "vat-refund" : "vat-payment",
    amount: Math.abs(amount),
    vatRate: 0,
    amountMode: "gross",
    settles,
    ...over,
  }
  return e
}

function load(
  extra: Entry[] = [],
  overrides: Partial<ReturnType<typeof useBookStore.getState>> = {}
) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [...sampleEntries(createIdFactory("s")), ...extra],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    dirty: false,
    vatPeriod: "month",
    vatFiled: {},
    // October 2026: 362,18 € payable (§10).
    vatIndex: 10,
    dialog: { kind: "none" },
    ...overrides,
  })
}

function mount(view: React.ReactNode = <VatView />) {
  return render(
    <LangProvider lang="fi">
      {view}
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 10, 3, 9, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("VAT settlement", () => {
  it("books the amount due as a numbered entry and says it matches", async () => {
    load()
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Kirjaa maksu" }))

    expect(screen.getByLabelText("Summa (€)")).toHaveValue("362,18")
    expect(screen.getByLabelText("Kuvaus")).toHaveValue(
      "Arvonlisävero, Lokakuu 2026"
    )
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))

    await waitFor(() =>
      expect(useBookStore.getState().dialog.kind).toBe("none")
    )
    const booked = useBookStore
      .getState()
      .entries.find((e) => e.catId === "vat-payment")
    expect(booked).toMatchObject({
      date: "2026-11-03",
      type: "expense",
      amount: 36_218,
      vatRate: 0,
      settles: "2026-10",
      voucher: 17,
    })
    expect(screen.getByText("Täsmää laskelman kanssa.")).toBeTruthy()
    expect(flat(document.body.textContent)).toContain("tosite 17")
    // The return itself is unchanged.
    expect(flat(document.body.textContent)).toContain("362,18 €")
  })

  it("reports what a part payment leaves and offers to book the rest", () => {
    load([payment(30_000, "2026-10")])
    mount()

    expect(flat(document.body.textContent)).toContain(
      "Ero laskelmaan on 62,18 €"
    )
    expect(screen.getByRole("button", { name: "Kirjaa maksu" })).toBeTruthy()
  })

  it("opens a booked payment for editing", () => {
    load([payment(36_218, "2026-10")])
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Avaa tosite" }))

    expect(useBookStore.getState().dialog).toMatchObject({
      kind: "entry",
      mode: "edit",
      entryId: "pay-2026-10",
    })
    expect(screen.getByText("Verokausi")).toBeTruthy()
  })

  it("offers nothing for a period still open", () => {
    load([], { vatIndex: 11 })
    mount()

    expect(screen.queryByText("Maksu tai palautus")).toBeNull()
  })

  it("counts a month's payment towards its quarter", () => {
    load([payment(36_218, "2026-10")], { vatPeriod: "quarter", vatIndex: 4 })
    mount()

    expect(screen.getByText(/Lokakuu 2026/)).toBeTruthy()
    expect(screen.getByText("Täsmää laskelman kanssa.")).toBeTruthy()
  })

  it("lists the payment in the journal, outside its totals", () => {
    load([payment(36_218, "2026-10", { voucher: 17 })])
    mount(<JournalView />)

    const text = flat(document.body.textContent)
    expect(text).toContain("Arvonlisävero")
    expect(text).toContain("2939")
    // The year's expenses are the §10 figure, without the payment.
    expect(text).toContain("1 857,47 €")
  })
})
