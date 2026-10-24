"use client"

import * as React from "react"

import { useBookStore } from "@/stores/book-store"

/**
 * Rehydrates the store from localStorage after mount.
 *
 * The store is created with `skipHydration`, so prerender and the first
 * client render both see the defaults and match byte for byte. Everything
 * that depends on real state waits behind `hydrated`.
 */
export function StoreHydrator() {
  React.useEffect(() => {
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
