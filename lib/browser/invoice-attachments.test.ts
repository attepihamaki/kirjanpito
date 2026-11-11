import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"

import { appendFiles, canAppendPdf } from "@/lib/browser/invoice-attachments"

/** A 1×1 PNG. */
const PIXEL = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  ),
  (c) => c.charCodeAt(0)
)

async function pdfOf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage()
  return doc.save()
}

const pageCount = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPageCount()

describe("invoice attachments in the PDF (§8.27)", () => {
  it("adds a PDF's pages and a page per image after the invoice", async () => {
    const { bytes, skipped } = await appendFiles(await pdfOf(1), [
      { type: "application/pdf", bytes: await pdfOf(2) },
      { type: "image/png", bytes: PIXEL },
    ])
    expect(skipped).toBe(0)
    expect(await pageCount(bytes)).toBe(4)
  })

  it("leaves out a file it cannot read and counts it", async () => {
    const { bytes, skipped } = await appendFiles(await pdfOf(1), [
      { type: "application/pdf", bytes: new Uint8Array([1, 2, 3]) },
      { type: "image/jpeg", bytes: PIXEL },
    ])
    expect(skipped).toBe(2)
    expect(await pageCount(bytes)).toBe(1)
  })

  it("returns the invoice as it is when nothing is attached", async () => {
    const invoice = await pdfOf(1)
    expect((await appendFiles(invoice, [])).bytes).toBe(invoice)
  })

  it("tells a readable PDF from one that is not", async () => {
    expect(await canAppendPdf(await pdfOf(1))).toBe(true)
    expect(await canAppendPdf(new Uint8Array([1, 2]))).toBe(false)
  })
})
