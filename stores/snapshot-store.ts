"use client"

import { create } from "zustand"

import type { SnapshotMeta } from "@/lib/domain/save-snapshots"

/**
 * The index of earlier saves in memory (§8.36), a cache of what IndexedDB
 * holds. `loaded` stays false until the index has been read, and the receipt
 * sweep waits for it, so a receipt only a snapshot still needs is never
 * deleted on a fresh page load.
 */
interface SnapshotStore {
  loaded: boolean
  metas: SnapshotMeta[]
  setMetas(metas: SnapshotMeta[]): void
}

export const useSnapshotStore = create<SnapshotStore>()((set) => ({
  loaded: false,
  metas: [],
  setMetas: (metas) => set({ metas, loaded: true }),
}))
