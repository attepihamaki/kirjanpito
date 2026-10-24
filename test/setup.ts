import "@testing-library/jest-dom/vitest"
import "fake-indexeddb/auto"

import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

/**
 * jsdom lacks a few browser APIs the app touches. Only the component tests
 * load this file; the domain suite runs in plain node.
 */

if (typeof window !== "undefined") {
  // next-themes and the responsive hooks read this.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }

  // Base UI's popups measure themselves.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }

  // jsdom has no layout engine, so these are stubs.
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:test")
    URL.revokeObjectURL = vi.fn()
  }
}

afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
  } catch {
    // Not every environment has storage.
  }
})
