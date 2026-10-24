"use client"

import * as React from "react"

import { useBookStore } from "@/stores/book-store"

/**
 * §8.11, last row: the browser's own prompt on tab close.
 *
 * Independent of `confirm()` and impossible to unify with it — a
 * `beforeunload` handler cannot await anything. Never suppressed while a
 * confirm dialog is open: a user closing the tab mid-dialog still has
 * unexported changes.
 */
export function useBeforeUnload() {
  const dirty = useBookStore((s) => s.dirty)
  const entries = useBookStore((s) => s.entries.length)
  const catFormName = useBookStore((s) => s.catFormName)

  const shouldWarn = (dirty && entries > 0) || catFormName.trim() !== ""

  React.useEffect(() => {
    if (!shouldWarn) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Required by Chrome; the text itself is ignored by every browser.
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [shouldWarn])
}
