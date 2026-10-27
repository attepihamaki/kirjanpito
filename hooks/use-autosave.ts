"use client"

import * as React from "react"

import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { autosaveBook } from "@/lib/commands/io-commands"
import { useBookStore } from "@/stores/book-store"

/** How long the bookkeeping must sit still before autosave writes it. */
export const AUTOSAVE_DELAY_MS = 3000

/**
 * Opt-in autosave (§7.5). Every change restarts the wait, so a burst of
 * edits is one write rather than one ZIP packed per keystroke. It holds off
 * while a dialog is open, because the entry being typed is not in the book
 * yet, and while a file is being read or written.
 */
export function useAutosave() {
  const ctx = useCommandCtx()
  const canSave = useCanSaveToFile()
  const autosave = useBookStore((s) => s.autosave)
  const paused = useBookStore((s) => s.autosavePaused)
  const dirty = useBookStore((s) => s.dirty)
  const linked = useBookStore((s) => s.fileHandle !== null)
  const busy = useBookStore(
    (s) => s.saving || s.importing || s.dialog.kind !== "none"
  )
  // Anything a save would write: a change to any of them restarts the wait.
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const layout = useBookStore((s) => s.overviewLayout)

  React.useEffect(() => {
    if (!canSave || !autosave || paused || !dirty || !linked || busy) return
    const id = window.setTimeout(
      () => void autosaveBook(ctx),
      AUTOSAVE_DELAY_MS
    )
    return () => window.clearTimeout(id)
  }, [
    ctx,
    canSave,
    autosave,
    paused,
    dirty,
    linked,
    busy,
    entries,
    cats,
    vatFiled,
    vatPeriod,
    layout,
  ])
}
