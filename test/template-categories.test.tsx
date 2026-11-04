// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { CategorySettings } from "@/components/settings/category-settings"
import { defaultCategories } from "@/lib/domain/accounts"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Category } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* A monthly template keeps the custom category it books to (§8.5, §8.10). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const custom: Category = {
  id: "c-pilvi",
  line: "344-other",
  name: "Pilvipalvelut",
  vatRate: 25.5,
  enabled: true,
  custom: true,
}

const template: RecurringEntry = {
  id: "r1",
  description: "Pilvipalvelu",
  type: "expense",
  catId: custom.id,
  amount: 1_000,
  vatRate: 25.5,
  amountMode: "gross",
  day: 1,
  from: "2026-01",
}

describe("a custom category only a template uses", () => {
  beforeEach(() => {
    useBookStore.setState({
      entries: [],
      cats: [...defaultCategories(), custom],
      recurring: [template],
      dialog: { kind: "none" },
      catQuery: "Pilvi",
      catType: "all",
      catPage: 1,
    })
  })

  const clickDelete = () => {
    render(
      <LangProvider lang="fi">
        <CategorySettings />
      </LangProvider>
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Poista luokka Pilvipalvelut" })
    )
  }

  const stored = () =>
    useBookStore.getState().cats.some((c) => c.id === custom.id)

  it("asks where the template moves before it is deleted", () => {
    clickDelete()
    expect(useBookStore.getState().dialog).toEqual({
      kind: "category-delete",
      id: custom.id,
    })
    expect(stored()).toBe(true)
  })

  it("is deleted at once when the template is gone", async () => {
    useBookStore.setState({ recurring: [] })
    clickDelete()
    await waitFor(() => expect(stored()).toBe(false))
  })

  it("survives restoring the defaults", () => {
    useBookStore.getState().resetCategories()

    expect(useBookStore.getState().cats.some((c) => c.id === custom.id)).toBe(
      true
    )
  })
})
