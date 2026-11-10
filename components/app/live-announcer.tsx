"use client"

import * as React from "react"

import { useT } from "@/components/lang-provider"
import { announce, onAnnounce, type Politeness } from "@/lib/browser/announce"
import { useBookStore } from "@/stores/book-store"

/** How long a message stays in its region before it is cleared. */
const CLEAR_AFTER_MS = 5000

/**
 * The app's two live regions, polite and assertive, visually hidden (§11).
 * The same message twice in a row is still read: the region is emptied
 * first, and the text set on the next frame.
 */
export function LiveAnnouncer() {
  const [text, setText] = React.useState<Record<Politeness, string>>({
    polite: "",
    assertive: "",
  })

  React.useEffect(() => {
    const timers: Partial<Record<Politeness, ReturnType<typeof setTimeout>>> =
      {}
    const frames: Partial<Record<Politeness, number>> = {}
    const stop = onAnnounce((message, politeness) => {
      clearTimeout(timers[politeness])
      if (frames[politeness] !== undefined)
        cancelAnimationFrame(frames[politeness])
      setText((t) => ({ ...t, [politeness]: "" }))
      frames[politeness] = requestAnimationFrame(() => {
        setText((t) => ({ ...t, [politeness]: message }))
        timers[politeness] = setTimeout(
          () => setText((t) => ({ ...t, [politeness]: "" })),
          CLEAR_AFTER_MS
        )
      })
    })
    return () => {
      stop()
      for (const id of Object.values(timers)) clearTimeout(id)
      for (const id of Object.values(frames)) cancelAnimationFrame(id)
    }
  }, [])

  useSaveAnnouncements()

  return (
    <>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="live-polite"
      >
        {text.polite}
      </div>
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="live-assertive"
      >
        {text.assertive}
      </div>
    </>
  )
}

/**
 * Autosave stopping, which the save status shows only as an amber dot (§8.2).
 * Autosave announces its own saves (`autosaveBook`); a save the user starts,
 * and the storage warning, have toasts, which are read already.
 */
function useSaveAnnouncements() {
  const t = useT()
  React.useEffect(
    () =>
      useBookStore.subscribe((s, before) => {
        if (s.autosavePaused && !before.autosavePaused && s.autosave) {
          announce(t("file.autosavePaused"), "assertive")
        }
      }),
    [t]
  )
}
