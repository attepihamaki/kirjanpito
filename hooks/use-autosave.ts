"use client"

import * as React from "react"

import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { autosaveBook } from "@/lib/commands/io-commands"
import { useBookStore } from "@/stores/book-store"

/** How long the bookkeeping must sit still before autosave writes it. */
const AUTOSAVE_DELAY_MS = 3000

/** The longest wait between two tries after failed writes. */
const AUTOSAVE_MAX_DELAY_MS = 60_000

/**
 * The wait before autosave writes: the usual delay, doubled for each write in a
 * row that failed (3, 6, 12, 24 seconds), and never over a minute.
 */
export function autosaveDelay(failures: number): number {
  return Math.min(AUTOSAVE_DELAY_MS * 2 ** failures, AUTOSAVE_MAX_DELAY_MS)
}

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
  const failures = useBookStore((s) => s.autosaveFailures)
  const linked = useBookStore((s) => s.fileHandle !== null)
  const busy = useBookStore(
    (s) => s.saving || s.importing || s.dialog.kind !== "none"
  )
  // Anything a save would write: a change to any of them restarts the wait.
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const yearsArchived = useBookStore((s) => s.yearsArchived)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const layout = useBookStore((s) => s.overviewLayout)
  const recurring = useBookStore((s) => s.recurring)
  const categoryRules = useBookStore((s) => s.categoryRules)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const bankBalance = useBookStore((s) => s.bankBalance)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const yearEnd = useBookStore((s) => s.yearEnd)
  const changeLog = useBookStore((s) => s.changeLog)

  React.useEffect(() => {
    if (!canSave || !autosave || paused || !dirty || !linked || busy) return
    const id = window.setTimeout(
      () => void autosaveBook(ctx),
      autosaveDelay(failures)
    )
    return () => window.clearTimeout(id)
  }, [
    ctx,
    failures,
    canSave,
    autosave,
    paused,
    dirty,
    linked,
    busy,
    entries,
    cats,
    vatFiled,
    yearsArchived,
    form5Filed,
    vatPeriod,
    layout,
    recurring,
    categoryRules,
    assetOpening,
    bankBalance,
    loanOpening,
    yearEnd,
    changeLog,
  ])
}
