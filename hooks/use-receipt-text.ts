"use client"

import * as React from "react"

import { isReceiptStorageSupported } from "@/lib/browser/receipt-store"
import {
  indexMissingReceipts,
  restoreReceiptText,
} from "@/lib/commands/receipt-text-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * Keeps the receipt text index current (§8.4). It loads what IndexedDB holds
 * once, then reads any PDF with no text yet. The trigger is the receipt sweep's
 * `gcTick`, which every change to an entry's receipts already bumps, and the
 * end of an import. Mount once, in the app shell, with the tab claim: only the
 * tab that holds the bookkeeping reads receipts.
 */
export function useReceiptText(enabled: boolean) {
  const gcTick = useBookStore((s) => s.gcTick)
  const hydrated = useBookStore((s) => s.hydrated)
  const importing = useBookStore((s) => s.importing)
  const [restored, setRestored] = React.useState(false)

  const usable = enabled && hydrated && isReceiptStorageSupported()

  React.useEffect(() => {
    if (!usable) return
    let live = true
    restoreReceiptText()
      .catch(() => {})
      .finally(() => {
        if (live) setRestored(true)
      })
    return () => {
      live = false
    }
  }, [usable])

  React.useEffect(() => {
    if (!usable || !restored || importing) return
    const timer = setTimeout(
      () => void indexMissingReceipts(useBookStore.getState().entries),
      500
    )
    return () => clearTimeout(timer)
  }, [usable, restored, importing, gcTick])
}
