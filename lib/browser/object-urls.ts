/**
 * Object URLs for receipt thumbnails, reference-counted so a thumbnail
 * scrolling out of a paginated table releases its URL without breaking
 * another component still showing the same receipt.
 */

interface Held {
  url: string
  refs: number
}

const held = new Map<string, Held>()

export function acquireObjectUrl(id: string, blob: Blob): string {
  const existing = held.get(id)
  if (existing) {
    existing.refs += 1
    return existing.url
  }
  const url = URL.createObjectURL(blob)
  held.set(id, { url, refs: 1 })
  return url
}

export function releaseObjectUrl(id: string): void {
  const existing = held.get(id)
  if (!existing) return
  existing.refs -= 1
  if (existing.refs <= 0) {
    URL.revokeObjectURL(existing.url)
    held.delete(id)
  }
}

/**
 * Revoke everything. Called before close-file and import, ahead of the GC
 * sweep — revoking first avoids a flash of broken images.
 */
export function releaseAllObjectUrls(): void {
  for (const { url } of held.values()) URL.revokeObjectURL(url)
  held.clear()
}
