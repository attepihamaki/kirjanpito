"use client"

import { create } from "zustand"

import type { ReceiptTexts } from "@/lib/domain/receipt-text"

/**
 * The receipt text index in memory (§8.4). A cache of what IndexedDB holds,
 * replaced as a whole on every change so a selector keyed on `texts` re-runs.
 */
interface ReceiptTextStore {
  texts: ReceiptTexts
  /** Merge entries in. */
  add(found: ReadonlyMap<string, string>): void
  /** Drop the ids not in `live`. */
  keepOnly(live: ReadonlySet<string>): void
}

export const useReceiptTextStore = create<ReceiptTextStore>()((set, get) => ({
  texts: new Map(),
  add: (found) => {
    if (!found.size) return
    set({ texts: new Map([...get().texts, ...found]) })
  },
  keepOnly: (live) => {
    const kept = [...get().texts].filter(([id]) => live.has(id))
    if (kept.length !== get().texts.size) set({ texts: new Map(kept) })
  },
}))
