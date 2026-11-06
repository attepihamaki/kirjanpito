import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"

import { toWinAnsi } from "@/lib/domain/memo-voucher"
import type {
  ReportBlock,
  ReportColumn,
  ReportDoc,
  ReportRow,
} from "@/lib/domain/year-reports"

/**
 * Draw a report (§8.21) as an A4 PDF in the standard fonts, so the text stays
 * selectable and a file stays small. Like `memo-pdf.ts` this is the only module
 * that imports pdf-lib for it, and it is always imported dynamically.
 */

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 40
const INK = rgb(0.1, 0.1, 0.1)
const MUTED = rgb(0.42, 0.42, 0.42)
const RULE = rgb(0.8, 0.8, 0.8)

const SIZE = 8.5
const SMALL = 7
const LEADING = 1.3
const GAP = 6

interface Fonts {
  regular: PDFFont
  bold: PDFFont
}

/** Where the next line goes: `y` is the top of the free space on the page. */
class Pen {
  page: PDFPage
  y = A4[1] - MARGIN
  pageNumber = 1

  constructor(
    private doc: PDFDocument,
    readonly fonts: Fonts,
    private onPage: (page: PDFPage, number: number) => void
  ) {
    this.page = doc.addPage(A4)
    onPage(this.page, 1)
  }

  /** Move to a new page unless `height` still fits on this one. */
  ensure(height: number): boolean {
    if (this.y - height >= MARGIN + 14) return false
    this.page = this.doc.addPage(A4)
    this.pageNumber += 1
    this.y = A4[1] - MARGIN
    this.onPage(this.page, this.pageNumber)
    return true
  }
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    let line = ""
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines
}

/** A word wider than its column is cut, so no cell can run into the next. */
function fit(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text
  let out = text
  while (out.length > 1 && font.widthOfTextAtSize(`${out}-`, size) > width) {
    out = out.slice(0, -1)
  }
  return `${out}-`
}

function paragraph(
  pen: Pen,
  text: string,
  {
    size = SIZE,
    bold = false,
    color = INK,
  }: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}
) {
  const font = bold ? pen.fonts.bold : pen.fonts.regular
  const width = A4[0] - 2 * MARGIN
  for (const line of wrap(toWinAnsi(text), font, size, width)) {
    pen.ensure(size * LEADING)
    pen.page.drawText(line, { x: MARGIN, y: pen.y - size, size, font, color })
    pen.y -= size * LEADING
  }
}

/** Column x positions and widths for a table across the page. */
function layout(columns: readonly ReportColumn[]) {
  const total = A4[0] - 2 * MARGIN
  const sum = columns.reduce((acc, c) => acc + c.weight, 0)
  const pad = 6
  let x = MARGIN
  return columns.map((c) => {
    const width = (c.weight / sum) * total
    const out = { x, width: width - pad, column: c }
    x += width
    return out
  })
}

interface Placed {
  lines: { text: string; small: boolean }[]
  align: "left" | "right"
  x: number
  width: number
}

function place(
  pen: Pen,
  cols: ReturnType<typeof layout>,
  cells: readonly string[],
  bold: boolean
): { cells: Placed[]; height: number } {
  const placed = cols.map((col, i) => {
    const [first = "", ...rest] = (cells[i] ?? "").split("\n")
    const font = bold ? pen.fonts.bold : pen.fonts.regular
    const lines = [
      ...wrap(toWinAnsi(first), font, SIZE, col.width).map((text) => ({
        text,
        small: false,
      })),
      ...rest.flatMap((r) =>
        wrap(toWinAnsi(r), pen.fonts.regular, SMALL, col.width).map((text) => ({
          text,
          small: true,
        }))
      ),
    ]
    return { lines, align: col.column.align, x: col.x, width: col.width }
  })
  const height = placed.reduce(
    (max, p) =>
      Math.max(
        max,
        p.lines.reduce(
          (h, l) => h + (l.small ? SMALL : SIZE) * LEADING,
          0
        )
      ),
    SIZE * LEADING
  )
  return { cells: placed, height: height + 3 }
}

function drawCells(pen: Pen, placed: readonly Placed[], bold: boolean, muted: boolean) {
  for (const cell of placed) {
    let y = pen.y
    for (const line of cell.lines) {
      const size = line.small ? SMALL : SIZE
      const font = bold && !line.small ? pen.fonts.bold : pen.fonts.regular
      const text = fit(line.text, font, size, cell.width)
      const width = font.widthOfTextAtSize(text, size)
      pen.page.drawText(text, {
        x: cell.align === "right" ? cell.x + cell.width - width : cell.x,
        y: y - size,
        size,
        font,
        color: line.small || muted ? MUTED : INK,
      })
      y -= size * LEADING
    }
  }
}

function rule(pen: Pen, double = false) {
  const draw = (y: number) =>
    pen.page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4[0] - MARGIN, y },
      thickness: 0.5,
      color: double ? INK : RULE,
    })
  draw(pen.y - 1)
  if (double) draw(pen.y - 3.5)
}

function head(pen: Pen, cols: ReturnType<typeof layout>) {
  if (cols.every((c) => !c.column.head)) return
  const { cells, height } = place(
    pen,
    cols,
    cols.map((c) => c.column.head),
    false
  )
  pen.ensure(height + 8)
  drawCells(pen, cells, false, true)
  pen.y -= height
  rule(pen)
  pen.y -= 3
}

function table(pen: Pen, columns: readonly ReportColumn[], rows: readonly ReportRow[]) {
  const cols = layout(columns)
  head(pen, cols)
  for (const row of rows) {
    if (row.kind === "heading" || row.kind === "group") {
      const size = row.kind === "heading" ? 10 : SMALL + 1
      pen.y -= row.kind === "heading" ? 8 : 4
      pen.ensure(size * LEADING * 2)
      pen.page.drawText(toWinAnsi(row.text), {
        x: MARGIN,
        y: pen.y - size,
        size,
        font: row.kind === "heading" ? pen.fonts.bold : pen.fonts.regular,
        color: row.kind === "heading" ? INK : MUTED,
      })
      pen.y -= size * LEADING + 2
      continue
    }

    if (row.kind === "total") {
      /* The label spans the columns before the amounts. */
      const last = cols[row.from - 1]
      const spanned = [
        { ...cols[0], width: last.x + last.width - cols[0].x },
        ...cols.slice(row.from),
      ]
      const placed = place(pen, spanned, [row.label, ...row.cells], true)
      pen.ensure(placed.height + 6)
      pen.y -= 3
      rule(pen, row.double)
      pen.y -= row.double ? 4 : 2
      drawCells(pen, placed.cells, true, false)
      pen.y -= placed.height
      continue
    }

    const placed = place(pen, cols, row.cells, !!row.strong)
    if (pen.ensure(placed.height)) head(pen, cols)
    drawCells(pen, placed.cells, !!row.strong, !!row.muted)
    pen.y -= placed.height
    pen.page.drawLine({
      start: { x: MARGIN, y: pen.y + 1 },
      end: { x: A4[0] - MARGIN, y: pen.y + 1 },
      thickness: 0.25,
      color: RULE,
      dashArray: [2, 2],
    })
  }
  pen.y -= GAP
}

function block(pen: Pen, b: ReportBlock) {
  if (b.kind === "table") {
    table(pen, b.columns, b.rows)
    return
  }
  switch (b.style) {
    case "heading":
      pen.y -= 10
      pen.ensure(40)
      paragraph(pen, b.text, { size: 11, bold: true })
      pen.y -= 3
      break
    case "subheading":
      pen.y -= 6
      pen.ensure(30)
      paragraph(pen, b.text, { size: 9, bold: true })
      break
    case "note":
      pen.y -= 4
      paragraph(pen, b.text, { size: SMALL + 1, color: MUTED })
      break
    default:
      paragraph(pen, b.text)
  }
}

export async function renderReportPdf(doc: ReportDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(toWinAnsi(doc.title))
  pdf.setCreator("Kirjanpito")
  pdf.setCreationDate(new Date())
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }

  /* Each page carries the title and its number, so a loose sheet can be placed. */
  const pages: PDFPage[] = []
  const pen = new Pen(pdf, fonts, (page, number) => {
    pages.push(page)
    if (number > 1) {
      page.drawText(toWinAnsi(doc.title), {
        x: MARGIN,
        y: A4[1] - MARGIN + 14,
        size: SMALL,
        font: fonts.regular,
        color: MUTED,
      })
    }
  })

  paragraph(pen, doc.title, { size: 16, bold: true })
  pen.y -= 2
  for (const line of doc.header) paragraph(pen, line, { color: MUTED })
  pen.y -= 8
  for (const b of doc.blocks) block(pen, b)
  pen.y -= 10
  paragraph(pen, doc.footer, { size: SMALL + 1, color: MUTED })

  pages.forEach((page, i) => {
    const label = `${i + 1} / ${pages.length}`
    const size = SMALL
    page.drawText(label, {
      x: A4[0] - MARGIN - fonts.regular.widthOfTextAtSize(label, size),
      y: MARGIN - 16,
      size,
      font: fonts.regular,
      color: MUTED,
    })
  })
  return pdf.save()
}
