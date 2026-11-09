import { getReceipt } from "@/lib/browser/receipt-store"
import {
  loadReceiptHashes,
  putReceiptHash,
} from "@/lib/browser/receipt-hash-db"
import { sha256Bytes } from "@/lib/domain/integrity"
import type { Entry } from "@/lib/domain/types"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"

/**
 * Receipt content hashes (§8.4). Each stored receipt is read once and its
 * SHA-256 kept in IndexedDB, so a duplicate check never opens a file.
 */

/** Put what IndexedDB holds into memory. */
export async function restoreReceiptHashes(): Promise<void> {
  useReceiptHashStore.getState().add(await loadReceiptHashes())
}

/** The SHA-256 of a blob, as lowercase hex. */
async function hashBlob(blob: Blob): Promise<string> {
  return sha256Bytes(new Uint8Array(await blob.arrayBuffer()))
}

/**
 * Hash a file that has just been attached and remember it under `id`, so the
 * duplicate hint can use it at once. Null when the file cannot be read.
 */
export async function rememberReceiptHash(
  id: string,
  file: Blob
): Promise<string | null> {
  try {
    const hash = await hashBlob(file)
    await putReceiptHash(id, hash).catch(() => {})
    useReceiptHashStore.getState().add(new Map([[id, hash]]))
    return hash
  } catch {
    return null
  }
}

const inFlight = new Set<string>()

/**
 * Hash every stored receipt on `entries` that has no hash yet, one at a time.
 * Safe to call often: a receipt already hashed or being read is skipped.
 */
export async function hashMissingReceipts(
  entries: readonly Entry[]
): Promise<void> {
  const store = useReceiptHashStore.getState
  const todo = new Set<string>()
  for (const entry of entries) {
    for (const att of entry.atts ?? []) {
      if (att.id && !att.missing) todo.add(att.id)
    }
  }
  for (const id of todo) {
    if (store().hashes.has(id) || inFlight.has(id)) continue
    inFlight.add(id)
    try {
      const blob = await getReceipt(id).catch(() => undefined)
      if (blob) await rememberReceiptHash(id, blob)
    } finally {
      inFlight.delete(id)
    }
  }
}
