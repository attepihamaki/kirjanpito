// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { useAppShortcuts } from "@/hooks/use-app-shortcuts"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const saveBook = vi.fn()
vi.mock("@/lib/commands/io-commands", () => ({
  saveBook: (...args: unknown[]) => saveBook(...args),
}))

const onOpenFile = vi.fn()
const onExport = vi.fn()

function Host() {
  useAppShortcuts({ onOpenFile, onExport })
  return null
}

function mount() {
  render(
    <LangProvider lang="fi">
      <Host />
    </LangProvider>
  )
}

/** Returns whether the page got to cancel the browser's own default. */
function press(key: string, mods: Partial<KeyboardEventInit> = {}): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    ...mods,
  })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe("file shortcuts (§8.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("showOpenFilePicker", vi.fn())
    vi.stubGlobal("showSaveFilePicker", vi.fn())
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      importing: false,
      saving: false,
      dialog: { kind: "none" },
    })
  })

  it("opens a file on Ctrl+O and downloads on Ctrl+Shift+S", () => {
    mount()

    expect(press("o")).toBe(true)
    expect(onOpenFile).toHaveBeenCalledOnce()

    expect(press("S", { shiftKey: true })).toBe(true)
    expect(onExport).toHaveBeenCalledOnce()
    // Shift is what separates the two; plain Ctrl+S is not a download.
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it("saves on Ctrl+S, and on ⌘S", () => {
    mount()

    press("s")
    press("s", { ctrlKey: false, metaKey: true })

    expect(saveBook).toHaveBeenCalledTimes(2)
    expect(onOpenFile).not.toHaveBeenCalled()
  })

  /*
   * The entry being typed into a dialog is not in the book yet, so a
   * shortcut that replaces or rewrites the whole bookkeeping must not fire
   * behind one.
   */
  it("does nothing while a dialog is open", () => {
    useBookStore.setState({ dialog: { kind: "entry", mode: "new" } })
    mount()

    expect(press("o")).toBe(false)
    expect(press("s")).toBe(false)
    expect(press("s", { shiftKey: true })).toBe(false)

    expect(onOpenFile).not.toHaveBeenCalled()
    expect(onExport).not.toHaveBeenCalled()
    expect(saveBook).not.toHaveBeenCalled()
  })

  it("does nothing while a file is being read or written", () => {
    useBookStore.setState({ importing: true })
    mount()

    expect(press("o")).toBe(false)
    expect(onOpenFile).not.toHaveBeenCalled()
  })

  it("does nothing with no bookkeeping open", () => {
    useBookStore.setState({ open: false })
    mount()

    expect(press("o")).toBe(false)
    expect(onOpenFile).not.toHaveBeenCalled()
  })

  it("leaves the plain and Alt-modified keys to the browser", () => {
    mount()

    expect(press("o", { ctrlKey: false })).toBe(false)
    expect(press("o", { altKey: true })).toBe(false)
    expect(press("p")).toBe(false)

    expect(onOpenFile).not.toHaveBeenCalled()
  })

  /*
   * §7.5: where the browser cannot write back to a file there is no save
   * row, and Ctrl+S must stay the browser's own rather than silently do
   * nothing.
   */
  it("leaves Ctrl+S alone where the browser cannot write to a file", () => {
    vi.unstubAllGlobals()
    mount()

    expect(press("s")).toBe(false)
    expect(saveBook).not.toHaveBeenCalled()
    // The other two are unaffected.
    expect(press("o")).toBe(true)
  })
})
