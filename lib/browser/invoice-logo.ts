import type { InvoiceLogo } from "@/lib/domain/invoice"

/** The largest the stored logo is, in pixels: about three times its printed size. */
const MAX_WIDTH = 480
const MAX_HEIGHT = 150

/** The most base64 characters a logo may take, as `parseInvoiceSettings` reads it. */
const MAX_DATA = 400_000

/**
 * A picked image as the documents' logo (§8.27), scaled down to fit
 * `MAX_WIDTH` × `MAX_HEIGHT` so `settings.json` stays small. A PNG stays a
 * PNG, which keeps a transparent background; anything else becomes a JPEG on
 * white. Null when the browser cannot read the image or it is still too
 * large.
 */
export async function readLogo(file: Blob): Promise<InvoiceLogo | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  const scale = Math.min(
    MAX_WIDTH / bitmap.width,
    MAX_HEIGHT / bitmap.height,
    1
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext("2d")
  if (!g) return null
  const png = file.type === "image/png"
  if (!png) {
    g.fillStyle = "#ffffff"
    g.fillRect(0, 0, width, height)
  }
  g.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const type = png ? "image/png" : "image/jpeg"
  const url = canvas.toDataURL(type, 0.9)
  const data = url.slice(url.indexOf(",") + 1)
  if (!url.startsWith(`data:${type};base64,`) || data.length > MAX_DATA)
    return null
  return { type, data, width, height }
}
