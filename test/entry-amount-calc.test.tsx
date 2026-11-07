// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

/* The amount field takes a sum, and the mode button converts (§8.5). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function mount(prefill?: { catId: string; vatRate: number }) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatFiled: {},
    dialog: {
      kind: "entry",
      mode: "new",
      prefill: prefill && { ...prefill, type: "expense", amountMode: "gross" },
    },
  })
  render(
    <LangProvider lang="fi">
      <EntryDialog registerDropTarget={() => {}} />
    </LangProvider>
  )
}

const sum = () => screen.getByLabelText("Summa (€)") as HTMLInputElement

describe("amount calculator", () => {
  beforeEach(() => {
    useBookStore.setState({ dialog: { kind: "none" } })
  })

  it("previews a sum and replaces it with the result on blur", () => {
    mount()
    fireEvent.change(sum(), { target: { value: "12,50*3" } })
    expect(screen.getByText(/= 37,50/)).toBeInTheDocument()

    fireEvent.blur(sum())
    expect(sum().value).toBe("37,50")
    expect(screen.queryByText(/= 37,50/)).not.toBeInTheDocument()
  })

  it("commits on Enter without saving the entry", () => {
    mount()
    fireEvent.change(sum(), { target: { value: "100+24,60" } })
    fireEvent.keyDown(sum(), { key: "Enter" })
    expect(sum().value).toBe("124,60")
    expect(useBookStore.getState().entries).toHaveLength(0)
  })

  it("shows no preview for a plain amount or a broken sum", () => {
    mount()
    fireEvent.change(sum(), { target: { value: "124,50" } })
    expect(screen.queryByText(/^=/)).not.toBeInTheDocument()
    fireEvent.change(sum(), { target: { value: "12*" } })
    expect(screen.queryByText(/^=/)).not.toBeInTheDocument()
  })
})
