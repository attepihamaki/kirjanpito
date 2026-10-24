import { createStore, delMany, get, keys, set, type UseStore } from "idb-keyval"

/**
 * Receipt blobs in IndexedDB, per CLAUDE.md §7.4.
 *
 * The prototype-era database was `kirjanpito-tositteet`; nothing migrates from
 * it, so receipts stored under that name are not reachable and the user
 * re-imports their ZIP to get them back.
 */
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
 * Delete everything not in `keep`, in one transaction. Deliberately dumb: it
 * never reaches into the store, so it is a pure function of its argument.
 * Returns how many blobs were removed.
 */
export async function gcReceipts(keep: ReadonlySet<string>): Promise<number> {
  return guard("gc", async () => {
    const all = (await keys(db())) as string[]
    const dead = all.filter((k) => !keep.has(k))
    if (dead.length) await delMany(dead, db())
    return dead.length
  })
}
