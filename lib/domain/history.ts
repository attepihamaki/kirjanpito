import type { Invoice } from "@/lib/domain/invoice"
import type { Category, Entry } from "@/lib/domain/types"

/** The part of the book that Ctrl+Z moves back and forth (§8.20). */
export interface Snapshot {
  entries: readonly Entry[]
  cats: readonly Category[]
  invoices: readonly Invoice[]
}

/** Undo and redo stacks, the newest step last. */
export interface History {
  past: readonly Snapshot[]
  future: readonly Snapshot[]
}

export const EMPTY_HISTORY: History = { past: [], future: [] }

/** A new change: the state before it becomes the newest undo step. */
export function record(history: History, before: Snapshot): History {
  return { past: [...history.past, before], future: [] }
}

/**
 * Step back. `current` becomes the newest redo step. Null when there is
 * nothing to undo.
 */
export function stepBack(
  history: History,
  current: Snapshot
): { history: History; target: Snapshot } | null {
  const target = history.past.at(-1)
  if (!target) return null
  return {
    target,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
    },
  }
}

/** Step forward again. Null when there is nothing to redo. */
export function stepForward(
  history: History,
  current: Snapshot
): { history: History; target: Snapshot } | null {
  const target = history.future.at(-1)
  if (!target) return null
  return {
    target,
    history: {
      past: [...history.past, current],
      future: history.future.slice(0, -1),
    },
  }
}

/**
 * The entries a move from `from` to `to` adds, removes or changes, in both
 * versions. A lock check has to look at both: the entry as it is now and as it
 * would become.
 */
export function changedEntries(
  from: readonly Entry[],
  to: readonly Entry[]
): Entry[] {
  const before = new Map(from.map((e) => [e.id, e]))
  const after = new Map(to.map((e) => [e.id, e]))
  const changed: Entry[] = []
  for (const [id, e] of before) {
    const other = after.get(id)
    if (other === e) continue
    changed.push(e)
    if (other && other !== e) changed.push(other)
  }
  for (const [id, e] of after) {
    if (!before.has(id)) changed.push(e)
  }
  return changed
}

/**
 * The invoices a move from `from` to `to` leaves as they are. Only an issued
 * invoice that is the same in both versions locks its entries (§8.27): one that
 * the move issues, undoes or deletes is the very change being made.
 */
export function unchangedInvoices(
  from: readonly Invoice[],
  to: readonly Invoice[]
): Invoice[] {
  const after = new Set(to)
  return from.filter((i) => after.has(i))
}

/** Every receipt id the stacks can bring back, so the sweep keeps their files. */
export function historyAttachmentIds(history: History): string[] {
  const ids = new Set<string>()
  for (const snapshot of [...history.past, ...history.future]) {
    for (const e of snapshot.entries) {
      for (const a of e.atts ?? []) if (a.id) ids.add(a.id)
    }
  }
  return [...ids]
}
