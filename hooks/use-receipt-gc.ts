"use client"

import * as React from "react"

import { collectLiveIds } from "@/lib/domain/gc"
import {
  gcReceipts,
  isReceiptStorageSupported,
} from "@/lib/browser/receipt-store"
import { useBookStore } from "@/stores/book-store"

/**
 * Runs the receipt sweep after any of the §7.4 triggers.
 *
 * Store actions stay synchronous and never touch IndexedDB; each trigger just
 * bumps `gcTick`. This effect reads the state that is already committed, so
 * saved entries and in-flight drafts are both current. Mount once, in the app
 * shell.
 */
export function useReceiptGc() {
  const gcTick = useBookStore((s) => s.gcTick)
  const hydrated = useBookStore((s) => s.hydrated)
  const running = React.useRef(false)

  React.useEffect(() => {
    if (!hydrated || !isReceiptStorageSupported()) return

    // Debounced, so "Tallenna ja uusi" ten times runs one sweep.
    const timer = setTimeout(async () => {
      if (running.current) return
      running.current = true
      try {
        const { entries, draftAttachmentIds } = useBookStore.getState()
        await gcReceipts(collectLiveIds(entries, draftAttachmentIds))
      } catch (error) {
        // A failed sweep leaks a blob, which is harmless. It must never
        // surface as a user-facing error.
        console.warn("Receipt garbage collection failed", error)
      } finally {
        running.current = false
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [gcTick, hydrated])
}
