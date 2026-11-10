"use client"

import * as React from "react"

import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile, useSaveBook } from "@/hooks/use-save-book"
import { redoChange, undoChange } from "@/lib/commands/history-commands"
import { useBookStore } from "@/stores/book-store"
import { usePaletteStore } from "@/stores/palette-store"

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

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TAKES_LETTERS) !== null
}

/** A plain key, pressed where it is not typing into something and nothing is open. */
function isPlainKey(event: KeyboardEvent, key: string): boolean {
  if (event.key.toLowerCase() !== key || event.repeat) return false
  /* `?` needs Shift on most layouts, so only the other modifiers rule it out. */
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  if (event.shiftKey && key !== "?") return false
  if (document.querySelector(OPEN_LAYER)) return false
  return !isTyping(event.target)
}

/**
 * The file shortcuts (§8.2), on one listener so there is a single place that
 * decides when a shortcut may fire at all.
 *
 * `Ctrl`/`⌘`+`W` is deliberately not bound to closing the bookkeeping: it is
 * one of the few combinations a browser refuses to hand to a page, so binding
 * it would close the tab instead. Closing is rare enough to live without one.
 *
 * `?` lists the shortcuts and Ctrl/⌘+K opens the command palette (§8.35).
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
  const ctx = useCommandCtx()

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isPlainKey(event, "?")) {
        if (!useBookStore.getState().open) return
        event.preventDefault()
        usePaletteStore.getState().setLayer("shortcuts")
        return
      }

      if (isPlainKey(event, "n")) {
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

      /*
       * Ctrl/⌘+K opens the command palette (§8.35), from a field too, since
       * no field uses the combination. It waits while a dialog is open, and
       * pressed again it closes the palette.
       */
      if (key === "k" && !event.shiftKey) {
        const palette = usePaletteStore.getState()
        if (palette.layer === "commands") {
          event.preventDefault()
          palette.setLayer("none")
          return
        }
        const s = useBookStore.getState()
        if (!s.open || s.importing || s.dialog.kind !== "none") return
        if (document.querySelector(OPEN_LAYER)) return
        event.preventDefault()
        palette.setLayer("commands")
        return
      }

      if (key === "z" || key === "y") {
        /*
         * In a field, Z and Y belong to the field's own undo, and behind a
         * dialog the entry being typed is not in the book yet.
         */
        if (event.repeat || isTyping(event.target)) return
        if (document.querySelector(OPEN_LAYER)) return
        const s = useBookStore.getState()
        if (
          !s.open ||
          s.importing ||
          s.saving ||
          s.dialog.kind !== "none" ||
          s.archiveYear !== null
        ) {
          return
        }
        const redo = key === "y" ? !event.shiftKey : event.shiftKey
        if (key === "y" && event.metaKey) return
        event.preventDefault()
        if (redo) redoChange(ctx)
        else undoChange(ctx)
        return
      }

      if (key !== "o" && key !== "s") return

      /*
       * Every shortcut here replaces or rewrites the whole bookkeeping, which
       * has no business happening behind an open dialog: the entry being
       * typed into one is not in the book yet.
       */
      const { open, importing, saving, dialog } = useBookStore.getState()
      if (!open || importing || saving || dialog.kind !== "none") return

      /*
       * Ctrl+O: open. The browser's own open dialog is close enough in intent
       * that losing the preventDefault would not be a disaster.
       */
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
  }, [canSave, ctx, onExport, onOpenFile, save])
}
