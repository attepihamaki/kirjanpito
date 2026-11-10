/**
 * Messages for screen readers that no visible element carries (§11): a save
 * made in the background, autosave stopping, a bank statement read. The
 * `LiveAnnouncer` holds the live regions, mounted once and empty, because a
 * region added together with its text is not reliably read.
 */

export type Politeness = "polite" | "assertive"

type Listener = (text: string, politeness: Politeness) => void

const listeners = new Set<Listener>()

/** Read `text` out. An assertive message interrupts; a polite one waits its turn. */
export function announce(text: string, politeness: Politeness = "polite") {
  if (text.trim() === "") return
  for (const listener of listeners) listener(text, politeness)
}

/** Listen for messages; returns the function that stops listening. */
export function onAnnounce(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
