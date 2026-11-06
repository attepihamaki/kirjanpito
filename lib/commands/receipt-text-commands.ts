import { getReceipt } from "@/lib/browser/receipt-store"
import { loadReceiptText, putReceiptText } from "@/lib/browser/receipt-text-db"
import { normalizeReceiptText } from "@/lib/domain/receipt-text"
import { isPdf } from "@/lib/domain/receipt-path"
import type { Entry } from "@/lib/domain/types"
import { useReceiptTextStore } from "@/stores/receipt-text-store"

/**
 * Receipt text search (§8.4). PDFs are read once and the text is kept in
 * IndexedDB, so a search never opens a document.
 */

/** Put what IndexedDB holds into memory. */
export async function restoreReceiptText(): Promise<void> {
  useReceiptTextStore.getState().add(await loadReceiptText())
}

const inFlight = new Set<string>()

/**
 * The text of one PDF, or "" when it has none or cannot be read. A scanned
 * page and a broken file both store "", so neither is opened again.
 */
async function readText(id: string): Promise<string> {
  try {
    const blob = await getReceipt(id)
    if (!blob) return ""
    const { extractPdfText } = await import("@/lib/browser/pdf")
    return normalizeReceiptText(await extractPdfText(blob))
  } catch {
    return ""
  }
}

/**
 * Index every PDF on `entries` that has no text yet, one at a time. Safe to
 * call often: a receipt already indexed or being read is skipped.
 */
export async function indexMissingReceipts(
  entries: readonly Entry[]
): Promise<void> {
  const store = useReceiptTextStore.getState
  const todo = new Map<string, true>()
  for (const entry of entries) {
    for (const att of entry.atts ?? []) {
      if (att.id && !att.missing && isPdf(att)) todo.set(att.id, true)
    }
  }
  for (const id of todo.keys()) {
    if (store().texts.has(id) || inFlight.has(id)) continue
    inFlight.add(id)
    try {
      const text = await readText(id)
      await putReceiptText(id, text).catch(() => {})
      store().add(new Map([[id, text]]))
    } finally {
      inFlight.delete(id)
    }
  }
}
