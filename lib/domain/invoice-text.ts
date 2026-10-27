/**
 * Reads an invoice's key figures out of its text layer.
 *
 * The input is the text of a PDF as `extractPdfText` lays it out: one line
 * per row of the page, with a tab where the row has a wide horizontal gap.
 * Everything here is a heuristic and every field may come back null; the
 * result only pre-fills the entry dialog, and the user checks it before
 * saving.
 */

import { RATES } from "@/lib/domain/accounts"
import { isoDate } from "@/lib/domain/dates"
import { parseAmount } from "@/lib/domain/money"
import type { Cents, Entry } from "@/lib/domain/types"

export interface InvoiceGuess {
  /** Invoice date, ISO. */
  date: string | null
  /** Due date, ISO. */
  dueDate: string | null
  /** The total including VAT, in cents. */
  amount: Cents | null
  vatRate: number | null
  /** The seller, as printed. */
  vendor: string | null
  invoiceNumber: string | null
  /** The descriptions of the invoice's rows, in order. */
  items: string[]
}

/* -------------------------------------------------------------------------
 * Text layout
 * ---------------------------------------------------------------------- */

/** A run of text on a PDF page, positioned in PDF units from bottom left. */
export interface TextRun {
  str: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * A pdf.js text content item as a `TextRun`, or nothing for a marked-content
 * item or a blank run. Typed loosely so this module stays free of pdf.js.
 */
export function toTextRun(item: object): TextRun[] {
  if (!("str" in item) || typeof item.str !== "string" || !item.str.trim()) {
    return []
  }
  const run = item as {
    str: string
    transform: number[]
    width: number
    height: number
  }
  return [
    {
      str: run.str,
      x: run.transform[4],
      y: run.transform[5],
      width: run.width,
      height: run.height || 10,
    },
  ]
}

/**
 * Text runs as lines, one per row of the page.
 *
 * pdf.js returns runs in no promised order. They are grouped into rows by
 * baseline and sorted left to right; a gap wider than two characters becomes
 * a tab, so the columns of a table stay apart for `parseInvoiceText`.
 */
export function layoutTextRuns(runs: readonly TextRun[]): string {
  const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: TextRun[][] = []
  for (const run of sorted) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(row[0].y - run.y) < row[0].height * 0.5) row.push(run)
    else rows.push([run])
  }
  return rows
    .map((row) => {
      row.sort((a, b) => a.x - b.x)
      let line = ""
      let end = -Infinity
      for (const run of row) {
        const charWidth = run.width / Math.max(1, run.str.length)
        const gap = run.x - end
        if (line)
          line += gap > charWidth * 2 ? "\t" : gap > charWidth * 0.2 ? " " : ""
        line += run.str
        end = run.x + run.width
      }
      return line
    })
    .join("\n")
}

/* -------------------------------------------------------------------------
 * Virtual barcode (virtuaaliviivakoodi)
 * ---------------------------------------------------------------------- */

/**
 * Amount and due date from a Finnish virtual barcode, versions 4 and 5.
 *
 * Both are 54 digits with the euros at 17–22, the cents at 23–24 and the
 * due date as YYMMDD at 48–53; a due date of 000000 means none. The format
 * is fixed by the banks, so when one is printed it beats every label below.
 */
export function parseVirtualBarcode(
  code: string
): { amount: Cents; dueDate: string | null } | null {
  if (!/^[45]\d{53}$/.test(code)) return null
  const amount = Number(code.slice(17, 23)) * 100 + Number(code.slice(23, 25))
  const due = code.slice(48, 54)
  const dueDate =
    due === "000000"
      ? null
      : isoDate(2000 + Number(due.slice(0, 2)), +due.slice(2, 4), +due.slice(4))
  return { amount, dueDate }
}

function findBarcode(lines: readonly string[]) {
  for (const line of lines) {
    // Printed in groups of five or six digits, so the spaces are dropped.
    const match = /(?<!\d)[45]\d{53}(?!\d)/.exec(line.replace(/\s+/g, ""))
    const parsed = match && parseVirtualBarcode(match[0])
    if (parsed && parsed.amount > 0) return parsed
  }
  return null
}

/* -------------------------------------------------------------------------
 * Amounts
 * ---------------------------------------------------------------------- */

/*
 * An amount with exactly two decimals, optionally grouped by spaces, dots
 * or commas.
 * The lookarounds keep "12.10" out of "12.10.2026".
 */
const AMOUNT_RE =
  /(?<![\d.,])-?(?:\d{1,3}(?:[  .,]\d{3})+|\d+)[.,]\d{2}(?![.,]?\d)/g

function amountsIn(line: string): Cents[] {
  return [...line.matchAll(AMOUNT_RE)]
    .map((m) => parseAmount(m[0]))
    .filter((c): c is Cents => c != null)
}

const TOTAL_LABEL =
  /(?<!\p{L})(yhteensä|maksettava|loppusumma|kokonaissumma|laskun summa|veloitettava|summa|total|amount due|balance due|to pay)(?!\p{L})/iu

/** Lines about net sums or the VAT itself, which also say "yhteensä". */
const NOT_GROSS =
  /veroton|ilman\s*alv|alv\s*0\s*%|netto|subtotal|välisumma|excl|before tax/i
const MENTIONS_VAT = /alv|vat|arvonlisävero|(?<!\p{L})vero(?!\p{L})|tax/iu
const INCLUDES_VAT = /sis\.?|sisältäen|incl|including|verollinen/i

/**
 * The largest amount on a line labelled as a total, skipping the net and VAT
 * subtotals. A label with no amount beside it takes the amount on the next
 * line, where a table puts it.
 */
function findTotal(lines: readonly string[]): Cents | null {
  let best: Cents | null = null
  lines.forEach((line, i) => {
    if (!TOTAL_LABEL.test(line) || NOT_GROSS.test(line)) return
    if (MENTIONS_VAT.test(line) && !INCLUDES_VAT.test(line)) return
    let found = amountsIn(line)
    if (!found.length && i + 1 < lines.length) found = amountsIn(lines[i + 1])
    for (const c of found) if (best == null || c > best) best = c
  })
  return best
}

/* -------------------------------------------------------------------------
 * VAT rate
 * ---------------------------------------------------------------------- */

/**
 * The VAT rate printed most often beside "ALV" or "VAT", among the rates the
 * app offers. An invoice with several rates still needs splitting by hand;
 * this gives the dominant one.
 */
function findVatRate(lines: readonly string[]): number | null {
  const counts = new Map<number, number>()
  for (const line of lines) {
    if (!MENTIONS_VAT.test(line)) continue
    for (const m of line.matchAll(/(?<![\d.,])(\d{1,2}(?:[.,]\d)?)\s*%/g)) {
      const rate = Number(m[1].replace(",", "."))
      if (RATES.includes(rate)) counts.set(rate, (counts.get(rate) ?? 0) + 1)
    }
  }
  let best: number | null = null
  let bestN = 0
  for (const [rate, n] of counts) {
    if (n > bestN || (n === bestN && best != null && rate > best)) {
      best = rate
      bestN = n
    }
  }
  return best
}

/* -------------------------------------------------------------------------
 * Dates
 * ---------------------------------------------------------------------- */

const DATE_RE =
  /(?<![\d.])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?![\d])|(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g

function datesIn(line: string): string[] {
  const out: string[] = []
  for (const m of line.matchAll(DATE_RE)) {
    const iso = m[4]
      ? isoDate(+m[4], +m[5], +m[6])
      : isoDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
    if (iso) out.push(iso)
  }
  return out
}

const DUE_LABEL = /eräpäivä|erääntyy|(?<!\p{L})due|maksettava viimeistään/iu
const OTHER_DATE_LABEL =
  /toimitus|delivery|jakso|period|tilaus|order|viivästys|alkaen|voimassa/i
const INVOICE_DATE_STRICT =
  /laskun\s*(?:pvm|päiväys|päivämäärä)|laskupäivä|laskutuspäivä|invoice\s*date|issue\s*date|date\s*of\s*issue/i
const INVOICE_DATE_LABEL = new RegExp(
  String.raw`${INVOICE_DATE_STRICT.source}|päiväys|päivämäärä|(?<!\p{L})pvm|(?<!\p{L})date`,
  "iu"
)

/**
 * The date that a label on line `i` points at: the first date after the
 * label and before the next label of another kind, so "Invoice date X  Due
 * date Y" gives X. A label with no date beside it is a table heading, and
 * the value is in the same column of the next line.
 */
function dateForLabel(
  lines: readonly string[],
  i: number,
  label: RegExp,
  stop: RegExp
): string | null {
  const line = lines[i]
  const m = label.exec(line)
  if (!m) return null
  let rest = line.slice(m.index + m[0].length)
  const s = stop.exec(rest)
  if (s) rest = rest.slice(0, s.index)
  const here = datesIn(rest)[0]
  if (here) return here

  const next = lines[i + 1]
  if (!next) return null
  const column = line.slice(0, m.index).split("	").length - 1
  const cells = next.split("	")
  if (cells.length === line.split("	").length) {
    const inColumn = datesIn(cells[column])[0]
    if (inColumn) return inColumn
  }
  return datesIn(next)[0] ?? null
}

const INVOICE_DATE_STOP = new RegExp(
  `${DUE_LABEL.source}|${OTHER_DATE_LABEL.source}`,
  "iu"
)
const DUE_DATE_STOP = new RegExp(
  `${INVOICE_DATE_STRICT.source}|${OTHER_DATE_LABEL.source}`,
  "i"
)

/**
 * The date beside the first invoice-date label, else the first date in the
 * text that is not on a due or delivery line.
 */
function findDate(lines: readonly string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const date = dateForLabel(lines, i, INVOICE_DATE_LABEL, INVOICE_DATE_STOP)
    if (date) return date
  }
  for (const line of lines) {
    if (DUE_LABEL.test(line) || OTHER_DATE_LABEL.test(line)) continue
    const here = datesIn(line)
    if (here.length) return here[0]
  }
  return null
}

function findDueDate(lines: readonly string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const date = dateForLabel(lines, i, DUE_LABEL, DUE_DATE_STOP)
    if (date) return date
  }
  return null
}

/* -------------------------------------------------------------------------
 * Vendor and invoice number
 * ---------------------------------------------------------------------- */

const COMPANY_SUFFIX =
  /(?<!\p{L})(oy|oyj|ab|ky|ay|tmi|ltd|limited|inc|gmbh|llc|aps)(?!\p{L})\.?/iu

/** The labels a seller prints beside its own business ID. */
const SELLER_ID =
  /y-tunnus|yritysnro|yritysnumero|business\s*id|alv-?numero|alv-?nro|vat\s*(?:no|number|reg)|org\.?\s*nr|organisationsnummer/i

/** Webmail domains, which name the mail provider rather than the seller. */
const MAIL_PROVIDERS =
  /^(gmail|outlook|hotmail|live|icloud|yahoo|luukku|kolumbus)$/i

/**
 * Company names on the page: each tab-separated cell up to and including its
 * company-form suffix, with any "Label:" prefix dropped. Cutting at the
 * suffix keeps "Svenska AB" out of "Svenska AB ALV-numero" when the two
 * runs sit too close to be split into cells.
 */
function companyNames(lines: readonly string[]) {
  const out: { name: string; line: number }[] = []
  lines.forEach((line, i) => {
    for (const cell of line.split("\t")) {
      const m = COMPANY_SUFFIX.exec(cell)
      if (!m) continue
      const name = cell
        .slice(0, m.index + m[0].length)
        .replace(/^.*:\s*/, "")
        .trim()
      if (name.length <= m[0].length || name.length > 60) continue
      if (/\d{4,}/.test(name) || /@|www\.|https?:/i.test(name)) continue
      out.push({ name, line: i })
    }
  })
  return out
}

/** "Staypro" from www.staypro.fi or info@staypro.fi. */
function nameFromDomain(lines: readonly string[]): string | null {
  for (const line of lines) {
    for (const m of line.matchAll(/(?:www\.|@)([a-z0-9-]+)\.[a-z]{2,}/gi)) {
      if (MAIL_PROVIDERS.test(m[1])) continue
      return m[1].charAt(0).toUpperCase() + m[1].slice(1)
    }
  }
  return null
}

/**
 * The seller's name. The best evidence is a company name within three lines
 * of a business-ID label, which is how sellers print their own details,
 * often only in the footer. Failing that, the first company name in the top
 * of the page, where the buyer's address block rarely comes first; then any
 * company name; then the name of the seller's web domain.
 */
function findVendor(lines: readonly string[]): string | null {
  const names = companyNames(lines)
  const nearId = names.find((n) =>
    lines
      .slice(Math.max(0, n.line - 3), n.line + 4)
      .some((l) => SELLER_ID.test(l))
  )
  return (
    nearId?.name ??
    names.find((n) => n.line < 20)?.name ??
    names[0]?.name ??
    nameFromDomain(lines)
  )
}

/* -------------------------------------------------------------------------
 * Line items
 * ---------------------------------------------------------------------- */

const ITEM_HEADING_DESCRIPTION =
  /(?<!\p{L})(kuvaus|tuote|nimike|selite|description|item|product)(?!\p{L})/iu
const ITEM_HEADING_AMOUNT =
  /(?<!\p{L})(summa|yhteensä|hinta|à-hinta|total|amount|price)(?!\p{L})/iu

/**
 * The descriptions of the invoice rows: the lines under a heading row that
 * names both a description and a price column, for as long as each carries
 * an amount and is not a total. From each row the cell with the most letters
 * is the description, with any trailing quantity or price that the layout
 * left in the same cell cut off.
 */
function findItems(lines: readonly string[]): string[] {
  const heading = lines.findIndex(
    (l) => ITEM_HEADING_DESCRIPTION.test(l) && ITEM_HEADING_AMOUNT.test(l)
  )
  if (heading < 0) return []
  const items: string[] = []
  for (const line of lines.slice(heading + 1, heading + 30)) {
    if (!amountsIn(line).length || TOTAL_LABEL.test(line)) break
    const letters = (s: string) => s.match(/\p{L}/gu)?.length ?? 0
    const cell = line
      .split("\t")
      .reduce((a, b) => (letters(b) > letters(a) ? b : a), "")
      .replace(/(?:\s+[-\d.,%€]+)+$/u, "")
      .trim()
    if (letters(cell) >= 3) items.push(cell)
  }
  return items
}

/* -------------------------------------------------------------------------
 * Description and category
 * ---------------------------------------------------------------------- */

const MAX_ITEM_LENGTH = 50

/**
 * Cut at a clause or word boundary, so a description never ends mid-word or
 * on a stray "…, 10". A comma in the second half wins over the last space.
 */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max + 1)
  const comma = cut.lastIndexOf(",")
  const space = cut.lastIndexOf(" ")
  const at = comma > max / 2 ? comma : space > max / 2 ? space : max
  return cut.slice(0, at).replace(/[\s,;:–-]+$/, "")
}

/**
 * A description in the ledger's own style, "Lasku 1005 – Seller – first
 * row": whichever of the three the invoice gave, joined by en dashes.
 * `invoiceLabel` turns the number into "Lasku 1005" in the UI language.
 */
export function describeInvoice(
  guess: InvoiceGuess,
  invoiceLabel: (number: string) => string
): string {
  return [
    guess.invoiceNumber ? invoiceLabel(guess.invoiceNumber) : null,
    guess.vendor,
    guess.items[0] ? shorten(guess.items[0], MAX_ITEM_LENGTH) : null,
  ]
    .filter(Boolean)
    .join(" – ")
}

/*
 * Words that point at an expense category, matched at the start of a word
 * in the seller's name and the row descriptions. Never in the whole text:
 * every invoice mentions a bank and penalty interest in its footer.
 */
const CATEGORY_HINTS: readonly (readonly [string, RegExp])[] = [
  [
    "344-vehicle",
    /(?<!\p{L})(polttoaine|bensiini|diesel|neste|st1|teboil|shell|abc|rengas|renkaa|katsastus|pysäköin|parking|autopesu|korjaamo|öljynvaihto)/iu,
  ],
  [
    "344-travel",
    /(?<!\p{L})(hotelli|hotel|majoitus|matkalippu|vr(?!\p{L})|finnair|juna|lento|flight|taksi|taxi|bussi)/iu,
  ],
  [
    "344-meeting",
    /(?<!\p{L})(lounas|ravintola|restaurant|kahvila|kokous|catering)/iu,
  ],
  ["343", /(?<!\p{L})(vuokra|rent)/iu],
  ["349", /(?<!\p{L})(palvelumaksu|pankkipalvelu|bank fee)/iu],
  ["336", /(?<!\p{L})(yel|eläkevakuutus|tyel)/iu],
  [
    "344-other",
    /(?<!\p{L})(puhelin|liittymä|elisa|telia|dna(?!\p{L})|internet|laajakaista|ohjelmisto|lisenssi|software|subscription|tilaus(maksu)?|vuosimaksu|kuukausimaksu|vakuutus|toimistotarvike|domain|hosting)/iu,
  ],
  [
    "334",
    /(?<!\p{L})(konsultointi|konsultti|kirjanpito|tilitoimisto|siivous|asennus|suunnittelu|palvelu)/iu,
  ],
]

/**
 * The default category an invoice most likely belongs to, by the words in
 * the seller's name and its rows. An invoice that matches nothing but lists
 * rows is goods bought, which is line 333. Null when there is nothing to go
 * on.
 */
export function suggestCategory(guess: InvoiceGuess): string | null {
  const text = [guess.vendor ?? "", ...guess.items].join("\n")
  for (const [catId, re] of CATEGORY_HINTS) if (re.test(text)) return catId
  return guess.items.length || guess.vendor ? "333" : null
}

const INVOICE_NO_RE =
  /(?:laskun\s*(?:numero|nro|n:o)|lasku\s*(?:nro|n:o|numero)|laskunumero|laskunro|invoice\s*(?:no\.?|number|nr|#))\s*[:.#]?\s*([A-Z0-9][A-Z0-9\-/]*)/i

function findInvoiceNumber(lines: readonly string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const m = INVOICE_NO_RE.exec(lines[i])
    if (m && /\d/.test(m[1])) return m[1]
    // A heading alone on its line, with the value under it.
    if (
      /^(laskun\s*(numero|nro)|laskunumero|invoice\s*(no\.?|number))\s*:?$/i.test(
        lines[i].trim()
      )
    ) {
      const next = lines[i + 1]?.trim().split(/\s|\t/)[0]
      if (next && /^[A-Z0-9][A-Z0-9\-/]*$/i.test(next) && /\d/.test(next)) {
        return next
      }
    }
  }
  return null
}

/* -------------------------------------------------------------------------
 * Parse
 * ---------------------------------------------------------------------- */

export function parseInvoiceText(text: string): InvoiceGuess {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[  ]+/g, " ").trim())
    .filter(Boolean)

  const barcode = findBarcode(lines)
  return {
    date: findDate(lines),
    dueDate: barcode?.dueDate ?? findDueDate(lines),
    amount: barcode?.amount ?? findTotal(lines),
    vatRate: findVatRate(lines),
    vendor: findVendor(lines),
    invoiceNumber: findInvoiceNumber(lines),
    items: findItems(lines),
  }
}

/** True when the guess found nothing worth pre-filling. */
export function isEmptyGuess(guess: InvoiceGuess): boolean {
  return (
    guess.date == null &&
    guess.amount == null &&
    guess.vatRate == null &&
    guess.vendor == null &&
    guess.invoiceNumber == null
  )
}

/**
 * The latest entry whose description names the vendor, so a second invoice
 * from the same seller takes the type and category the first one was booked
 * to.
 */
export function previousEntryFrom(
  entries: readonly Entry[],
  vendor: string | null
): Entry | undefined {
  if (!vendor) return undefined
  const needle = vendor.toLocaleLowerCase("fi")
  let found: Entry | undefined
  for (const e of entries) {
    if (!e.description.toLocaleLowerCase("fi").includes(needle)) continue
    if (!found || e.date > found.date) found = e
  }
  return found
}
