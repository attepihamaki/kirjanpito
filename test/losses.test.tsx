// @vitest-environment jsdom
import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { LossesView } from "@/components/statement/losses-view"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* The Tappiot tab (§6.15). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/statement/losses",
}))

const entry = (
  id: string,
  date: string,
  type: Entry["type"],
  amount: number
): Entry => ({
  id,
  date,
  description: id,
  type,
  catId: type === "income" ? "301" : "344-other",
  amount,
  vatRate: 0,
  amountMode: "gross",
  paidOn: undefined,
})

beforeEach(() => {
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    year: 2026,
    entries: [
      entry("a", "2025-03-01", "expense", 100_000),
      entry("b", "2026-03-01", "income", 30_000),
    ],
    taxLosses: {},
    yearEnd: {},
  })
})

describe("LossesView", () => {
  it("deducts last year's loss from this year's profit and takes the confirmed figure", () => {
    render(
      <LangProvider lang="fi">
        <LossesView />
      </LangProvider>
    )
    expect(document.body.textContent).toContain(
      "Verotettava elinkeinotulo 0,00"
    )
    const field = screen.getByLabelText("Vuoden 2025 vahvistettu tappio")
    fireEvent.change(field, { target: { value: "800" } })
    fireEvent.blur(field)
    expect(useBookStore.getState().taxLosses).toEqual({ "2025": 80_000 })

    fireEvent.change(screen.getByLabelText("Aiempi vuosi"), {
      target: { value: "2020" },
    })
    fireEvent.change(screen.getByLabelText("Vahvistettu tappio"), {
      target: { value: "50" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Lisää tappio" }))
    expect(useBookStore.getState().taxLosses).toEqual({
      "2020": 5_000,
      "2025": 80_000,
    })
  })
})
