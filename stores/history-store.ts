import { create } from "zustand"

import {
  EMPTY_HISTORY,
  record,
  stepBack,
  stepForward,
  type History,
  type Snapshot,
} from "@/lib/domain/history"
import { useBookStore } from "@/stores/book-store"

/**
 * The session's undo and redo stacks (§8.20). Not persisted: a reload, a save
 * and any change of bookkeeping start it over.
 */
export const useHistoryStore = create<History>()(() => EMPTY_HISTORY)

const current = (): Snapshot => {
  const { entries, cats } = useBookStore.getState()
  return { entries, cats }
}

/** Set while an undo or redo writes, so the write is not recorded as a change. */
let applying = false

/**
 * Take a step: `undo` or `redo` picks the stack. `allow` sees the entries and
 * categories the step would write and can veto it, leaving both stacks as they
 * were. Returns whether the book moved.
 */
export function applyHistoryStep(
  direction: "undo" | "redo",
  allow: (from: Snapshot, to: Snapshot) => boolean
): boolean {
  const now = current()
  const step = (direction === "undo" ? stepBack : stepForward)(
    useHistoryStore.getState(),
    now
  )
  if (!step || !allow(now, step.target)) return false
  applying = true
  try {
    useBookStore.getState().restoreSnapshot(step.target)
  } finally {
    applying = false
  }
  useHistoryStore.setState(step.history)
  return true
}

function clearHistory(): void {
  const { past, future } = useHistoryStore.getState()
  if (past.length === 0 && future.length === 0) return
  useHistoryStore.setState(EMPTY_HISTORY)
  // The receipts the stacks held can go now.
  useBookStore.setState((s) => ({ gcTick: s.gcTick + 1 }))
}

/**
 * Record every change to the entries or the categories as one undo step. Sets
 * made in the same task (a split writes twice, a bank import three times)
 * count as one step, with the state before the first as the way back.
 *
 * The stacks are dropped when another bookkeeping takes over (`bookEpoch`),
 * when the book is saved (`dirty` falls) and when a year is archived, whose
 * entries cannot come back without the stub that says where they went.
 */
export function startRecordingHistory(): () => void {
  let base: Snapshot | null = null

  const unsubscribe = useBookStore.subscribe((next, prev) => {
    if (!prev.hydrated || !next.hydrated) return
    if (
      next.bookEpoch !== prev.bookEpoch ||
      next.archives !== prev.archives ||
      next.archiveYear !== prev.archiveYear ||
      (prev.dirty && !next.dirty)
    ) {
      base = null
      clearHistory()
      return
    }
    if (applying) return
    if (next.entries === prev.entries && next.cats === prev.cats) return
    if (base) return
    base = { entries: prev.entries, cats: prev.cats }
    queueMicrotask(() => {
      const before = base
      base = null
      if (before)
        useHistoryStore.setState(record(useHistoryStore.getState(), before))
    })
  })

  return () => {
    unsubscribe()
    base = null
  }
}
