/**
 * HEIC and HEIF photos, as an iPhone takes them, are turned into JPEG when
 * they are attached (§7.4), because most browsers cannot draw them. The JPEG
 * replaces the original: KPL 2:7 allows a voucher's form to change while its
 * content stays readable, and a voucher nobody can open is worse than either.
 *
 * Only the browser's own decoder is used. Where it cannot read the photo, as
 * outside Safari, the file is kept as it came, as before.
 */

/** The JPEG quality a converted photo is written at: high enough that small print stays legible. */
const JPEG_QUALITY = 0.9

export function isHeic(file: Pick<File, "name" | "type">): boolean {
  return (
    /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name.trim())
  )
}

/** `name` with its extension replaced by `.jpg`, or `.jpg` added when it has none. */
export function jpegName(name: string): string {
  const trimmed = name.trim()
  const dot = trimmed.lastIndexOf(".")
  return `${dot > 0 ? trimmed.slice(0, dot) : trimmed || "kuva"}.jpg`
}

/**
 * The file to store for `file`: a JPEG of a HEIC photo the browser can
 * decode, else `file` itself. Never throws; a failure keeps the original.
 */
export async function storableImage(file: File): Promise<File> {
  if (!isHeic(file) || typeof createImageBitmap !== "function") return file
  try {
    /* "from-image" turns the photo the way its EXIF orientation says, so the JPEG needs no tag. */
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    })
    try {
      const canvas = document.createElement("canvas")
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext("2d")
      if (!context) return file
      context.drawImage(bitmap, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
      )
      if (!blob || blob.size === 0) return file
      return new File([blob], jpegName(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      })
    } finally {
      bitmap.close()
    }
  } catch {
    return file
  }
}
