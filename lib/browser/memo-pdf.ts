import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"

import {
  toWinAnsi,
  type MemoRow,
  type MemoVoucher,
} from "@/lib/domain/memo-voucher"

/**
 * Draw a memo voucher (§8.8) as a one-page A4 PDF. The only module importing
 * pdf-lib, and always imported dynamically, so it stays out of every bundle
 * until an entry is booked.
 */

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 56
const INK = rgb(0.1, 0.1, 0.1)
const MUTED = rgb(0.42, 0.42, 0.42)
const RULE = rgb(0.8, 0.8, 0.8)

/**
 * Where the next line goes. `y` is the top of the free space, so each line
 * drops by its own size before it is drawn, and a large heading under small
 * text gets the room it needs.
 */
interface Pen {
  page: PDFPage
  regular: PDFFont
  bold: PDFFont
  y: number
}

/** Line pitch as a multiple of the font size. */
const LEADING = 1.35

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function text(
  pen: Pen,
  value: string,
  { size = 10, bold = false, color = INK, x = MARGIN } = {}
) {
  const font = bold ? pen.bold : pen.regular
  const width = A4[0] - MARGIN - x
  for (const line of wrap(toWinAnsi(value), font, size, width)) {
    pen.page.drawText(line, { x, y: pen.y - size, size, font, color })
    pen.y -= size * LEADING
  }
}

function rule(pen: Pen) {
  pen.page.drawLine({
    start: { x: MARGIN, y: pen.y - 2 },
    end: { x: A4[0] - MARGIN, y: pen.y - 2 },
    thickness: 0.5,
    color: RULE,
  })
  pen.y -= 8
}

/** A label on the left and its value right-aligned; a long value wraps under the label. */
function rows(pen: Pen, items: readonly MemoRow[]) {
  const size = 10
  const right = A4[0] - MARGIN
  for (const row of items) {
    const font = row.strong ? pen.bold : pen.regular
    const label = toWinAnsi(row.label)
    const value = toWinAnsi(row.value)
    const labelWidth = font.widthOfTextAtSize(label, size)
    const valueWidth = font.widthOfTextAtSize(value, size)
    const baseline = pen.y - size
    pen.page.drawText(label, {
      x: MARGIN,
      y: baseline,
      size,
      font,
      color: row.strong ? INK : MUTED,
    })
    if (labelWidth + valueWidth + 24 <= right - MARGIN) {
      pen.page.drawText(value, {
        x: right - valueWidth,
        y: baseline,
        size,
        font,
        color: INK,
      })
      pen.y -= size * 1.6
    } else {
      pen.y -= size * LEADING
      text(pen, row.value, { size, bold: row.strong, x: MARGIN + 12 })
      pen.y -= size * 0.25
    }
  }
}

export async function renderMemoPdf(memo: MemoVoucher): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(toWinAnsi(`${memo.title}: ${memo.heading}`))
  doc.setCreator("Kirjanpito")
  doc.setCreationDate(new Date())
  const pen: Pen = {
    page: doc.addPage(A4),
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    y: A4[1] - MARGIN,
  }

  text(pen, memo.title, { size: 9, color: MUTED })
  text(pen, memo.heading, { size: 18, bold: true })
  pen.y -= 4
  if (memo.business) text(pen, memo.business, { color: MUTED })
  text(pen, memo.made, { color: MUTED })
  pen.y -= 14

  text(pen, memo.entryTitle, { size: 11, bold: true })
  rule(pen)
  rows(pen, memo.entry)
  pen.y -= 14

  text(pen, memo.calcTitle, { size: 11, bold: true })
  rule(pen)
  rows(pen, memo.calculation)
  pen.y -= 14

  for (const note of memo.notes) {
    text(pen, note, { size: 9, color: MUTED })
    pen.y -= 4
  }

  return doc.save()
}
