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
import { useReceiptTextStore } from "@/stores/receipt-text-store"

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
  useReceiptTextStore.setState({ texts: new Map() })
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

  it("finds an entry by its receipt's text and shows where it matched", async () => {
    useBookStore.setState({
      entries: [
        entry,
        {
          ...entry,
          id: "e2",
          voucher: 8,
          description: "Tarvikkeet",
          atts: [
            { id: "r1", name: "kuitti.pdf", type: "application/pdf", size: 1 },
          ],
        },
      ],
    })
    useReceiptTextStore.setState({
      texts: new Map([["r1", "kuitti clas ohlson oy porakone 89,90"]]),
    })
    key("k", { ctrlKey: true })
    const input = await screen.findByRole("combobox")
    fireEvent.change(input, { target: { value: "porakone" } })
    const group = screen.getByRole("group", { name: "Tositteiden liitteissä" })
    expect(group.textContent).toContain("Tarvikkeet")
    expect(group.textContent).toContain("clas ohlson oy porakone")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(useBookStore.getState().dialog).toEqual({
      kind: "entry",
      mode: "edit",
      entryId: "e2",
    })
  })

  it("leaves receipts out of a query shorter than three letters", async () => {
    useBookStore.setState({
      entries: [
        {
          ...entry,
          atts: [
            { id: "r1", name: "kuitti.pdf", type: "application/pdf", size: 1 },
          ],
        },
      ],
    })
    useReceiptTextStore.setState({ texts: new Map([["r1", "ab cd"]]) })
    key("k", { ctrlKey: true })
    const input = await screen.findByRole("combobox")
    fireEvent.change(input, { target: { value: "ab" } })
    expect(
      screen.queryByRole("group", { name: "Tositteiden liitteissä" })
    ).toBeNull()
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
