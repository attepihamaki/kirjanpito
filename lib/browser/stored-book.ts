import { saveBlob } from "@/lib/browser/download"
import { BOOK_STORAGE_KEY } from "@/stores/book-store"

/**
 * The browser's own copy of the bookkeeping, as it is stored, for a user whose
 * app cannot make a file any more. It cannot be opened as a book, but nothing
 * in it is lost, and it is what a bug report needs. False when there is none.
 */
export function downloadStoredBook(): boolean {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(BOOK_STORAGE_KEY)
  } catch {
    return false
  }
  if (raw === null) return false
  saveBlob(
    new Blob([raw], { type: "application/json" }),
    `${BOOK_STORAGE_KEY}-browser-data.json`
  )
  return true
}
