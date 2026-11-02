// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StorageNote } from "@/components/app/file-status"
import { LangProvider } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { useStorageWarning } from "@/hooks/use-storage-warning"
import { isStorageBehind, useBookStore } from "@/stores/book-store"

/* Telling the user when the browser stops keeping their work (§12). */

const BOOK_INITIAL = useBookStore.getState()

function Probe() {
  useStorageWarning()
  useBeforeUnload()
  return <StorageNote />
}

function mount() {
  return render(
    <LangProvider lang="fi">
      <Probe />
    </LangProvider>
  )
}

/** Make the next writes to localStorage fail, as a full quota does. */
function breakStorage() {
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError")
  })
}

function cancelsUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

let add: ReturnType<typeof vi.spyOn>
let close: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  useBookStore.setState(BOOK_INITIAL, true)
  useBookStore.getState().newBook(2026)
  useBookStore.setState({ dirty: false })
  add = vi.spyOn(toast, "add").mockReturnValue("storage")
  close = vi.spyOn(toast, "close").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  // A successful write clears the flag for the next test.
  useBookStore.setState({ ledgerPage: 2 })
})

describe("storage warning", () => {
  it("stays quiet while storage works", () => {
    mount()
    expect(isStorageBehind()).toBe(false)
    expect(add).not.toHaveBeenCalled()
    expect(cancelsUnload()).toBe(false)
  })

  it("warns once a write fails, and again on closing the tab", () => {
    mount()
    breakStorage()
    act(() => useBookStore.setState({ ledgerSize: 25 }))

    expect(isStorageBehind()).toBe(true)
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0][0]).toMatchObject({ timeout: 0 })
    expect(screen.getByText(/Vain tiedosto pitää ne tallessa/)).toBeTruthy()
    // Saved to the file, so not dirty, but a reload would show an older book.
    expect(useBookStore.getState().dirty).toBe(false)
    expect(cancelsUnload()).toBe(true)
  })

  it("does not repeat the toast for every failed write", () => {
    mount()
    breakStorage()
    act(() => useBookStore.setState({ ledgerSize: 25 }))
    act(() => useBookStore.setState({ ledgerSize: 50 }))
    expect(add).toHaveBeenCalledTimes(1)
  })

  it("takes the warning down when a write succeeds again", () => {
    mount()
    const broken = breakStorage()
    act(() => useBookStore.setState({ ledgerSize: 25 }))
    broken.mockRestore()
    act(() => useBookStore.setState({ ledgerSize: 50 }))

    expect(isStorageBehind()).toBe(false)
    expect(close).toHaveBeenCalledWith("storage")
    expect(screen.queryByText(/Vain tiedosto pitää ne tallessa/)).toBeNull()
  })
})
