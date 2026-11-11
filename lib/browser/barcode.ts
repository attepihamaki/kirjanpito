import type { DecodeHintType } from "@zxing/library"

import { billCodeFrom, type BillCode } from "@/lib/domain/bill-code"

/*
 * Reading the bank barcode and the EPC QR code off a bill (§8.30): a photo or
 * the first page of a PDF is drawn to a canvas and scanned in the browser.
 * Nothing leaves the device. The browser's own `BarcodeDetector` is tried
 * first where it exists; `@zxing/library`, plain JavaScript that needs no
 * wasm and so fits the CSP of §11b, reads it everywhere else. It is imported
 * only when a code is looked for.
 */

/** The longest side a picture is scanned at: a phone photo shrunk to this still reads, and stays quick. */
const MAX_SIDE = 2000

/** A PDF page is drawn at this many pixels per point, enough for a printed barcode. */
const PDF_SCALE = 2.5

async function canvasFromImage(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  })
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}

async function canvasFromPdf(blob: Blob): Promise<HTMLCanvasElement> {
  const { loadPdf, renderPdfPage } = await import("@/lib/browser/pdf")
  const handle = await loadPdf(blob)
  try {
    const canvas = document.createElement("canvas")
    await renderPdfPage(handle.doc, 1, canvas, {
      scale: PDF_SCALE,
      rotation: 0,
    })
    return canvas
  } finally {
    await handle.destroy()
  }
}

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}

interface NativeDetectorClass {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats(): Promise<string[]>
}

async function readNative(canvas: HTMLCanvasElement): Promise<string[]> {
  const Detector = (globalThis as { BarcodeDetector?: NativeDetectorClass })
    .BarcodeDetector
  if (!Detector) return []
  try {
    const supported = await Detector.getSupportedFormats()
    const formats = ["code_128", "qr_code"].filter((f) => supported.includes(f))
    if (formats.length === 0) return []
    const found = await new Detector({ formats }).detect(canvas)
    return found.map((b) => b.rawValue)
  } catch {
    return []
  }
}

/*
 * zxing finds one code per pass, so the bank barcode and the QR code each get
 * a pass of their own: a bill printed with both still gives the barcode,
 * which also carries the due date.
 */
async function readZxing(canvas: HTMLCanvasElement): Promise<string[]> {
  const zx = await import("@zxing/library")
  const source = new zx.HTMLCanvasElementLuminanceSource(canvas)
  const found: string[] = []
  for (const format of [zx.BarcodeFormat.CODE_128, zx.BarcodeFormat.QR_CODE]) {
    const reader = new zx.MultiFormatReader()
    const hints = new Map<DecodeHintType, unknown>([
      [zx.DecodeHintType.POSSIBLE_FORMATS, [format]],
      [zx.DecodeHintType.TRY_HARDER, true],
    ])
    reader.setHints(hints)
    try {
      found.push(
        reader
          .decode(new zx.BinaryBitmap(new zx.HybridBinarizer(source)))
          .getText()
      )
    } catch {
      // Nothing of this format on the page.
    }
  }
  return found
}

/**
 * The payment details printed as a code on a bill, or null when the file has
 * none that reads. A file that is neither an image nor a PDF gives null.
 */
export async function readBillCode(blob: Blob): Promise<BillCode | null> {
  const pdf = blob.type === "application/pdf"
  if (!pdf && !blob.type.startsWith("image/")) return null
  let canvas: HTMLCanvasElement
  try {
    canvas = pdf ? await canvasFromPdf(blob) : await canvasFromImage(blob)
  } catch {
    return null
  }
  const native = billCodeFrom(await readNative(canvas))
  if (native) return native
  try {
    return billCodeFrom(await readZxing(canvas))
  } catch {
    return null
  }
}
