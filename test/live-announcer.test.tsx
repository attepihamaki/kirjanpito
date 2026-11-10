// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LiveAnnouncer } from "@/components/app/live-announcer"
import { LangProvider } from "@/components/lang-provider"
import { announce } from "@/lib/browser/announce"
import { useBookStore } from "@/stores/book-store"

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function mount() {
  render(
    <LangProvider lang="fi">
      <LiveAnnouncer />
    </LangProvider>
  )
}

describe("LiveAnnouncer", () => {
  it("keeps both regions mounted while empty", () => {
    mount()
    expect(screen.getByTestId("live-polite")).toBeEmptyDOMElement()
    expect(screen.getByTestId("live-assertive")).toBeEmptyDOMElement()
  })

  it("puts a message in its region on the next frame and clears it later", () => {
    mount()
    act(() => announce("Tallennettu automaattisesti."))
    expect(screen.getByTestId("live-polite")).toBeEmptyDOMElement()
    act(() => vi.advanceTimersToNextFrame())
    expect(screen.getByTestId("live-polite")).toHaveTextContent(
      "Tallennettu automaattisesti."
    )
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByTestId("live-polite")).toBeEmptyDOMElement()
  })

  it("says so when autosave stops", () => {
    useBookStore.setState({ autosave: true })
    mount()
    act(() => useBookStore.setState({ autosavePaused: true }))
    act(() => vi.advanceTimersToNextFrame())
    expect(screen.getByTestId("live-assertive")).toHaveTextContent(
      "Automaattinen tallennus odottaa"
    )
  })
})
