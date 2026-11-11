import * as React from "react"

/** One message the app raised as a toast. */
export type ToastRecord = {
  id: number
  at: number
  type: string | undefined
  title: string
  description: string | undefined
}

/** The newest messages kept. Older ones fall off the end. */
const TOAST_HISTORY_LIMIT = 50

let records: readonly ToastRecord[] = []
let nextId = 1
/** The newest id the messages dialog has shown; anything after it is unread. */
let seenId = 0
const listeners = new Set<() => void>()

/**
 * Remember a toast. Only string titles and descriptions are kept; a toast
 * with neither is not a message and is skipped. The history lives in memory
 * for the session, so a reload or a closed book starts it empty.
 */
export function recordToast(options: {
  type?: string
  title?: unknown
  description?: unknown
}): void {
  const title = typeof options.title === "string" ? options.title : ""
  const description =
    typeof options.description === "string" ? options.description : undefined
  if (!title && !description) return
  records = [
    {
      id: nextId++,
      at: Date.now(),
      type: options.type,
      title: title || description!,
      description: title ? description : undefined,
    },
    ...records,
  ].slice(0, TOAST_HISTORY_LIMIT)
  listeners.forEach((l) => l())
}

/** Mark every recorded message read, as opening the messages dialog does. */
export function markToastsSeen(): void {
  const newest = records[0]?.id ?? 0
  if (newest <= seenId) return
  seenId = newest
  listeners.forEach((l) => l())
}

/** How many recorded messages arrived after the dialog last showed them. */
export function unreadToastCount(): number {
  let n = 0
  for (const r of records) {
    if (r.id <= seenId) break
    n += 1
  }
  return n
}

export function clearToastHistory(): void {
  if (records.length === 0) return
  records = []
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const EMPTY: readonly ToastRecord[] = []

/** The recorded toasts, newest first. */
export function useToastHistory(): readonly ToastRecord[] {
  return React.useSyncExternalStore(
    subscribe,
    () => records,
    () => EMPTY
  )
}

/** The number of unread messages, for the top bar's bell (§8.2). */
export function useUnreadToastCount(): number {
  return React.useSyncExternalStore(subscribe, unreadToastCount, () => 0)
}
