"use client"

import * as React from "react"

import { useCanSaveToFile, useSaveBook } from "@/hooks/use-save-book"
import { useBookStore } from "@/stores/book-store"

/*
 * Where a typed letter belongs to the control: fields, and lists that jump to
 * the option starting with it.
 */
const TAKES_LETTERS =
  'input, textarea, select, [contenteditable], [role="combobox"], [role="listbox"], [role="menu"], [role="option"], [role="menuitem"]'

/*
 * Base UI gives dialogs, confirmations and popovers one of these roles. The
 * confirmation and the file menu are not in the store's `dialog`. A toast has
 * such a role too, but it holds nothing up: it is often still showing when the
 * next entry starts.
 */
const OPEN_LAYER =
  '[role="dialog"]:not([data-slot="toast"]), [role="alertdialog"]:not([data-slot="toast"])'

/** The plain `N` key, pressed where it is not typing into something. */
function isNewEntryKey(event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== "n" || event.repeat) return false
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false
  }
  if (document.querySelector(OPEN_LAYER)) return false
  return !(
    event.target instanceof Element && event.target.closest(TAKES_LETTERS)
  )
}

/**
 * The file shortcuts (§8.2), on one listener so there is a single place that
 * decides when a shortcut may fire at all.
 *
 * `Ctrl`/`⌘`+`W` is deliberately not bound to closing the bookkeeping: it is
 * one of the few combinations a browser refuses to hand to a page, so binding
 * it would close the tab instead. Closing is rare enough to live without one.
 *
 * `N` opens a new entry. `Ctrl`/`⌘`+`N` is another combination the browser
 * keeps for itself, so this one has no modifier and has to stay out of the way
 * of typing.
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
      if (isNewEntryKey(event)) {
        const s = useBookStore.getState()
        if (!s.open || s.importing || s.saving || s.dialog.kind !== "none") {
          return
        }
        event.preventDefault()
        s.openDialog({ kind: "entry", mode: "new" })
        return
      }

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
