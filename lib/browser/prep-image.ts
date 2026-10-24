import {
  MAX_EDGE,
  jpegName,
  scaleFor,
  shouldKeepOriginal,
} from "@/lib/domain/image-policy"

export interface PreparedFile {
  blob: Blob
  name: string
  type: string
}

/**
 * Normalise a receipt image for storage (§7.4).
 *
 * The policy half lives in `lib/domain/image-policy.ts` so it is testable
 * without a canvas; this is only the drawing. If the browser cannot decode
 * the file at all — HEIC outside Safari, typically — the original is kept and
 * the preview falls back to the file name.
 */
export async function prepareImage(file: File): Promise<PreparedFile> {
  if (file.type === "application/pdf") {
    return { blob: file, name: file.name, type: file.type }
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { blob: file, name: file.name, type: file.type }
  }

  try {
    if (shouldKeepOriginal(bitmap.width, bitmap.height, file.size, file.type)) {
      return { blob: file, name: file.name, type: file.type }
    }

    const scale = scaleFor(bitmap.width, bitmap.height)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = Math.min(width, MAX_EDGE * 4)
    canvas.height = Math.min(height, MAX_EDGE * 4)
    const context = canvas.getContext("2d")
    if (!context) return { blob: file, name: file.name, type: file.type }

    // White, not transparent: a transparent PNG flattened to JPEG would
    // otherwise come out with a black background.
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    )
    if (!blob) return { blob: file, name: file.name, type: file.type }

    return { blob, name: jpegName(file.name), type: "image/jpeg" }
  } finally {
    bitmap?.close?.()
  }
}
