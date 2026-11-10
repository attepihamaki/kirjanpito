import { categoryLabel, lineOf, offStatement } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import type { CategoryMap, Entry, Lang } from "@/lib/domain/types"
import { excelDate, sheetRef, type Cell, type Sheet } from "@/lib/domain/xlsx"

/**
 * The year's ledger as a spreadsheet (§7.10): a summary sheet and one sheet
 * per month. Amounts are signed, income positive and expenses negative, and
 * every total is a formula over the rows, so a row changed in the
 * spreadsheet moves the totals with it. Entries off the income statement
 * (VAT settlements, the owner's transfers, loans and fixed assets) are listed
 * with their own type and kept out of the income and expense totals.
 */

interface Words {
  summary: string
  months: readonly string[]
  voucher: string
  date: string
  description: string
  category: string
  type: string
  rate: string
  net: string
  vat: string
  gross: string
  paid: string
  open: string
  income: string
  expense: string
  other: string
  month: string
  incomeNet: string
  expenseNet: string
  difference: string
  vatSales: string
  vatPurchases: string
  total: string
  note: string
  sheetName: (year: number) => string
}

const WORDS: Record<Lang, Words> = {
  fi: {
    summary: "Yhteenveto",
    months: [
      "Tammikuu",
      "Helmikuu",
      "Maaliskuu",
      "Huhtikuu",
      "Toukokuu",
      "Kesäkuu",
      "Heinäkuu",
      "Elokuu",
      "Syyskuu",
      "Lokakuu",
      "Marraskuu",
      "Joulukuu",
    ],
    voucher: "Tosite",
    date: "Päivä",
    description: "Kuvaus",
    category: "Luokka",
    type: "Laji",
    rate: "ALV %",
    net: "Veroton",
    vat: "ALV",
    gross: "Verollinen",
    paid: "Maksettu",
    open: "avoin",
    income: "Tulo",
    expense: "Meno",
    other: "Muu",
    month: "Kuukausi",
    incomeNet: "Tulot, veroton",
    expenseNet: "Menot, veroton",
    difference: "Tulot − menot",
    vatSales: "ALV myynnistä",
    vatPurchases: "ALV ostoista",
    total: "Yhteensä",
    note: "Tulot − menot ei ole tuloslaskelman tulos, koska tuloslaskelman erityissääntöjä ei ole tässä sovellettu. Laji ”Muu” on ALV-maksut, yksityisotot ja -sijoitukset, lainat ja käyttöomaisuus, jotka eivät ole tuloja eivätkä menoja.",
    sheetName: (year) => `Kirjanpito ${year}`,
  },
  en: {
    summary: "Summary",
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    voucher: "Voucher",
    date: "Date",
    description: "Description",
    category: "Category",
    type: "Kind",
    rate: "VAT %",
    net: "Net",
    vat: "VAT",
    gross: "Gross",
    paid: "Paid",
    open: "open",
    income: "Income",
    expense: "Expense",
    other: "Other",
    month: "Month",
    incomeNet: "Income, net",
    expenseNet: "Expenses, net",
    difference: "Income − expenses",
    vatSales: "VAT on sales",
    vatPurchases: "VAT on purchases",
    total: "Total",
    note: "Income − expenses is not the income statement’s result, since the statement’s own rules are not applied here. Kind “Other” is VAT payments, the owner’s withdrawals and investments, loans and fixed assets, which are neither income nor expenses.",
    sheetName: (year) => `Bookkeeping ${year}`,
  },
}

/** The workbook's file name for `year` in `lang`. */
export function workbookFileName(year: number, lang: Lang): string {
  return `${WORDS[lang].sheetName(year)}.xlsx`
}

/** The columns of a month sheet, by letter. */
const COL = {
  type: "E",
  net: "G",
  vat: "H",
  gross: "I",
} as const

/** Cents as euros, for a cell. */
const euros = (cents: number) => cents / 100

export function ledgerWorkbook(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  lang: Lang
): Sheet[] {
  const w = WORDS[lang]
  const yearEntries = entries
    .filter((e) => yearOf(e.date) === year)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.voucher ?? 0) - (b.voucher ?? 0)
    )

  /* The cached figures of each month, for the summary's formulas. */
  const figures: {
    income: number
    expense: number
    vatSales: number
    vatPurchases: number
    last: number
  }[] = []

  const monthSheets: Sheet[] = w.months.map((name, i) => {
    const rows = yearEntries.filter((e) => monthOf(e.date) === i + 1)
    const sum = { income: 0, expense: 0, vatSales: 0, vatPurchases: 0 }
    let net = 0
    let vat = 0
    let gross = 0
    const body: Cell[][] = rows.map((e) => {
      const cat = cats.get(e.catId)
      const amounts = calcEntry(e)
      const sign = e.type === "expense" ? -1 : 1
      const off = offStatement(cat ? lineOf(cat) : undefined)
      const kind = off ? w.other : e.type === "income" ? w.income : w.expense
      if (!off) {
        if (e.type === "income") {
          sum.income += sign * amounts.net
          sum.vatSales += sign * amounts.vat
        } else {
          sum.expense += sign * amounts.net
          sum.vatPurchases += sign * amounts.vat
        }
      }
      net += sign * amounts.net
      vat += sign * amounts.vat
      gross += sign * amounts.gross
      return [
        e.voucher !== undefined ? { n: e.voucher } : null,
        { n: excelDate(e.date), format: "date" },
        e.description,
        categoryLabel(cat, lang),
        kind,
        { n: e.vatRate, format: "rate" },
        { n: euros(sign * amounts.net), format: "money" },
        { n: euros(sign * amounts.vat), format: "money" },
        { n: euros(sign * amounts.gross), format: "money" },
        e.paidOn === null
          ? w.open
          : e.paidOn
            ? { n: excelDate(e.paidOn), format: "date" }
            : null,
      ]
    })
    const last = Math.max(rows.length + 1, 2)
    figures.push({ ...sum, last })
    const total = (col: string, v: number): Cell => ({
      f: `SUM(${col}2:${col}${last})`,
      v: euros(v),
      format: "money",
      bold: true,
    })
    return {
      name,
      freezeHeader: true,
      widths: [8, 11, 40, 34, 8, 7, 12, 11, 12, 11],
      rows: [
        [
          { s: w.voucher, bold: true },
          { s: w.date, bold: true },
          { s: w.description, bold: true },
          { s: w.category, bold: true },
          { s: w.type, bold: true },
          { s: w.rate, bold: true },
          { s: w.net, bold: true },
          { s: w.vat, bold: true },
          { s: w.gross, bold: true },
          { s: w.paid, bold: true },
        ],
        ...body,
        ...(rows.length === 0 ? [[]] : []),
        [
          { s: w.total, bold: true },
          null,
          null,
          null,
          null,
          null,
          total(COL.net, net),
          total(COL.vat, vat),
          total(COL.gross, gross),
        ],
      ],
    }
  })

  /* A summary row's figures: one SUMIFS per month over the month's own rows. */
  const sumIf = (
    sheet: string,
    col: string,
    kind: string,
    last: number,
    v: number
  ): Cell => {
    const ref = sheetRef(sheet)
    const range = (c: string) => `${ref}!${c}2:${c}${last}`
    return {
      f: `SUMIFS(${range(col)},${range(COL.type)},"${kind}")`,
      v: euros(v),
      format: "money",
    }
  }
  const summaryRows: Cell[][] = w.months.map((name, i) => {
    const m = figures[i]
    const r = i + 2
    return [
      name,
      sumIf(name, COL.net, w.income, m.last, m.income),
      sumIf(name, COL.net, w.expense, m.last, m.expense),
      { f: `B${r}+C${r}`, v: euros(m.income + m.expense), format: "money" },
      sumIf(name, COL.vat, w.income, m.last, m.vatSales),
      sumIf(name, COL.vat, w.expense, m.last, m.vatPurchases),
    ]
  })
  const yearSum = (pick: (m: (typeof figures)[number]) => number) =>
    figures.reduce((s, m) => s + pick(m), 0)
  const colTotal = (col: string, v: number): Cell => ({
    f: `SUM(${col}2:${col}13)`,
    v: euros(v),
    format: "money",
    bold: true,
  })

  const summary: Sheet = {
    name: w.summary,
    freezeHeader: true,
    widths: [14, 16, 16, 16, 16, 16],
    rows: [
      [
        { s: w.month, bold: true },
        { s: w.incomeNet, bold: true },
        { s: w.expenseNet, bold: true },
        { s: w.difference, bold: true },
        { s: w.vatSales, bold: true },
        { s: w.vatPurchases, bold: true },
      ],
      ...summaryRows,
      [
        { s: w.total, bold: true },
        colTotal(
          "B",
          yearSum((m) => m.income)
        ),
        colTotal(
          "C",
          yearSum((m) => m.expense)
        ),
        colTotal(
          "D",
          yearSum((m) => m.income + m.expense)
        ),
        colTotal(
          "E",
          yearSum((m) => m.vatSales)
        ),
        colTotal(
          "F",
          yearSum((m) => m.vatPurchases)
        ),
      ],
      [],
      [w.note],
    ],
  }
  return [summary, ...monthSheets]
}
