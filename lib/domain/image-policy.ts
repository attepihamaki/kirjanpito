/**
 * The decision half of receipt image preparation (§7.4), kept here so it is
 * testable in plain Node. The canvas work lives in `lib/browser/prep-image.ts`.
 */

export const MAX_EDGE = 2000
export const MAX_KEEP_BYTES = 1_500_000

const KEEPABLE = new Set(["image/jpeg", "image/png", "image/webp"])

/**
 * Keep the original when its long edge is ≤ 2000 px, it is at most 1,5 MB and
 * it is already a JPEG, PNG or WebP. Anything else is redrawn as JPEG.
 */
export function shouldKeepOriginal(
  width: number,
  height: number,
  size: number,
  type: string
): boolean {
  return (
    Math.max(width, height) <= MAX_EDGE &&
    size <= MAX_KEEP_BYTES &&
    KEEPABLE.has(type)
  )
}

/** The scale factor to apply when redrawing — never upscales. */
export function scaleFor(width: number, height: number): number {
  const longEdge = Math.max(width, height)
  return longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1
}

/** Rename to .jpg for a re-encoded image. */
export function jpegName(name: string): string {
  const s = String(name ?? "").trim() || "tosite"
  return /\.[a-z0-9]+$/i.test(s)
    ? s.replace(/\.[a-z0-9]+$/i, ".jpg")
    : `${s}.jpg`
}
