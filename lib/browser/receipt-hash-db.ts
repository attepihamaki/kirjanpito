import {
  createStore,
  delMany,
  entries,
  keys,
  set,
  type UseStore,
} from "idb-keyval"

/**
 * The content hash of receipts in IndexedDB (§8.4), keyed by attachment id.
 * It is a cache derived from the receipt blobs and is never written to the
 * file, so losing it costs one re-read.
 */
const DB_NAME = "bookkeeping-receipt-hash"
const STORE_NAME = "hash"

let store: UseStore | null = null

function db(): UseStore {
  if (!store) store = createStore(DB_NAME, STORE_NAME)
  return store
}

export async function loadReceiptHashes(): Promise<Map<string, string>> {
  const all = await entries<string, string>(db())
  return new Map(all)
}

export function putReceiptHash(id: string, hash: string): Promise<void> {
  return set(id, hash, db())
}

/** Delete the hash of every receipt `live` does not name. */
export async function pruneReceiptHashes(
  live: ReadonlySet<string>
): Promise<void> {
  const dead = ((await keys(db())) as string[]).filter((k) => !live.has(k))
  if (dead.length) await delMany(dead, db())
}
