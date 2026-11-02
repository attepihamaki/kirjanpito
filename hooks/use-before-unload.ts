"use client"

import * as React from "react"

import { useStorageBehind } from "@/hooks/use-storage-warning"
import { useBookStore } from "@/stores/book-store"

/**
 * §8.11, last row: the browser's own prompt on tab close.
 *
 * Independent of `confirm()` and impossible to unify with it — a
 * `beforeunload` handler cannot await anything. Never suppressed while a
 * confirm dialog is open: a user closing the tab mid-dialog still has
 * unexported changes. A failed write to browser storage warns too: the
 * book on screen may be saved to its file, but a reload would bring back the
 * older one that storage still holds.
 */
export function useBeforeUnload() {
  const dirty = useBookStore((s) => s.dirty)
  const catFormName = useBookStore((s) => s.catFormName)

  const behind = useStorageBehind()

  const shouldWarn = dirty || behind || catFormName.trim() !== ""

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
