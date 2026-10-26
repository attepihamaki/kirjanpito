"use client"

import * as React from "react"

import { useCanSaveToFile, useSaveBook } from "@/hooks/use-save-book"
import { useBookStore } from "@/stores/book-store"

/**
 * The file shortcuts (§8.2), on one listener so there is a single place that
 * decides when a shortcut may fire at all.
 *
 * `Ctrl`/`⌘`+`W` is deliberately not bound to closing the bookkeeping: it is
 * one of the few combinations a browser refuses to hand to a page, so binding
 * it would close the tab instead. Closing is rare enough to live without one.
 */
export function useAppShortcuts({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}): void {
  const save = useSaveBook()
  const canSave = useCanSaveToFile()

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== "o" && key !== "s") return

      /*
       * Every shortcut here replaces or rewrites the whole bookkeeping, which
       * has no business happening behind an open dialog: the entry being
       * typed into one is not in the book yet.
       */
      const { open, importing, saving, dialog } = useBookStore.getState()
      if (!open || importing || saving || dialog.kind !== "none") return

      // Ctrl+O: open. The browser's own open dialog is close enough in
      // intent that losing the preventDefault would not be a disaster.
      if (key === "o") {
        if (event.shiftKey) return
        event.preventDefault()
        onOpenFile()
        return
      }

      // Ctrl+Shift+S reads as "save as", which is what a downloaded copy is.
      if (event.shiftKey) {
        event.preventDefault()
        onExport()
        return
      }

      // Ctrl+S, only where there is a file to write back to (§7.5).
      if (!canSave) return
      event.preventDefault()
      save()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [canSave, onExport, onOpenFile, save])
}
