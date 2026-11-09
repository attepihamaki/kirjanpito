"use client"

import { create } from "zustand"

import type { ReceiptHashes } from "@/lib/domain/entry-checks"

/**
 * The receipt content hashes in memory (§8.4). A cache of what IndexedDB
 * holds, replaced as a whole on every change so a selector keyed on `hashes`
 * re-runs.
 */
interface ReceiptHashStore {
  hashes: ReceiptHashes
  /** Merge entries in. */
  add(found: ReadonlyMap<string, string>): void
  /** Drop the ids not in `live`. */
  keepOnly(live: ReadonlySet<string>): void
}

export const useReceiptHashStore = create<ReceiptHashStore>()((set, get) => ({
  hashes: new Map(),
  add: (found) => {
    if (!found.size) return
    set({ hashes: new Map([...get().hashes, ...found]) })
  },
  keepOnly: (live) => {
    const kept = [...get().hashes].filter(([id]) => live.has(id))
    if (kept.length !== get().hashes.size) set({ hashes: new Map(kept) })
  },
}))
