/**
 * One tab at a time holds the bookkeeping (§12), through the Web Locks API.
 *
 * Storage is shared between tabs and the store is not, so a second tab working
 * on the same book would overwrite the first one's entries and delete its
 * receipts. The lock is released by the browser when a tab closes or crashes,
 * which a flag in localStorage could not do.
 */

const LOCK_NAME = "bookkeeping-app"

let holding = false

function lockManager(): LockManager | null {
  try {
    return typeof navigator === "undefined" ? null : (navigator.locks ?? null)
  } catch {
    return null
  }
}

/**
 * Wait for the lock and call `onClaimed` once it is held. Returns the function
 * that gives it up, or stops waiting for it. A browser without Web Locks, or
 * one whose lock request fails, gets no protection rather than a locked app.
 */
export function claimTab(onClaimed: () => void): () => void {
  const manager = lockManager()
  if (!manager) {
    onClaimed()
    return () => {}
  }

  const waiting = new AbortController()
  let release = () => {}
  manager
    .request(LOCK_NAME, { signal: waiting.signal }, () => {
      holding = true
      onClaimed()
      return new Promise<void>((resolve) => {
        release = () => {
          holding = false
          resolve()
        }
      })
    })
    .catch((error: unknown) => {
      if (!waiting.signal.aborted) {
        console.warn("Could not claim the bookkeeping for this tab", error)
        onClaimed()
      }
    })

  return () => {
    waiting.abort()
    release()
  }
}

/** Whether a different tab holds the lock. A tab waiting for it does not count. */
export async function heldByAnotherTab(): Promise<boolean> {
  const manager = lockManager()
  if (!manager || holding) return false
  try {
    const { held } = await manager.query()
    return held?.some((lock) => lock.name === LOCK_NAME) ?? false
  } catch {
    return false
  }
}
