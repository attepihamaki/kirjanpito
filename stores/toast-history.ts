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
export const TOAST_HISTORY_LIMIT = 50

let records: readonly ToastRecord[] = []
let nextId = 1
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
