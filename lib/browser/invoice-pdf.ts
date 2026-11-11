import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"
import qrcode from "qrcode-generator"

import { code128C } from "@/lib/domain/code128"
import { daysBetween, formatDate } from "@/lib/domain/dates"
import { formatIban } from "@/lib/domain/iban"
import type {
  CustomerStatement,
  StatementOptions,
} from "@/lib/domain/customer-statement"
import type {
  BuyerRefs,
  Invoice,
  InvoiceLang,
  InvoiceLook,
  InvoiceRow,
  Party,
  Quote,
  Reminder,
  Seller,
} from "@/lib/domain/invoice"
import {
  docDiscountCents,
  invoiceTotals,
  rowNet,
} from "@/lib/domain/invoice-calc"
import { virtualBarcode } from "@/lib/domain/invoice-barcode"
import { epcPayload } from "@/lib/domain/invoice-epc"
import { formatReference } from "@/lib/domain/invoice-reference"
import {
  isReverseCharge,
  rowSaleKind,
  vatNotes,
} from "@/lib/domain/invoice-vat"
import {
  invoiceLabels,
  reminderLabels,
  statementLabels,
  type InvoiceLabels,
} from "@/lib/domain/invoice-labels"
import { toWinAnsi } from "@/lib/domain/memo-voucher"
import { formatMoneyPlain } from "@/lib/domain/money"

/**
 * Draw an issued invoice (§8.27) as an A4 PDF with a payment slip at the
 * bottom of the last page: payee, account, reference, due date, amount, the
 * EPC QR code and the virtual barcode. A credit note and a quote (§8.34) are
 * drawn the same way without the slip. The only module importing the QR
 * library, and always imported dynamically, like pdf-lib itself.
 */

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 40
const RIGHT = A4[0] - MARGIN
/** The room a header fact's value has right of the widest label. */
const FACT_WIDTH = 130
const INK = rgb(0.1, 0.1, 0.1)
const MUTED = rgb(0.42, 0.42, 0.42)
const RULE = rgb(0.8, 0.8, 0.8)
const BLACK = rgb(0, 0, 0)

/** The slip occupies the bottom of the last page, from the margin up to here. */
const SLIP_TOP = 250

interface Fonts {
  regular: PDFFont
  bold: PDFFont
}

type Color = ReturnType<typeof rgb>

interface Cursor {
  doc: PDFDocument
  page: PDFPage
  fonts: Fonts
  /** The top of the free space on the page. */
  y: number
  /** The look's accent, or null for the plain black and grey. */
  accent: Color | null
}

/** `#rrggbb` as a colour, or null when there is none. */
function accentColor(look: InvoiceLook): Color | null {
  const hex = look.accent
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const n = parseInt(hex.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/** A new document's first page, with the fonts embedded. */
async function startDocument(
  title: string,
  look: InvoiceLook
): Promise<Cursor> {
  const doc = await PDFDocument.create()
  doc.setTitle(toWinAnsi(title))
  doc.setCreator("Kirjanpito")
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  return {
    doc,
    page: doc.addPage(A4),
    fonts,
    y: A4[1] - MARGIN,
    accent: accentColor(look),
  }
}

/** The logo's box: no wider or taller than this, in points. */
const LOGO_BOX: [number, number] = [160, 50]

/**
 * The top left of the first page: the logo, if there is one, and under it the
 * seller's name and details. Returns where the block ends. A logo that cannot
 * be read is left out rather than failing the document.
 */
async function sellerHead(
  c: Cursor,
  seller: Seller,
  labels: InvoiceLabels,
  look: InvoiceLook
): Promise<number> {
  if (look.logo) {
    try {
      const image =
        look.logo.type === "image/png"
          ? await c.doc.embedPng(look.logo.data)
          : await c.doc.embedJpg(look.logo.data)
      const scale = Math.min(
        LOGO_BOX[0] / image.width,
        LOGO_BOX[1] / image.height,
        1
      )
      const width = image.width * scale
      const height = image.height * scale
      c.page.drawImage(image, { x: MARGIN, y: c.y - height, width, height })
      c.y -= height + 10
    } catch {
      // The rest of the document is still worth drawing.
    }
  }
  paragraph(c, seller.name, MARGIN, 260, { size: 14, bold: true })
  for (const line of partyLines(seller, seller.businessId, labels).slice(1)) {
    paragraph(c, line, MARGIN, 260, { size: 9, color: MUTED })
  }
  return c.y
}

/** The document's heading at the top right, in the accent colour when there is one. */
function heading(c: Cursor, text: string): void {
  put(c.page, c.fonts, text, RIGHT, c.y - 14, {
    size: 16,
    bold: true,
    align: "right",
    color: c.accent ?? INK,
  })
  c.y -= 26
}

/** The footer on every page, at most two lines under the bottom margin, and the bytes. */
async function finish(c: Cursor, look: InvoiceLook): Promise<Uint8Array> {
  const footer = look.footer?.trim()
  if (footer) {
    const lines = wrap(footer, c.fonts.regular, 7.5, RIGHT - MARGIN).slice(0, 2)
    for (const page of c.doc.getPages()) {
      lines.forEach((line, i) => {
        const width = c.fonts.regular.widthOfTextAtSize(line, 7.5)
        page.drawText(line, {
          x: (A4[0] - width) / 2,
          y: 24 - i * 9,
          size: 7.5,
          font: c.fonts.regular,
          color: MUTED,
        })
      })
    }
  }
  return c.doc.save()
}

interface TextOptions {
  size?: number
  bold?: boolean
  color?: Color
  align?: "left" | "right"
}

/** Draw one line with its left edge, or for `align: "right"` its right edge, at `x`. */
function put(
  page: PDFPage,
  fonts: Fonts,
  value: string,
  x: number,
  y: number,
  { size = 10, bold = false, color = INK, align = "left" }: TextOptions = {}
): void {
  const font = bold ? fonts.bold : fonts.regular
  const safe = toWinAnsi(value)
  const width = font.widthOfTextAtSize(safe, size)
  page.drawText(safe, {
    x: align === "right" ? x - width : x,
    y,
    size,
    font,
    color,
  })
}

/**
 * A header fact's value, right-aligned at the margin. The customer's own
 * references are free text, so a long one steps down a size to clear its
 * label.
 */
function putFact(page: PDFPage, fonts: Fonts, value: string, y: number): void {
  const wide = fonts.bold.widthOfTextAtSize(toWinAnsi(value), 10) > FACT_WIDTH
  put(page, fonts, value, RIGHT, y, {
    size: wide ? 8 : 10,
    bold: true,
    align: "right",
  })
}

/** The customer's "Your reference" and order number as header facts, those set (§8.27). */
function buyerRefFacts(
  refs: BuyerRefs,
  labels: InvoiceLabels
): [string, string][] {
  const out: [string, string][] = []
  if (refs.buyerReference)
    out.push([labels.buyerReference, refs.buyerReference])
  if (refs.orderNumber) out.push([labels.orderNumber, refs.orderNumber])
  return out
}

/** Break a text into lines no wider than `width`. */
function wrap(
  value: string,
  font: PDFFont,
  size: number,
  width: number
): string[] {
  const lines: string[] = []
  for (const paragraph of toWinAnsi(value).split(/\r?\n/)) {
    let line = ""
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

/** Draw wrapped text from the cursor down and move the cursor below it. */
function paragraph(
  c: Cursor,
  value: string,
  x: number,
  width: number,
  options: TextOptions = {}
): void {
  const size = options.size ?? 10
  const font = options.bold ? c.fonts.bold : c.fonts.regular
  for (const line of wrap(value, font, size, width)) {
    put(c.page, c.fonts, line, x, c.y - size, options)
    c.y -= size * 1.35
  }
}

function rule(c: Cursor): void {
  c.page.drawLine({
    start: { x: MARGIN, y: c.y - 2 },
    end: { x: RIGHT, y: c.y - 2 },
    thickness: c.accent ? 0.75 : 0.5,
    color: c.accent ?? RULE,
  })
  c.y -= 8
}

/** A new page when fewer than `needed` points are left above the slip area. */
function ensure(c: Cursor, needed: number, reserve: number): void {
  if (c.y - needed >= reserve) return
  c.page = c.doc.addPage(A4)
  c.y = A4[1] - MARGIN
}

/** 1500 thousandths as "1,5". */
function quantity(milli: number): string {
  return (milli / 1000).toLocaleString("fi-FI", { maximumFractionDigits: 3 })
}

function percent(rate: number): string {
  return rate.toLocaleString("fi-FI", { maximumFractionDigits: 2 })
}

function partyLines(
  p: {
    name: string
    street: string
    postcode: string
    city: string
    country: string
    vatId: string
    email: string
  },
  businessId: string | null,
  labels: InvoiceLabels
): string[] {
  return [
    p.name,
    p.street,
    [p.postcode, p.city].filter(Boolean).join(" "),
    p.country !== "FI" ? p.country : "",
    businessId ? `${labels.businessId} ${businessId}` : "",
    p.vatId ? `${labels.vatId} ${p.vatId}` : "",
    p.email,
  ].filter((line) => line !== "")
}

function drawModules(
  page: PDFPage,
  rows: boolean[][],
  x: number,
  top: number,
  cell: number
): void {
  rows.forEach((row, r) => {
    row.forEach((dark, col) => {
      if (!dark) return
      page.drawRectangle({
        x: x + col * cell,
        y: top - (r + 1) * cell,
        width: cell + 0.05,
        height: cell + 0.05,
        color: BLACK,
      })
    })
  })
}

function qrRows(payload: string): boolean[][] {
  const qr = qrcode(0, "M")
  qr.addData(payload, "Byte")
  qr.make()
  const size = qr.getModuleCount()
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, col) => qr.isDark(r, col))
  )
}

/** The payment slip, drawn in the bottom area of the page the cursor is on. */
function drawSlip(
  c: Cursor,
  invoice: Pick<
    Invoice,
    "seller" | "rows" | "dueDate" | "reference" | "language" | "discount"
  >,
  labels: InvoiceLabels,
  pay?: { cents: number; dueDate: string }
): void {
  const { page, fonts } = c
  const seller = invoice.seller!
  const totals = {
    gross: pay?.cents ?? invoiceTotals(invoice.rows, invoice.discount).gross,
  }
  const dueDate = pay?.dueDate ?? invoice.dueDate
  const reference = invoice.reference!
  const left = MARGIN
  let y = SLIP_TOP

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 0.8,
    color: INK,
  })
  y -= 16
  put(page, fonts, labels.payee, left, y, { size: 8, color: MUTED })
  put(page, fonts, seller.name, left + 90, y, { bold: true })
  y -= 15
  put(page, fonts, labels.payeeAccount, left, y, { size: 8, color: MUTED })
  put(page, fonts, formatIban(seller.iban), left + 90, y, { bold: true })
  y -= 15
  put(page, fonts, labels.reference, left, y, { size: 8, color: MUTED })
  put(page, fonts, formatReference(reference), left + 90, y, { bold: true })
  y -= 15
  put(page, fonts, labels.due, left, y, { size: 8, color: MUTED })
  put(page, fonts, formatDate(dueDate, invoice.language), left + 90, y, {
    bold: true,
  })
  y -= 15
  put(page, fonts, labels.toPay, left, y, { size: 8, color: MUTED })
  put(page, fonts, formatMoneyPlain(totals.gross), left + 90, y, {
    bold: true,
    size: 12,
  })

  const epc = epcPayload({
    name: seller.name,
    iban: seller.iban,
    cents: totals.gross,
    message: `${labels.reference} ${reference}`,
  })
  if (epc) {
    const rows = qrRows(epc)
    const cell = 84 / (rows.length + 8)
    const size = cell * (rows.length + 8)
    drawModules(
      page,
      rows,
      RIGHT - size + cell * 4,
      SLIP_TOP - 8 - cell * 4,
      cell
    )
  }

  const code = virtualBarcode({
    iban: seller.iban,
    cents: totals.gross,
    reference,
    dueDate,
  })
  const bars = code ? code128C(code) : null
  if (code && bars) {
    const cell = 1.2
    const width = bars.length * cell
    const x = MARGIN + (RIGHT - MARGIN - width) / 2
    const top = SLIP_TOP - 112
    bars.forEach((dark, i) => {
      if (!dark) return
      page.drawRectangle({
        x: x + i * cell,
        y: top - 42,
        width: cell + 0.05,
        height: 42,
        color: BLACK,
      })
    })
    put(page, fonts, code, x, top - 54, { size: 8, color: MUTED })
  }
}

/**
 * `creditedNumber` is the number of the invoice a credit note credits, printed
 * under the credit note's own facts. A credit note has no due date, reference
 * or payment slip, since nothing is paid on it.
 */
export async function renderInvoicePdf(
  invoice: Invoice,
  creditedNumber: number | null = null,
  look: InvoiceLook = {}
): Promise<Uint8Array> {
  if (!invoice.seller || invoice.number === null || !invoice.reference) {
    throw new Error("only an issued invoice can be drawn")
  }
  return drawSale(
    { ...invoice, seller: invoice.seller, number: invoice.number },
    invoice.credits !== null
      ? { kind: "credit", creditedNumber }
      : { kind: "invoice", reference: invoice.reference },
    look
  )
}

/**
 * A quote (§8.34) with the seller as the settings describe it now. It carries
 * the rows, the VAT and the last valid day, and no payment details.
 */
export async function renderQuotePdf(
  quote: Quote,
  seller: Seller,
  look: InvoiceLook = {}
): Promise<Uint8Array> {
  return drawSale(
    {
      ...quote,
      seller,
      dueDate: quote.validUntil,
      supplyFrom: null,
      supplyTo: null,
      terms: "",
      issuedAt: null,
    },
    { kind: "quote" },
    look
  )
}

/** What is being drawn: each kind has its own heading, facts and ending. */
type SaleKind =
  | { kind: "invoice"; reference: string }
  | { kind: "credit"; creditedNumber: number | null }
  | { kind: "quote" }

/** The fields of a sale document the drawing reads. */
type SaleDocument = Pick<
  Invoice,
  | "date"
  | "dueDate"
  | "supplyFrom"
  | "supplyTo"
  | "customer"
  | "language"
  | "rows"
  | "note"
  | "terms"
  | "issuedAt"
  | "buyerReference"
  | "orderNumber"
  | "discount"
> & { seller: Seller; number: number }

async function drawSale(
  invoice: SaleDocument,
  sale: SaleKind,
  look: InvoiceLook
): Promise<Uint8Array> {
  const labels = invoiceLabels(invoice.language)
  const lang = invoice.language
  const credit = sale.kind === "credit"
  const quote = sale.kind === "quote"
  const c = await startDocument(
    quote
      ? labels.quoteTitle(invoice.number)
      : labels.title(invoice.number, credit),
    look
  )
  const { doc, fonts } = c
  doc.setCreationDate(new Date(invoice.issuedAt ?? Date.now()))
  const { seller } = invoice
  const registered = seller.vatRegistered
  // On reverse charge the buyer reports the VAT: neither rate nor amount is shown.
  const reverse = (row: InvoiceRow) => isReverseCharge(rowSaleKind(row.catId))

  /* Header: the seller on the left, the invoice's facts on the right. */
  const top = c.y
  const sellerBottom = await sellerHead(c, seller, labels, look)
  c.y = top
  const facts: [string, string][] = quote
    ? [
        [labels.quoteNumber, String(invoice.number)],
        [labels.quoteDate, formatDate(invoice.date, lang)],
        [labels.validUntil, formatDate(invoice.dueDate, lang)],
      ]
    : [
        [labels.number, String(invoice.number)],
        [labels.date, formatDate(invoice.date, lang)],
      ]
  if (sale.kind === "credit") {
    if (sale.creditedNumber !== null)
      facts.push([labels.credits, String(sale.creditedNumber)])
  } else if (sale.kind === "invoice") {
    facts.push(
      [labels.due, formatDate(invoice.dueDate, lang)],
      [labels.reference, formatReference(sale.reference)]
    )
  }
  if (invoice.supplyFrom) {
    const from = formatDate(invoice.supplyFrom, lang)
    const to = invoice.supplyTo ? formatDate(invoice.supplyTo, lang) : null
    facts.push([labels.supply, to && to !== from ? `${from} - ${to}` : from])
  }
  facts.push(...buyerRefFacts(invoice, labels))
  heading(c, quote ? labels.quote : credit ? labels.creditNote : labels.invoice)
  for (const [label, value] of facts) {
    put(c.page, fonts, label, 330, c.y - 9, { size: 8, color: MUTED })
    putFact(c.page, fonts, value, c.y - 9)
    c.y -= 14
  }
  c.y = Math.min(c.y, sellerBottom) - 14

  /* The buyer. */
  paragraph(c, labels.buyer, MARGIN, 260, { size: 8, color: MUTED })
  const buyer = invoice.customer
  paragraph(c, buyer.name, MARGIN, 260, { bold: true })
  for (const line of partyLines(buyer, null, labels).slice(1)) {
    paragraph(c, line, MARGIN, 260, { size: 9 })
  }
  c.y -= 14

  /*
   * The rows. The last page keeps the slip's room clear. A discount column
   * appears only when a row has a discount, and narrows the description.
   */
  const discounted = invoice.rows.some((row) => row.discount !== undefined)
  const columns = discounted
    ? {
        description: MARGIN,
        quantity: 265,
        unitPrice: 345,
        discount: 390,
        vat: 440,
        amount: RIGHT,
      }
    : {
        description: MARGIN,
        quantity: 300,
        unitPrice: 395,
        discount: 0,
        vat: 440,
        amount: RIGHT,
      }
  const descriptionWidth = discounted ? 210 : 250
  const header = () => {
    put(c.page, fonts, labels.description, columns.description, c.y - 8, {
      size: 8,
      color: MUTED,
    })
    put(c.page, fonts, labels.quantity, columns.quantity, c.y - 8, {
      size: 8,
      color: MUTED,
      align: "right",
    })
    put(
      c.page,
      fonts,
      registered ? labels.unitPrice : labels.unitPricePlain,
      columns.unitPrice,
      c.y - 8,
      {
        size: 8,
        color: MUTED,
        align: "right",
      }
    )
    if (discounted)
      put(c.page, fonts, labels.discountRate, columns.discount, c.y - 8, {
        size: 8,
        color: MUTED,
        align: "right",
      })
    if (registered)
      put(c.page, fonts, labels.vatRate, columns.vat, c.y - 8, {
        size: 8,
        color: MUTED,
        align: "right",
      })
    put(
      c.page,
      fonts,
      registered ? labels.amount : labels.amountPlain,
      columns.amount,
      c.y - 8,
      { size: 8, color: MUTED, align: "right" }
    )
    c.y -= 12
    rule(c)
  }
  header()
  for (const row of invoice.rows) {
    const lines = wrap(row.description, fonts.regular, 10, descriptionWidth)
    const height = lines.length * 13.5 + 4
    if (c.y - height < MARGIN) {
      c.page = doc.addPage(A4)
      c.y = A4[1] - MARGIN
      header()
    }
    const base = c.y - 10
    lines.forEach((line, i) =>
      put(c.page, fonts, line, columns.description, base - i * 13.5)
    )
    const unit = row.unit ? ` ${row.unit}` : ""
    put(
      c.page,
      fonts,
      `${quantity(row.quantityMilli)}${unit}`,
      columns.quantity,
      base,
      { align: "right" }
    )
    put(
      c.page,
      fonts,
      formatMoneyPlain(row.unitCents),
      columns.unitPrice,
      base,
      { align: "right" }
    )
    if (discounted && row.discount !== undefined)
      put(c.page, fonts, percent(row.discount), columns.discount, base, {
        align: "right",
      })
    if (registered)
      put(
        c.page,
        fonts,
        reverse(row) ? "–" : percent(row.vatRate),
        columns.vat,
        base,
        { align: "right" }
      )
    put(c.page, fonts, formatMoneyPlain(rowNet(row)), columns.amount, base, {
      align: "right",
    })
    c.y -= height
  }
  rule(c)

  /*
   * The totals, with the VAT shown per rate. Reverse-charge rows count in the
   * totals but have no rate line, and a seller outside the VAT register shows
   * the total alone.
   */
  const totals = invoiceTotals(invoice.rows, invoice.discount)
  const charged = invoice.rows.filter((row) => !reverse(row))
  const rates = registered ? invoiceTotals(charged, invoice.discount).rates : []
  const showVat = registered && charged.length > 0
  const totalsHeight = (rates.length + 5) * 14 + 30
  ensure(c, totalsHeight, MARGIN)
  /* The rows print their amounts before the document's discount, which takes its own line. */
  if (invoice.discount !== undefined) {
    put(
      c.page,
      fonts,
      labels.docDiscount(percent(invoice.discount)),
      330,
      c.y - 9,
      { size: 9, color: MUTED }
    )
    put(
      c.page,
      fonts,
      formatMoneyPlain(-docDiscountCents(invoice.rows, invoice.discount)),
      RIGHT,
      c.y - 9,
      { size: 9, align: "right" }
    )
    c.y -= 15
  }
  for (const line of rates) {
    put(
      c.page,
      fonts,
      `${labels.vatBase} ${percent(line.vatRate)} %`,
      330,
      c.y - 9,
      { size: 9, color: MUTED }
    )
    put(c.page, fonts, formatMoneyPlain(line.net), 470, c.y - 9, {
      size: 9,
      align: "right",
    })
    put(
      c.page,
      fonts,
      `${labels.vatAmount} ${percent(line.vatRate)} %`,
      480,
      c.y - 9,
      { size: 9, color: MUTED }
    )
    put(c.page, fonts, formatMoneyPlain(line.vat), RIGHT, c.y - 9, {
      size: 9,
      align: "right",
    })
    c.y -= 13
  }
  c.y -= 4
  if (registered) {
    put(c.page, fonts, labels.netTotal, 330, c.y - 9, { size: 9 })
    put(c.page, fonts, formatMoneyPlain(totals.net), RIGHT, c.y - 9, {
      size: 9,
      align: "right",
    })
    c.y -= 13
  }
  if (showVat) {
    put(c.page, fonts, labels.vatTotal, 330, c.y - 9, { size: 9 })
    put(c.page, fonts, formatMoneyPlain(totals.vat), RIGHT, c.y - 9, {
      size: 9,
      align: "right",
    })
    c.y -= 13
  }
  c.y -= 3
  put(c.page, fonts, quote ? labels.quoteTotal : labels.total, 330, c.y - 11, {
    size: 12,
    bold: true,
  })
  put(c.page, fonts, formatMoneyPlain(totals.gross), RIGHT, c.y - 11, {
    size: 12,
    bold: true,
    align: "right",
  })
  c.y -= 26

  /* Notes and terms. */
  const notes = [
    ...vatNotes(invoice.rows, registered).map((note) => labels.vatNote[note]),
    invoice.note,
    invoice.terms,
    quote
      ? labels.quoteValid(formatDate(invoice.dueDate, lang))
      : credit
        ? ""
        : labels.lateInterest,
  ].filter((n) => n.trim() !== "")
  for (const note of notes) {
    ensure(c, 30, MARGIN)
    paragraph(c, note, MARGIN, RIGHT - MARGIN, { size: 9, color: MUTED })
    c.y -= 4
  }

  if (sale.kind === "invoice") {
    /* The slip needs the bottom of a page; add one when the text has run into it. */
    if (c.y < SLIP_TOP + 12) {
      c.page = doc.addPage(A4)
      c.y = A4[1] - MARGIN
    }
    drawSlip(c, { ...invoice, reference: sale.reference }, labels)
  }
  return finish(c, look)
}

/**
 * A payment reminder for an issued invoice (§8.27): the seller and buyer as
 * on the invoice, the open balance, interest and fee, and a payment slip for
 * the total with the new due date.
 */
export async function renderReminderPdf(
  invoice: Invoice,
  reminder: Reminder,
  look: InvoiceLook = {}
): Promise<Uint8Array> {
  if (!invoice.seller || invoice.number === null || !invoice.reference) {
    throw new Error("only an issued invoice can be reminded")
  }
  const labels = invoiceLabels(invoice.language)
  const words = reminderLabels(invoice.language)
  const lang = invoice.language
  const c = await startDocument(words.title, look)
  const { fonts } = c
  const { seller } = invoice

  const top = c.y
  const sellerBottom = await sellerHead(c, seller, labels, look)
  c.y = top
  heading(c, words.title)
  const facts: [string, string][] = [
    [labels.number, String(invoice.number)],
    [labels.date, formatDate(reminder.date, lang)],
    [labels.reference, formatReference(invoice.reference)],
    ...buyerRefFacts(invoice, labels),
  ]
  for (const [label, value] of facts) {
    put(c.page, fonts, label, 330, c.y - 9, { size: 8, color: MUTED })
    putFact(c.page, fonts, value, c.y - 9)
    c.y -= 14
  }
  c.y = Math.min(c.y, sellerBottom) - 14

  paragraph(c, labels.buyer, MARGIN, 260, { size: 8, color: MUTED })
  paragraph(c, invoice.customer.name, MARGIN, 260, { bold: true })
  for (const line of partyLines(invoice.customer, null, labels).slice(1)) {
    paragraph(c, line, MARGIN, 260, { size: 9 })
  }
  c.y -= 18

  paragraph(
    c,
    words.intro(invoice.number, formatDate(invoice.dueDate, lang)),
    MARGIN,
    RIGHT - MARGIN
  )
  c.y -= 12

  const days = Math.max(0, daysBetween(invoice.dueDate, reminder.date))
  const lines: [string, number][] = [
    [words.openBalance, reminder.open],
    [
      words.interest(String(reminder.rate).replace(".", ","), days),
      reminder.interest,
    ],
    [words.fee, reminder.fee],
  ]
  for (const [label, cents] of lines) {
    put(c.page, fonts, label, MARGIN, c.y - 10, { size: 10 })
    put(c.page, fonts, formatMoneyPlain(cents), RIGHT, c.y - 10, {
      align: "right",
    })
    c.y -= 15
  }
  rule(c)
  const total = reminder.open + reminder.interest + reminder.fee
  put(c.page, fonts, words.total, MARGIN, c.y - 12, { size: 12, bold: true })
  put(c.page, fonts, formatMoneyPlain(total), RIGHT, c.y - 12, {
    size: 12,
    bold: true,
    align: "right",
  })
  c.y -= 22
  put(c.page, fonts, words.newDue, MARGIN, c.y - 10, { size: 10 })
  put(c.page, fonts, formatDate(reminder.newDueDate, lang), RIGHT, c.y - 10, {
    bold: true,
    align: "right",
  })
  c.y -= 26
  paragraph(c, words.closing, MARGIN, RIGHT - MARGIN, {
    size: 9,
    color: MUTED,
  })

  drawSlip(c, invoice, labels, { cents: total, dueDate: reminder.newDueDate })
  return finish(c, look)
}

/**
 * A customer statement (§8.29): the seller, the customer, what the statement
 * covers and one line per invoice or credit note, with the open total and how
 * to pay it. It has no payment slip, since each invoice keeps its own
 * reference.
 */
export async function renderStatementPdf(
  statement: CustomerStatement,
  customer: Party,
  seller: Seller,
  lang: InvoiceLang,
  options: StatementOptions,
  look: InvoiceLook = {}
): Promise<Uint8Array> {
  const labels = invoiceLabels(lang)
  const words = statementLabels(lang)
  const c = await startDocument(words.title, look)
  const { doc, fonts } = c

  const top = c.y
  const sellerBottom = await sellerHead(c, seller, labels, look)
  c.y = top
  heading(c, words.title)
  put(c.page, fonts, words.date, 330, c.y - 9, { size: 8, color: MUTED })
  putFact(c.page, fonts, formatDate(options.today, lang), c.y - 9)
  c.y -= 14
  c.y = Math.min(c.y, sellerBottom) - 14

  paragraph(c, labels.buyer, MARGIN, 260, { size: 8, color: MUTED })
  paragraph(c, customer.name, MARGIN, 260, { bold: true })
  for (const line of partyLines(customer, null, labels).slice(1)) {
    paragraph(c, line, MARGIN, 260, { size: 9 })
  }
  c.y -= 14
  const date = (iso: string | null) => (iso ? formatDate(iso, lang) : null)
  paragraph(
    c,
    options.includePaid
      ? words.periodScope(date(options.from), date(options.to))
      : words.openScope(formatDate(options.today, lang)),
    MARGIN,
    RIGHT - MARGIN,
    { bold: true }
  )
  c.y -= 8

  const columns = {
    invoice: MARGIN,
    date: 130,
    due: 205,
    total: 380,
    paid: 455,
    open: RIGHT,
  }
  const header = () => {
    const head = { size: 8, color: MUTED }
    const right = { ...head, align: "right" as const }
    put(c.page, fonts, words.invoice, columns.invoice, c.y - 8, head)
    put(c.page, fonts, words.invoiceDate, columns.date, c.y - 8, head)
    put(c.page, fonts, words.dueDate, columns.due, c.y - 8, head)
    put(c.page, fonts, words.total, columns.total, c.y - 8, right)
    put(c.page, fonts, words.paid, columns.paid, c.y - 8, right)
    put(c.page, fonts, words.open, columns.open, c.y - 8, right)
    c.y -= 12
    rule(c)
  }
  header()
  if (statement.lines.length === 0) {
    paragraph(c, words.none, MARGIN, RIGHT - MARGIN, { color: MUTED })
  }
  for (const line of statement.lines) {
    if (c.y - 16 < MARGIN) {
      c.page = doc.addPage(A4)
      c.y = A4[1] - MARGIN
      header()
    }
    const base = c.y - 10
    put(
      c.page,
      fonts,
      line.credit
        ? `${line.number} (${words.creditNote})`
        : String(line.number),
      columns.invoice,
      base
    )
    put(c.page, fonts, formatDate(line.date, lang), columns.date, base)
    if (line.dueDate !== null) {
      put(c.page, fonts, formatDate(line.dueDate, lang), columns.due, base)
      if (line.overdueDays > 0)
        put(c.page, fonts, words.overdueDays(line.overdueDays), 265, base, {
          size: 8,
          color: MUTED,
        })
    }
    put(c.page, fonts, formatMoneyPlain(line.total), columns.total, base, {
      align: "right",
    })
    put(c.page, fonts, formatMoneyPlain(line.paid), columns.paid, base, {
      align: "right",
    })
    put(c.page, fonts, formatMoneyPlain(line.open), columns.open, base, {
      align: "right",
      bold: line.overdueDays > 0,
    })
    c.y -= 16
  }
  rule(c)

  ensure(c, 80, MARGIN)
  put(c.page, fonts, words.openTotal, 330, c.y - 12, { size: 12, bold: true })
  put(c.page, fonts, formatMoneyPlain(statement.open), RIGHT, c.y - 12, {
    size: 12,
    bold: true,
    align: "right",
  })
  c.y -= 20
  if (statement.overdue !== 0) {
    put(c.page, fonts, words.overdueTotal, 330, c.y - 9, { size: 9 })
    put(c.page, fonts, formatMoneyPlain(statement.overdue), RIGHT, c.y - 9, {
      size: 9,
      align: "right",
    })
    c.y -= 15
  }
  c.y -= 10
  if (statement.open > 0 && seller.iban) {
    paragraph(
      c,
      words.howToPay(formatIban(seller.iban)),
      MARGIN,
      RIGHT - MARGIN,
      { size: 9, color: MUTED }
    )
  }
  return finish(c, look)
}
