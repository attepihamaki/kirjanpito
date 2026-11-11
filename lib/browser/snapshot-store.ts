import { createStore, del, delMany, get, set, type UseStore } from "idb-keyval"

import {
  parseSnapshotIndex,
  type SnapshotMeta,
} from "@/lib/domain/save-snapshots"
import { useSnapshotStore } from "@/stores/snapshot-store"

/**
 * Earlier saves in IndexedDB (§8.36): one key for the index and one per
 * snapshot for the book itself, so the list opens without reading every
 * book. A database of its own, so the receipt sweep never sees these keys.
 */
const DB_NAME = "bookkeeping-snapshots"
const STORE_NAME = "snapshots"
const INDEX_KEY = "index"

/** A stored book: the persisted slice of the book store and its version (§12). */
export interface StoredSnapshot {
  version: number
  state: Record<string, unknown>
}

let store: UseStore | null = null

function db(): UseStore {
  if (!store) store = createStore(DB_NAME, STORE_NAME)
  return store
}

const bookKey = (id: string) => `book:${id}`

let loading: Promise<SnapshotMeta[] | null> | null = null

/**
 * The index, read once per page load and then served from memory. Null when
 * IndexedDB cannot be read, which tells the receipt sweep to stand down.
 */
export function loadSnapshotIndex(): Promise<SnapshotMeta[] | null> {
  const mem = useSnapshotStore.getState()
  if (mem.loaded) return Promise.resolve(mem.metas)
  loading ??= get(INDEX_KEY, db())
    .then((raw) => {
      const metas = parseSnapshotIndex(raw)
      useSnapshotStore.getState().setMetas(metas)
      return metas
    })
    .catch((error: unknown) => {
      console.warn("Could not read the earlier saves", error)
      loading = null
      return null
    })
  return loading
}

/** Write a snapshot and the index that lists it, deleting the books `dropped` names. */
export async function putSnapshot(
  meta: SnapshotMeta,
  book: StoredSnapshot,
  metas: SnapshotMeta[],
  dropped: readonly string[]
): Promise<void> {
  await set(bookKey(meta.id), book, db())
  await set(INDEX_KEY, metas, db())
  useSnapshotStore.getState().setMetas(metas)
  if (dropped.length) await delMany(dropped.map(bookKey), db())
}

export async function getSnapshot(
  id: string
): Promise<StoredSnapshot | undefined> {
  return get<StoredSnapshot>(bookKey(id), db())
}

/** Remove one snapshot. The index goes first, so a failure leaves at most an unlisted book. */
export async function deleteSnapshot(
  id: string,
  metas: SnapshotMeta[]
): Promise<void> {
  const next = metas.filter((m) => m.id !== id)
  await set(INDEX_KEY, next, db())
  useSnapshotStore.getState().setMetas(next)
  await del(bookKey(id), db())
}
