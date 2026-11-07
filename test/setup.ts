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

  /*
   * Base UI's popups measure themselves, and recharts sizes its containers
   * from the first observation. jsdom has no layout, so every observed element
   * reports a fixed box; without one the charts warn about a zero size.
   */
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const rect = { width: 800, height: 400 } as DOMRectReadOnly
        this.callback(
          [{ target, contentRect: rect } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        )
      }
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
