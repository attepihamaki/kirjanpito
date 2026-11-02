"use client"

import * as React from "react"

import { sweepReceipts } from "@/lib/commands/book-commands"
import { isReceiptStorageSupported } from "@/lib/browser/receipt-store"
import { useBookStore } from "@/stores/book-store"

/**
 * Runs the receipt sweep after any of the §7.4 triggers.
 *
 * Store actions stay synchronous and never touch IndexedDB; each trigger just
 * bumps `gcTick`. This effect reads the state that is already committed, so
 * saved entries and in-flight drafts are both current. Mount once, in the app
 * shell.
 *
 * A sweep deletes every receipt this tab does not know about, so it runs only
 * in the tab that holds the bookkeeping (§12): `enabled` is that claim.
 *
 * It also waits out an import. Receipts going into IndexedDB belong to no
 * entry until the whole file has been read, so a sweep in between would delete
 * them. The end of the import sets it off again.
 */
export function useReceiptGc(enabled: boolean) {
  const gcTick = useBookStore((s) => s.gcTick)
  const hydrated = useBookStore((s) => s.hydrated)
  const importing = useBookStore((s) => s.importing)
  const running = React.useRef(false)

  React.useEffect(() => {
    if (!enabled || !hydrated || importing || !isReceiptStorageSupported()) {
      return
    }

    // Debounced, so "Tallenna ja uusi" ten times runs one sweep.
    const timer = setTimeout(async () => {
      if (running.current) return
      running.current = true
      await sweepReceipts()
      running.current = false
    }, 250)

    return () => clearTimeout(timer)
  }, [enabled, gcTick, hydrated, importing])
}
