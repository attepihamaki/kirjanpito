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

  describe("N for a new entry", () => {
    const newEntry = { kind: "entry", mode: "new" }

    it("opens the entry dialog, without typing the letter", () => {
      mount()
      expect(press("n", { ctrlKey: false })).toBe(true)
      expect(useBookStore.getState().dialog).toEqual(newEntry)
    })

    it("works with caps lock on", () => {
      mount()
      press("N", { ctrlKey: false })
      expect(useBookStore.getState().dialog).toEqual(newEntry)
    })

    it("leaves Ctrl+N, Shift+N and a held key alone", () => {
      mount()
      expect(press("n")).toBe(false)
      expect(press("N", { ctrlKey: false, shiftKey: true })).toBe(false)
      expect(press("n", { ctrlKey: false, repeat: true })).toBe(false)
      expect(useBookStore.getState().dialog.kind).toBe("none")
    })

    it("does nothing while typing in a field or a list", () => {
      mount()
      for (const html of [
        "<input />",
        "<textarea></textarea>",
        '<button role="combobox"></button>',
      ]) {
        document.body.insertAdjacentHTML("beforeend", html)
        const el = document.body.lastElementChild as HTMLElement
        const event = new KeyboardEvent("keydown", {
          key: "n",
          bubbles: true,
          cancelable: true,
        })
        el.dispatchEvent(event)
        el.remove()
        expect(event.defaultPrevented).toBe(false)
      }
      expect(useBookStore.getState().dialog.kind).toBe("none")
    })

    it("does nothing behind an open popover or confirmation", () => {
      mount()
      for (const role of ["dialog", "alertdialog"]) {
        const layer = document.createElement("div")
        layer.setAttribute("role", role)
        document.body.append(layer)
        expect(press("n", { ctrlKey: false })).toBe(false)
        layer.remove()
      }
      expect(useBookStore.getState().dialog.kind).toBe("none")
    })

    it("still works while a toast is showing", () => {
      mount()
      const toast = document.createElement("div")
      toast.setAttribute("role", "dialog")
      toast.dataset.slot = "toast"
      document.body.append(toast)
      expect(press("n", { ctrlKey: false })).toBe(true)
      toast.remove()
    })

    it("does nothing during an import or with no bookkeeping", () => {
      useBookStore.setState({ importing: true })
      mount()
      expect(press("n", { ctrlKey: false })).toBe(false)
      useBookStore.setState({ importing: false, open: false })
      expect(press("n", { ctrlKey: false })).toBe(false)
      expect(useBookStore.getState().dialog.kind).toBe("none")
    })
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
