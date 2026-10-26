/**
 * The only module that imports pdfjs-dist.
 *
 * Reached exclusively through `await import("@/lib/browser/pdf")` from an
 * event handler, so pdf.js never enters the landing page's bundle. The worker
 * is copied to public/pdf.worker.min.mjs by scripts/copy-pdf-worker.mjs — see
 * the note there for why it is not resolved through the bundler.
 */

import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api"

import { BASE_PATH } from "@/lib/site"

let configured = false

async function pdfjs() {
  const lib = await import("pdfjs-dist")
  if (!configured) {
    // The one URL in the app that Next does not prefix for us: it is handed
    // to pdf.js, not to next/link, so it carries BASE_PATH by hand (§11b).
    lib.GlobalWorkerOptions.workerSrc = `${BASE_PATH}/pdf.worker.min.mjs`
    configured = true
  }
  return lib
}

export class PdfLoadError extends Error {
  constructor(override readonly cause: unknown) {
    super("Could not open the PDF")
    this.name = "PdfLoadError"
  }
}

/**
 * An open document plus its teardown.
 *
 * `destroy()` belongs to the loading task rather than the document proxy, so
 * bundling them here keeps the caller from having to hold both.
 */
export interface PdfHandle {
  doc: PDFDocumentProxy
  numPages: number
  destroy: () => Promise<void>
}

export async function loadPdf(blob: Blob): Promise<PdfHandle> {
  try {
    const lib = await pdfjs()
    const data = new Uint8Array(await blob.arrayBuffer())
    const task = lib.getDocument({ data })
    const doc = await task.promise
    return {
      doc,
      numPages: doc.numPages,
      destroy: () => task.destroy(),
    }
  } catch (cause) {
    // A worker/API version mismatch lands here too, which is why the viewer
    // always offers "save original" as a fallback.
    throw new PdfLoadError(cause)
  }
}

export async function renderPdfPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: { scale: number; rotation: number }
): Promise<void> {
  const page: PDFPageProxy = await doc.getPage(pageNumber)
  const viewport = page.getViewport({
    scale: options.scale,
    rotation: options.rotation,
  })
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const context = canvas.getContext("2d")
  if (!context) return
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
}

export async function pdfPageSize(
  doc: PDFDocumentProxy,
  pageNumber: number
): Promise<{ width: number; height: number }> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  return { width: viewport.width, height: viewport.height }
}
