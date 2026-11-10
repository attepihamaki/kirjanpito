"use client"

import * as React from "react"

import { useBookStore } from "@/stores/book-store"

/**
 * Keeps `dirtySince` in step with `dirty` (§8.33): the moment the book goes
 * from saved to unsaved, and null again once it is saved. A book stored as
 * unsaved without the time counts from now.
 */
export function useDirtySince(): void {
  React.useEffect(() => {
    const sync = (dirty: boolean, since: number | null) => {
      if (dirty && since === null) {
        useBookStore.setState({ dirtySince: Date.now() })
      } else if (!dirty && since !== null) {
        useBookStore.setState({ dirtySince: null })
      }
    }
    const s = useBookStore.getState()
    sync(s.dirty, s.dirtySince)
    return useBookStore.subscribe((next, before) => {
      if (next.dirty !== before.dirty) sync(next.dirty, next.dirtySince)
    })
  }, [])
}
