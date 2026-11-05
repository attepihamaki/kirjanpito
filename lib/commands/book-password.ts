import { useBookStore } from "@/stores/book-store"

/**
 * The password of the open bookkeeping (§7.8), held in memory only. It is never
 * written to localStorage, IndexedDB or `settings.json`, so closing the tab, a
 * reload or opening another book drops it.
 *
 * It is tied to `bookEpoch`: another book taking over bumps the epoch, and the
 * old book's password then reads as absent without any call site having to
 * remember to clear it.
 */

let held: { epoch: number; password: string } | null = null

/** Remember `password` for the bookkeeping that is open right now. */
export function holdPassword(password: string): void {
  held = { epoch: useBookStore.getState().bookEpoch, password }
}

/** The password for the open bookkeeping, or null when none was given yet. */
export function heldPassword(): string | null {
  if (!held) return null
  return held.epoch === useBookStore.getState().bookEpoch ? held.password : null
}

export function forgetPassword(): void {
  held = null
}
