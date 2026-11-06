// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AutosaveNote, SavedAtNote } from "@/components/app/file-status"
import { LangProvider } from "@/components/lang-provider"
import { autosaveDelay } from "@/hooks/use-autosave"
import { useBookStore } from "@/stores/book-store"

/* When the linked file was last written, and how autosave backs off (§7.5). */

const handle = { name: "kirjanpito.zip" } as unknown as FileSystemFileHandle

function show(ui: React.ReactElement) {
  return render(<LangProvider lang="fi">{ui}</LangProvider>)
}

describe("the file's last write", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 10, 6, 15, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
    useBookStore.setState({ fileHandle: null, savedAt: null })
  })

  it("gives the time alone for a write today", () => {
    useBookStore.setState({
      fileHandle: handle,
      savedAt: new Date(2026, 10, 6, 14, 32).getTime(),
    })
    show(<SavedAtNote />)
    expect(screen.getByText("Tiedosto päivitetty klo 14.32")).toBeTruthy()
  })

  it("gives the day too for an earlier write", () => {
    useBookStore.setState({
      fileHandle: handle,
      savedAt: new Date(2026, 10, 3, 9, 5).getTime(),
    })
    show(<SavedAtNote />)
    expect(screen.getByText("Tiedosto päivitetty 3.11.2026 klo 09.05")).toBeTruthy()
  })

  it("says nothing without a linked file", () => {
    useBookStore.setState({ fileHandle: null, savedAt: 1000 })
    const { container } = show(<SavedAtNote />)
    expect(container.textContent).toBe("")
  })
})

describe("autosave back-off", () => {
  it("doubles the wait per failure and stops at a minute", () => {
    expect([0, 1, 2, 3, 4].map(autosaveDelay)).toEqual([
      3000, 6000, 12000, 24000, 48000,
    ])
    expect(autosaveDelay(5)).toBe(60000)
    expect(autosaveDelay(20)).toBe(60000)
  })

  it("tells the menu it is trying again", () => {
    useBookStore.setState({
      autosave: true,
      autosavePaused: false,
      autosaveFailures: 2,
      fileHandle: handle,
    })
    vi.stubGlobal("showSaveFilePicker", vi.fn())
    vi.stubGlobal("showOpenFilePicker", vi.fn())
    show(<AutosaveNote />)
    expect(screen.getByText(/Yritetään uudelleen/)).toBeTruthy()
    vi.unstubAllGlobals()
    useBookStore.setState({ autosave: false, autosaveFailures: 0, fileHandle: null })
  })
})
