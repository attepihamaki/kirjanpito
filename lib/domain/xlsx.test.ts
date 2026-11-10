// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { ledgerWorkbook, workbookFileName } from "@/lib/domain/ledger-workbook"
import { indexCategories, type Entry } from "@/lib/domain/types"
import {
  columnName,
  excelDate,
  sheetRef,
  workbookParts,
  xmlText,
  type Sheet,
} from "@/lib/domain/xlsx"

const cats = indexCategories(defaultCategories())

const entry = (over: Partial<Entry>): Entry => ({
  id: "e",
  date: "2026-03-05",
  description: "Lasku 1001",
  type: "income",
  catId: "300-domestic",
  amount: 125_500,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

describe("xlsx writer (§7.10)", () => {
  it("names columns and dates the way spreadsheets do", () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual([
      "A",
      "Z",
      "AA",
      "ZZ",
      "AAA",
    ])
    expect(excelDate("1900-03-01")).toBe(61)
    expect(excelDate("2026-01-01")).toBe(46023)
  })

  it("escapes text and drops characters XML cannot hold", () => {
    expect(xmlText(`a<b>&"c"\u0001`)).toBe("a&lt;b&gt;&amp;&quot;c&quot;")
    expect(sheetRef("Kevät's")).toBe("'Kevät''s'")
  })

  it("writes every part an .xlsx needs", () => {
    const sheet: Sheet = {
      name: "Taulu",
      rows: [
        ["Nimi", { n: 1.5, format: "money" }],
        [null, { f: "SUM(B1:B1)", v: 1.5, bold: true, format: "money" }],
      ],
    }
    const parts = workbookParts([sheet])
    expect(parts.map((p) => p.path)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ])
    const xml = parts.at(-1)!.text
    expect(xml).toContain(
      '<c r="A1" t="inlineStr"><is><t xml:space="preserve">Nimi</t></is></c>'
    )
    expect(xml).toContain('<c r="B1" s="2"><v>1.5</v></c>')
    expect(xml).toContain('<c r="B2" s="3"><f>SUM(B1:B1)</f><v>1.5</v></c>')
    for (const part of parts) {
      const doc = new DOMParser().parseFromString(part.text, "application/xml")
      expect(doc.getElementsByTagName("parsererror")).toHaveLength(0)
    }
  })

  it("refuses sheet names a spreadsheet would refuse", () => {
    expect(() => workbookParts([{ name: "a/b", rows: [] }])).toThrow()
    expect(() =>
      workbookParts([
        { name: "Sama", rows: [] },
        { name: "sama", rows: [] },
      ])
    ).toThrow()
  })
})

describe("the year's ledger as a workbook (§7.10)", () => {
  const entries: Entry[] = [
    entry({ id: "a", voucher: 1 }),
    entry({
      id: "b",
      voucher: 2,
      date: "2026-03-20",
      description: "Tarvikkeet",
      type: "expense",
      catId: "333",
      amount: 12_550,
      paidOn: null,
    }),
    entry({
      id: "c",
      voucher: 3,
      date: "2026-03-28",
      description: "Oma nosto",
      type: "expense",
      catId: "owner-withdrawal",
      amount: 50_000,
      vatRate: 0,
    }),
    entry({ id: "d", date: "2025-12-30", voucher: 9 }),
  ]
  const [summary, ...months] = ledgerWorkbook(entries, cats, 2026, "fi")

  it("has a summary and twelve months, in the book's language", () => {
    expect(summary.name).toBe("Yhteenveto")
    expect(months.map((m) => m.name)).toHaveLength(12)
    expect(months[2].name).toBe("Maaliskuu")
    expect(workbookFileName(2026, "en")).toBe("Bookkeeping 2026.xlsx")
  })

  it("lists the month's entries signed, with a formula total", () => {
    const march = months[2].rows
    expect(march).toHaveLength(5)
    expect(march[1].slice(0, 3)).toEqual([
      { n: 1 },
      { n: excelDate("2026-03-05"), format: "date" },
      "Lasku 1001",
    ])
    expect(march[1][6]).toEqual({ n: 1000, format: "money" })
    expect(march[2][6]).toEqual({ n: -100, format: "money" })
    expect(march[2][9]).toBe("avoin")
    expect(march[3][4]).toBe("Muu")
    expect(march[4][6]).toEqual({
      f: "SUM(G2:G4)",
      v: 400,
      format: "money",
      bold: true,
    })
  })

  it("keeps entries off the income statement out of income and expenses", () => {
    const row = summary.rows[3]
    expect(row[0]).toBe("Maaliskuu")
    expect(row[1]).toMatchObject({
      f: `SUMIFS('Maaliskuu'!G2:G4,'Maaliskuu'!E2:E4,"Tulo")`,
      v: 1000,
    })
    expect(row[2]).toMatchObject({ v: -100 })
    expect(row[3]).toMatchObject({ f: "B4+C4", v: 900 })
    expect(summary.rows[13][3]).toMatchObject({ f: "SUM(D2:D13)", v: 900 })
  })

  it("gives an empty month a header, an empty row and a zero total", () => {
    const jan = months[0].rows
    expect(jan).toHaveLength(3)
    expect(jan[2][6]).toMatchObject({ f: "SUM(G2:G2)", v: 0 })
  })
})
