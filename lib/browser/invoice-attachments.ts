import { PDFDocument } from "pdf-lib"

import type { InvoiceFileType } from "@/lib/domain/invoice"

/** An attached file's bytes, as `appendFiles` takes them. */
export interface AttachedBytes {
  type: InvoiceFileType
  bytes: Uint8Array
}

/** A4 in points, the size an image's page is given. */
const A4: [number, number] = [595.28, 841.89]
const MARGIN = 36

/**
 * The invoice's PDF with its attached files after its own pages (§8.27): a
 * PDF's pages are copied as they are, and an image gets an A4 page of its own,
 * scaled down to fit inside the margins and never enlarged. A file that
 * cannot be read, such as an encrypted PDF, is left out and counted, so one
 * bad file never stops the invoice.
 */
export async function appendFiles(
  pdf: Uint8Array,
  files: readonly AttachedBytes[]
): Promise<{ bytes: Uint8Array; skipped: number }> {
  if (files.length === 0) return { bytes: pdf, skipped: 0 }
  const doc = await PDFDocument.load(pdf)
  let skipped = 0
  for (const file of files) {
    try {
      if (file.type === "application/pdf") {
        const source = await PDFDocument.load(file.bytes)
        const pages = await doc.copyPages(source, source.getPageIndices())
        for (const page of pages) doc.addPage(page)
        continue
      }
      const image =
        file.type === "image/png"
          ? await doc.embedPng(file.bytes)
          : await doc.embedJpg(file.bytes)
      const page = doc.addPage(A4)
      const scale = Math.min(
        1,
        (A4[0] - 2 * MARGIN) / image.width,
        (A4[1] - 2 * MARGIN) / image.height
      )
      const width = image.width * scale
      const height = image.height * scale
      page.drawImage(image, {
        x: (A4[0] - width) / 2,
        y: A4[1] - MARGIN - height,
        width,
        height,
      })
    } catch (error) {
      console.warn("An invoice attachment could not be added", error)
      skipped += 1
    }
  }
  return { bytes: await doc.save(), skipped }
}

/** Whether a PDF file can be read and copied from, which an encrypted one cannot. */
export async function canAppendPdf(bytes: Uint8Array): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(bytes)
    return doc.getPageCount() > 0
  } catch {
    return false
  }
}
