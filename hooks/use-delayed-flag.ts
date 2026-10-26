"use client"

import * as React from "react"

/** How long work may run before it is worth telling the user about it. */
export const BUSY_DELAY_MS = 400

/**
 * `true` once `active` has been true for `delay` ms, and `false` the moment
 * it stops.
 *
 * Progress indication that appears instantly is worse than none: opening a
 * plain CSV takes a few milliseconds, and a spinner that flashes for one
 * frame reads as a glitch rather than as progress. Unpacking a ZIP of
 * receipts takes seconds, and that is what the indicator is for. Gating on
 * elapsed time rather than on the kind of file keeps the rule in one place.
 */
export function useDelayedFlag(
  active: boolean,
  delay: number = BUSY_DELAY_MS
): boolean {
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setShown(true), delay)
    /*
     * Also the reset: the cleanup runs when `active` goes false again, so
     * there is no second effect setting state on the inactive path.
     */
    return () => {
      clearTimeout(timer)
      setShown(false)
    }
  }, [active, delay])

  return shown
}
