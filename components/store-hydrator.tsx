"use client"

import * as React from "react"

import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

/**
 * Rehydrates the stores from localStorage after mount.
 *
 * Both are created without automatic hydration, so prerender and the first
 * client render see the defaults — Finnish, no bookkeeping — and match byte
 * for byte. Everything that depends on real state waits behind `hydrated`.
 *
 * The language is its own key and its own store (§12), so the landing page
 * gets its preference without the `bookkeeping` key being read for it. The
 * book is still rehydrated here, for the landing page's open-file line; the
 * storage adapter is what keeps that read from creating the key.
 */
export function StoreHydrator() {
  React.useEffect(() => {
    useLangStore.getState().hydrate()

    let available = true
    try {
      void useBookStore.persist.rehydrate()
    } catch {
      available = false
    }

    const state = useBookStore.getState()
    useBookStore.getState().setHydrated({
      storageAvailable: available,
      // §8.1: when the flag was never stored, a bookkeeping is open if there
      // are entries.
      open: state.open || state.entries.length > 0,
    })
  }, [])

  return null
}
