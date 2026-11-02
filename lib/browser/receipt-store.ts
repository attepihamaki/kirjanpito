import { createStore, delMany, get, keys, set, type UseStore } from "idb-keyval"

/** Receipt blobs in IndexedDB, per CLAUDE.md §7.4. */
const DB_NAME = "bookkeeping-receipts"
const STORE_NAME = "files"

export class ReceiptStorageError extends Error {
  constructor(
    readonly op: string,
    override readonly cause: unknown
  ) {
    super(`Receipt storage failed during ${op}`)
    this.name = "ReceiptStorageError"
  }
}

let store: UseStore | null = null

function db(): UseStore {
  if (!store) store = createStore(DB_NAME, STORE_NAME)
  return store
}

export function isReceiptStorageSupported(): boolean {
  try {
    return typeof indexedDB !== "undefined"
  } catch {
    return false
  }
}

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (cause) {
    throw new ReceiptStorageError(op, cause)
  }
}

export function putReceipt(id: string, blob: Blob): Promise<void> {
  return guard("put", () => set(id, blob, db()))
}

export function getReceipt(id: string): Promise<Blob | undefined> {
  return guard("get", () => get<Blob>(id, db()))
}

/**
 * Delete every receipt `live` does not name, in one transaction. Deliberately
 * dumb: it never reaches into the store. `live` is asked only after the keys
 * are read, right before deleting, so a receipt registered while they were
 * being read is still counted. Null from it cancels the sweep. Returns how many
 * blobs were removed.
 */
export async function gcReceipts(
  live: () => ReadonlySet<string> | null
): Promise<number> {
  return guard("gc", async () => {
    const all = (await keys(db())) as string[]
    const keep = live()
    if (!keep) return 0
    const dead = all.filter((k) => !keep.has(k))
    if (dead.length) await delMany(dead, db())
    return dead.length
  })
}
