"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { isFileHandleSupported } from "@/lib/browser/file-handle"
import { saveBook } from "@/lib/commands/io-commands"
import { defaultFileBaseName } from "@/lib/domain/receipt-path"

/**
 * Saving the bookkeeping back to its own file (§7.5).
 *
 * Everything here is behind `useCanSaveToFile`, which is false on Firefox,
 * Safari and phones — the app keeps working there exactly as it did, with the
 * downloaded copy as the way to keep the work.
 */

/*
 * Both capabilities are read through `useSyncExternalStore`, the sanctioned
 * way to use a browser-only value without the first client render disagreeing
 * with the prerendered HTML. Neither ever changes, so the subscribe function
 * has nothing to listen to.
 */
const neverChanges = () => () => {}

const no = () => false
const nothing = () => ""

/** Whether this browser can write to a file at all (§7.5). */
export function useCanSaveToFile(): boolean {
  return React.useSyncExternalStore(neverChanges, isFileHandleSupported, no)
}

function platform(): string {
  return /mac|iphone|ipad/i.test(navigator.userAgent) ? "mac" : "other"
}

export interface Shortcut {
  /** What the key cap reads: "⇧⌘S" on a Mac, "Ctrl+Shift+S" elsewhere. */
  label: string
  /**
   * The same combination in `aria-keyshortcuts` tokens. It belongs on the
   * control, not in its name: the key cap is `aria-hidden`, because an
   * accessible name of "TallennaCtrl+S" is what you get otherwise — names
   * concatenate with no separator.
   */
  aria: string
}

const NONE: Shortcut = { label: "", aria: "" }

/**
 * How a shortcut is written here. A formatter rather than one value, because
 * the file menu spells out three of them and they have to agree.
 */
export function useShortcut(): (key: string, shift?: boolean) => Shortcut {
  const os = React.useSyncExternalStore(neverChanges, platform, nothing)

  return React.useCallback(
    (key: string, shift = false) => {
      // Nothing until mounted: the platform is unknown while prerendering.
      if (!os) return NONE
      const k = key.toUpperCase()
      const mod = shift ? "Shift+" : ""
      return {
        label: os === "mac" ? `${shift ? "⇧" : ""}⌘${k}` : `Ctrl+${mod}${k}`,
        aria: os === "mac" ? `Meta+${mod}${k}` : `Control+${mod}${k}`,
      }
    },
    [os]
  )
}

/**
 * Run a save. Always from a user gesture — both the write-permission prompt
 * and the save picker are refused without one.
 */
export function useSaveBook(): () => void {
  const f = useFormatters()
  const ctx = useCommandCtx()

  return React.useCallback(() => {
    void saveBook(ctx, defaultFileBaseName(f.lang))
  }, [ctx, f.lang])
}
