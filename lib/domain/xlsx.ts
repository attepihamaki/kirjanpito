/**
 * A minimal Office Open XML spreadsheet writer (§7.10): the parts of an
 * `.xlsx` as text, for `packFiles` to put in a ZIP. Strings are written inline,
 * so there is no shared-string table, and a formula carries the value it had
 * when written, so a viewer that does not recalculate still shows it. Pure, so
 * the parts can be tested as text.
 */

/** A cell's content. A number is shown with `format`, a formula with its cached value. */
export type Cell =
  | null
  | string
  | { n: number; format?: CellFormat; bold?: boolean }
  | { f: string; v: number; format?: CellFormat; bold?: boolean }
  | { s: string; bold: true }

/** The number formats the writer knows, each one style in `styles.xml`. */
export type CellFormat = "money" | "date" | "rate"

export interface Sheet {
  /** Up to 31 characters, none of `[]:*?/\`. */
  name: string
  rows: Cell[][]
  /** Column widths in characters, left to right. */
  widths?: number[]
  /** Keep the first row in view while scrolling. */
  freezeHeader?: boolean
}

/** The style index of each format, bold or not, in the order `styles.xml` lists them. */
const STYLE: Record<CellFormat | "text", [number, number]> = {
  text: [0, 1],
  money: [2, 3],
  date: [4, 5],
  rate: [6, 7],
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="14" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
`

/** Text safe inside an XML element or attribute; characters XML 1.0 cannot hold are dropped. */
export function xmlText(value: string): string {
  return value
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** The column letters of a zero-based index: 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  let name = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

/** The serial day number spreadsheets store an ISO date as (1900 date system). */
export function excelDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5)
}

/** A sheet name as a formula refers to it, quoted with any `'` doubled. */
export function sheetRef(name: string): string {
  return `'${name.replace(/'/g, "''")}'`
}

function cellXml(cell: Cell, ref: string): string {
  if (cell === null) return ""
  if (typeof cell === "string") {
    if (cell === "") return ""
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlText(cell)}</t></is></c>`
  }
  if ("s" in cell) {
    return `<c r="${ref}" s="${STYLE.text[1]}" t="inlineStr"><is><t xml:space="preserve">${xmlText(cell.s)}</t></is></c>`
  }
  const style = STYLE[cell.format ?? "text"][cell.bold ? 1 : 0]
  const s = style ? ` s="${style}"` : ""
  if ("f" in cell) {
    return `<c r="${ref}"${s}><f>${xmlText(cell.f)}</f><v>${cell.v}</v></c>`
  }
  return `<c r="${ref}"${s}><v>${cell.n}</v></c>`
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths
        .map(
          (w, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`
        )
        .join("")}</cols>`
    : ""
  const views = sheet.freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : ""
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => cellXml(cell, `${columnName(c)}${r + 1}`))
        .join("")
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join("")
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${views}${cols}<sheetData>${rows}</sheetData></worksheet>
`
}

/** Every part of the workbook, path and text, in the order they go into the ZIP. */
export function workbookParts(
  sheets: readonly Sheet[]
): { path: string; text: string }[] {
  if (sheets.length === 0) throw new Error("a workbook needs a sheet")
  const names = new Set<string>()
  for (const sheet of sheets) {
    if (!/^[^[\]:*?/\\]{1,31}$/.test(sheet.name))
      throw new Error(`bad sheet name: ${sheet.name}`)
    const key = sheet.name.toLowerCase()
    if (names.has(key)) throw new Error(`repeated sheet name: ${sheet.name}`)
    names.add(key)
  }
  const overrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")
  return [
    {
      path: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>
`,
    },
    {
      path: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>
`,
    },
    {
      path: "xl/workbook.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map(
          (s, i) =>
            `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
        )
        .join("")}</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>
`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join(
          ""
        )}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>
`,
    },
    { path: "xl/styles.xml", text: STYLES_XML },
    ...sheets.map((sheet, i) => ({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      text: sheetXml(sheet),
    })),
  ]
}
