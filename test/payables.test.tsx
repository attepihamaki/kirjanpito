// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PayablesList } from "@/components/invoices/payables-list"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/invoices/payables",
}))

const bill: Entry = {
  id: "b1",
  voucher: 7,
  date: "2026-11-01",
  description: "Työtilan vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  paidOn: null,
  due: "2999-01-01",
}

beforeEach(() => {
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    entries: [bill],
    year: 2026,
    dialog: { kind: "none" },
  })
})

describe("PayablesList", () => {
  it("opens a bill from a click on its row, but not from its tick box or buttons", () => {
    render(
      <LangProvider lang="fi">
        <PayablesList />
      </LangProvider>
    )
    const [, row] = screen.getAllByRole("row")
    fireEvent.click(within(row).getByRole("checkbox"))
    fireEvent.click(row.querySelector("[data-row-skip]")!)
    expect(useBookStore.getState().dialog).toEqual({ kind: "none" })

    fireEvent.click(within(row).getByText(/450,00/))
    expect(useBookStore.getState().dialog).toEqual({
      kind: "entry",
      mode: "edit",
      entryId: "b1",
    })
  })
})
