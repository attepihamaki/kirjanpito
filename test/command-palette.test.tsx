// @vitest-environment jsdom
import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CommandPalette, ShortcutSheet } from "@/components/app/command-palette"
import { LangProvider } from "@/components/lang-provider"
import { useAppShortcuts } from "@/hooks/use-app-shortcuts"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"
import { usePaletteStore } from "@/stores/palette-store"

/* The command palette and the shortcut list (§8.35). */

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/app/overview",
}))

const onOpenFile = vi.fn()
const onExport = vi.fn()

function Host() {
  useAppShortcuts({ onOpenFile, onExport })
  return (
    <>
      <CommandPalette onOpenFile={onOpenFile} onExport={onExport} />
      <ShortcutSheet />
    </>
  )
}

const entry: Entry = {
  id: "e1",
  voucher: 7,
  date: "2025-04-02",
  description: "Kahvila Päivänsäde",
  type: "expense",
  catId: "344-other",
  amount: 1_250,
  vatRate: 0,
  amountMode: "gross",
}

const key = (k: string, mods: Partial<KeyboardEventInit> = {}) =>
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: k,
      bubbles: true,
      cancelable: true,
      ...mods,
    })
  )

beforeEach(() => {
  vi.clearAllMocks()
  usePaletteStore.setState({ layer: "none" })
  useBookStore.setState({
    open: true,
    hydrated: true,
    importing: false,
    cats: defaultCategories(),
    year: 2026,
    entries: [entry],
    invoices: [],
    customers: [],
    dialog: { kind: "none" },
  })
  render(
    <LangProvider lang="fi">
      <Host />
    </LangProvider>
  )
})

describe("CommandPalette", () => {
  it("opens on Ctrl+K and finds an entry in another year without the Finnish letters", async () => {
    key("k", { ctrlKey: true })
    const input = await screen.findByRole("combobox")
    expect(screen.getByRole("option", { name: /Uusi tosite/ })).toBeTruthy()
    fireEvent.change(input, { target: { value: "paivansade" } })
    const option = screen.getByRole("option", { name: /Kahvila Päivänsäde/ })
    expect(option.getAttribute("aria-selected")).toBe("true")
    fireEvent.keyDown(input, { key: "Enter" })
    const s = useBookStore.getState()
    expect(s.year).toBe(2025)
    expect(s.dialog).toEqual({ kind: "entry", mode: "edit", entryId: "e1" })
    expect(usePaletteStore.getState().layer).toBe("none")
  })

  it("goes to a page with the arrow keys", async () => {
    key("k", { metaKey: true })
    const input = await screen.findByRole("combobox")
    fireEvent.change(input, { target: { value: "tappiot" } })
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "ArrowUp" })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(push).toHaveBeenCalledWith("/app/statement/losses")
  })

  it("lists the shortcuts on ?, but not while a dialog is open", async () => {
    key("?", { shiftKey: true })
    expect(await screen.findByText("Pikanäppäimet")).toBeTruthy()
    usePaletteStore.setState({ layer: "none" })
    useBookStore.setState({ dialog: { kind: "export" } })
    key("k", { ctrlKey: true })
    expect(usePaletteStore.getState().layer).toBe("none")
  })
})
