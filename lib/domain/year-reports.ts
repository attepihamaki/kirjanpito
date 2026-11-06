import { groupName, lineName } from "@/lib/domain/accounts"
import { depreciationMaximums } from "@/lib/domain/assets"
import {
  accountList,
  generalLedger,
  journal,
  ledgerReconciliation,
  type BookRow,
  type Totals,
} from "@/lib/domain/books"
import { form5Sections } from "@/lib/domain/form5"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import type { AssetOpening } from "@/lib/domain/assets"
import { yearOf } from "@/lib/domain/dates"
import { incomeStatement } from "@/lib/domain/income-statement"
import {
  balancesAt,
  taxBasisEntries,
  type TraderType,
} from "@/lib/domain/open-items"
import { receiptFolder } from "@/lib/domain/receipt-path"
import { retentionDates } from "@/lib/domain/retention"
import type { TaxFormSection } from "@/lib/domain/tax-form"
import {
  indexCategories,
  type Category,
  type Cents,
  type Entry,
  type Lang,
} from "@/lib/domain/types"
import type { Formatters } from "@/lib/i18n/create-formatters"

/**
 * The year's reports as documents (§8.21): the journal, the general ledger,
 * the account list, the income statement and Form 5, the ones KPL 2:7a and
 * 2:10 have the trader keep for ten years. Everything here is pure and works
 * from strings already translated, so `lib/browser/report-pdf.ts` only has to
 * draw what it is given. The views on screen are not reused: they render
 * through React and the browser's print dialog, which cannot write a file.
 */

export type ReportAlign = "left" | "right"

export interface ReportColumn {
  head: string
  align: ReportAlign
  /** Share of the page width. Only the ratios between columns matter. */
  weight: number
}

export type ReportRow =
  /** A bold line across the table: a month, an account. */
  | { kind: "heading"; text: string }
  /** A small muted line across the table. */
  | { kind: "group"; text: string }
  /**
   * One cell per column. A cell may hold several lines separated by "\n";
   * every line after the first is drawn small and muted.
   */
  | { kind: "data"; cells: string[]; muted?: boolean; strong?: boolean }
  /** The cells run from the column `from`; the ones before it are left empty. */
  | {
      kind: "total"
      label: string
      from: number
      cells: string[]
      double?: boolean
    }

export type ReportBlock =
  | { kind: "table"; columns: ReportColumn[]; rows: ReportRow[] }
  | {
      kind: "text"
      text: string
      style?: "heading" | "subheading" | "note" | "body"
    }

export interface ReportDoc {
  /** Stable key for the file: the order in the package and its name. */
  id: "journal" | "ledger" | "accounts" | "statement" | "form5"
  /** The document title, also the PDF's title. */
  title: string
  /** Lines under the title: the business, the period. */
  header: string[]
  blocks: ReportBlock[]
  /** Printed at the end of the last page. */
  footer: string
}

/** What the reports read. All of it is in the book; nothing is typed in here. */
export interface YearReportInput {
  year: number
  entries: readonly Entry[]
  cats: readonly Category[]
  traderType: TraderType
  yearEnd: YearEnd | undefined
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
  businessName: string
  businessId: string
  /** The book's export language: the folder names in the book list follow it. */
  exportLang: Lang
}

/** The part of the formatters the reports use, so a test can pass a small one. */
export type ReportText = Pick<
  Formatters,
  | "lang"
  | "t"
  | "money"
  | "date"
  | "rate"
  | "month"
  | "catName"
  | "lineName"
  | "groupName"
>

/** An amount with its minus sign when `negative`, as the views show expenses. */
function signed(f: ReportText, cents: Cents, negative: boolean): string {
  return f.money(negative ? -cents : cents)
}

function header(f: ReportText, input: YearReportInput): string[] {
  const lines: string[] = []
  const who = [
    input.businessName,
    input.businessId ? `${f.t("common.businessId")} ${input.businessId}` : "",
  ].filter(Boolean)
  if (who.length) lines.push(who.join(" · "))
  lines.push(
    f.t("overview.range", {
      a: f.date(`${input.year}-01-01`),
      b: f.date(`${input.year}-12-31`),
    })
  )
  return lines
}

function retentionNote(f: ReportText, year: number): string {
  const r = retentionDates(year)
  return f.t("ledger.retention", { b: f.date(r.books), v: f.date(r.vouchers) })
}

/* -------------------------------------------------------------------------
 * Journal and general ledger
 * ---------------------------------------------------------------------- */

function entryCells(
  f: ReportText,
  row: BookRow,
  cat: Category | undefined,
  withAccount: boolean,
  negative: boolean
): string[] {
  const { entry } = row
  const catLabel = cat ? f.catName(cat) : null
  /* In the general ledger the account heading already names the line. */
  const showCat =
    catLabel !== null &&
    (withAccount || !row.line || catLabel !== f.lineName(row.line))
  const description = [
    entry.description || f.t("ledger.noDescription"),
    showCat ? catLabel : null,
  ]
    .filter((s): s is string => s !== null)
    .join("\n")
  const vat = [
    signed(f, row.vat, negative),
    entry.vatRate ? f.rate(entry.vatRate) : null,
  ]
    .filter((s): s is string => s !== null)
    .join("\n")
  return [
    entry.voucher === undefined ? "" : String(entry.voucher),
    f.date(entry.date),
    description,
    ...(withAccount ? [row.line ? String(row.line.account) : ""] : []),
    signed(f, row.net, negative),
    vat,
    signed(f, row.gross, negative),
  ]
}

function bookColumns(f: ReportText, withAccount: boolean): ReportColumn[] {
  return [
    { head: f.t("ledger.colVoucher"), align: "right", weight: 5 },
    { head: f.t("ledger.colDate"), align: "left", weight: 10 },
    { head: f.t("ledger.colDescription"), align: "left", weight: 30 },
    ...(withAccount
      ? [{ head: f.t("ledger.colAccount"), align: "left", weight: 6 } as const]
      : []),
    { head: f.t("ledger.colNet"), align: "right", weight: 12 },
    { head: f.t("ledger.colVat"), align: "right", weight: 11 },
    { head: f.t("ledger.colGross"), align: "right", weight: 12 },
  ]
}

function totalCells(f: ReportText, t: Totals, negative: boolean): string[] {
  return [
    signed(f, t.net, negative),
    signed(f, t.vat, negative),
    signed(f, t.gross, negative),
  ]
}

function journalReport(f: ReportText, input: YearReportInput): ReportDoc {
  const cats = indexCategories(input.cats)
  const book = journal(input.entries, cats, input.year)
  const columns = bookColumns(f, true)
  const rows: ReportRow[] = []
  for (const { month, rows: monthRows } of book.months) {
    rows.push({ kind: "heading", text: f.month(month - 1) })
    for (const row of monthRows) {
      rows.push({
        kind: "data",
        cells: entryCells(
          f,
          row,
          cats.get(row.entry.catId),
          true,
          row.entry.type === "expense"
        ),
      })
    }
  }
  rows.push(
    {
      kind: "total",
      label: f.t("ledger.incomeTotal"),
      from: 4,
      cells: totalCells(f, book.income, false),
      double: true,
    },
    {
      kind: "total",
      label: f.t("ledger.expenseTotal"),
      from: 4,
      cells: totalCells(f, book.expense, true),
    }
  )
  return {
    id: "journal",
    title: f.t("ledger.journalTitle", { y: input.year }),
    header: [...header(f, input), f.t("ledger.journalSub")],
    blocks: book.months.length
      ? [{ kind: "table", columns, rows }]
      : [
          {
            kind: "text",
            text: f.t("ledger.noEntriesYear", { y: input.year }),
          },
        ],
    footer: retentionNote(f, input.year),
  }
}

function ledgerReport(f: ReportText, input: YearReportInput): ReportDoc {
  const cats = indexCategories(input.cats)
  const accounts = generalLedger(input.entries, cats, input.year)
  const columns = bookColumns(f, false)
  const rows: ReportRow[] = []
  for (const { line, rows: lineRows, totals } of accounts) {
    rows.push({ kind: "heading", text: `${line.account} ${f.lineName(line)}` })
    for (const row of lineRows) {
      rows.push({
        kind: "data",
        cells: entryCells(f, row, cats.get(row.entry.catId), false, false),
      })
    }
    rows.push({
      kind: "total",
      label: f.t("common.total"),
      from: 3,
      cells: totalCells(f, totals, false),
    })
  }

  const blocks: ReportBlock[] = accounts.length
    ? [{ kind: "table", columns, rows }]
    : [{ kind: "text", text: f.t("ledger.noEntriesYear", { y: input.year }) }]

  const recon = ledgerReconciliation(
    input.entries,
    cats,
    input.year,
    input.traderType
  )
  if (recon.crossings.length) {
    blocks.push(
      { kind: "text", text: f.t("ledger.reconTitle"), style: "heading" },
      { kind: "text", text: f.t("ledger.reconIntro"), style: "body" },
      {
        kind: "table",
        columns: [
          { head: f.t("ledger.colAccount"), align: "left", weight: 30 },
          { head: f.t("ledger.reconLedger"), align: "right", weight: 14 },
          { head: f.t("ledger.reconOut"), align: "right", weight: 14 },
          {
            head: f.t("ledger.reconIn", { y: input.year }),
            align: "right",
            weight: 14,
          },
          { head: f.t("ledger.reconStatement"), align: "right", weight: 14 },
        ],
        rows: recon.lines.map((r) => ({
          kind: "data" as const,
          cells: [
            `${r.line.account} ${f.lineName(r.line)}`,
            f.money(r.ledger),
            f.money(r.out),
            f.money(r.in),
            f.money(r.statement),
          ],
        })),
      },
      { kind: "text", text: f.t("ledger.reconEntries"), style: "subheading" },
      {
        kind: "table",
        columns: [
          { head: f.t("ledger.colVoucher"), align: "right", weight: 5 },
          { head: f.t("ledger.colDate"), align: "left", weight: 10 },
          { head: f.t("ledger.colPaid"), align: "left", weight: 10 },
          { head: f.t("ledger.colDescription"), align: "left", weight: 28 },
          { head: f.t("ledger.colAccount"), align: "left", weight: 6 },
          { head: f.t("ledger.colEffect"), align: "right", weight: 12 },
        ],
        rows: recon.crossings.map(({ row, paid, direction }) => ({
          kind: "data" as const,
          cells: [
            row.entry.voucher === undefined ? "" : String(row.entry.voucher),
            f.date(row.entry.date),
            paid ? f.date(paid) : f.t("ledger.openPill"),
            row.entry.description || f.t("ledger.noDescription"),
            row.line ? String(row.line.account) : "",
            signed(f, row.net, direction === "out"),
          ],
        })),
      },
      { kind: "text", text: f.t("ledger.reconNote"), style: "note" }
    )
  }

  return {
    id: "ledger",
    title: f.t("ledger.accountsTitle", { y: input.year }),
    header: [...header(f, input), f.t("ledger.accountsSub")],
    blocks,
    footer: retentionNote(f, input.year),
  }
}

/* -------------------------------------------------------------------------
 * Account list
 * ---------------------------------------------------------------------- */

/** The kinds of book and material KPL 2:7a asks to have listed, each with how it is kept. */
const BOOK_LIST = [
  ["ledger.bookJournal", "ledger.bookJournalKept"],
  ["ledger.bookGeneral", "ledger.bookGeneralKept"],
  ["ledger.bookVouchers", "ledger.bookVouchersKept"],
  ["ledger.bookReports", "ledger.bookReportsKept"],
] as const

function accountListReport(f: ReportText, input: YearReportInput): ReportDoc {
  const list = accountList(input.entries, input.cats, input.year)
  const rows: ReportRow[] = list.map(({ line, categories }) => {
    const name = lineName(line, f.lang)
    const own = categories.map((c) => f.catName(c)).filter((c) => c !== name)
    const content = [groupName(line, f.lang), ...own].filter(Boolean).join(", ")
    return { kind: "data", cells: [String(line.account), name, content] }
  })

  const blocks: ReportBlock[] = [
    {
      kind: "table",
      columns: [
        { head: f.t("ledger.colAccount"), align: "left", weight: 8 },
        { head: f.t("ledger.chartName"), align: "left", weight: 32 },
        { head: f.t("ledger.chartContent"), align: "left", weight: 40 },
      ],
      rows,
    },
    { kind: "text", text: f.t("ledger.bookListTitle"), style: "heading" },
  ]
  for (const [name, kept] of BOOK_LIST) {
    blocks.push(
      { kind: "text", text: f.t(name), style: "subheading" },
      {
        kind: "text",
        text: f.t(kept, { d: receiptFolder(input.exportLang) }),
        style: "body",
      }
    )
  }
  blocks.push({ kind: "text", text: f.t("ledger.closingNote"), style: "note" })

  return {
    id: "accounts",
    title: f.t("ledger.chartTitle", { y: input.year }),
    header: [...header(f, input), f.t("ledger.chartSub")],
    blocks,
    footer: retentionNote(f, input.year),
  }
}

/* -------------------------------------------------------------------------
 * Income statement and Form 5
 * ---------------------------------------------------------------------- */

/**
 * The income statement and Form 5 read the entries by the year they were paid
 * (§6.3), with the depreciation the register allows. Both need the whole book,
 * not only the year's own entries, so the input carries all of it.
 */
function statementOf(input: YearReportInput) {
  const cats = indexCategories(input.cats)
  const latest = input.entries.reduce(
    (max, e) => Math.max(max, yearOf(e.date)),
    input.year
  )
  const options = {
    depreciationMax: depreciationMaximums(
      input.entries,
      cats,
      input.assetOpening,
      latest
    ),
  }
  return incomeStatement(
    taxBasisEntries(input.entries, input.traderType),
    cats,
    input.year,
    options
  )
}

function statementReport(f: ReportText, input: YearReportInput): ReportDoc {
  const cats = indexCategories(input.cats)
  const statement = statementOf(input)
  const rows: ReportRow[] = []
  let side: string | null = null
  let group: string | null = null
  for (const { line, net } of statement.lines) {
    if (line.side !== side) {
      side = line.side
      group = null
      rows.push({
        kind: "total",
        label:
          line.side === "income"
            ? f.t("statement.revenue")
            : f.t("statement.expenses"),
        from: 1,
        cells: [
          f.money(
            line.side === "income"
              ? statement.incomeTotal
              : statement.expenseTotal
          ),
        ],
      })
    }
    const groupLabel = f.groupName(line)
    if (groupLabel && groupLabel !== group) {
      group = groupLabel
      rows.push({ kind: "group", text: groupLabel })
    }
    rows.push({
      kind: "data",
      muted: net === 0,
      cells: [
        `${line.account} ${f.lineName(line)}`,
        net === 0 ? "-" : f.money(net),
      ],
    })
  }
  rows.push(
    {
      kind: "total",
      label: f.t("statement.revenueTotal"),
      from: 1,
      cells: [f.money(statement.revenueTotal)],
    },
    {
      kind: "total",
      label: f.t("statement.deductibleTotal"),
      from: 1,
      cells: [f.money(-statement.deductibleTotal)],
    },
    {
      kind: "total",
      label:
        statement.resultLine === "358"
          ? f.t("statement.profit")
          : f.t("statement.loss"),
      from: 1,
      cells: [f.money(statement.resultMagnitude)],
      double: true,
    }
  )

  const blocks: ReportBlock[] = [
    {
      kind: "table",
      columns: [
        { head: "", align: "left", weight: 40 },
        { head: "", align: "right", weight: 14 },
      ],
      rows,
    },
  ]

  const notes: string[] = []
  if (statement.taxExemptTotal) {
    notes.push(
      f.t("statement.exemptNote", { a: f.money(statement.taxExemptTotal) })
    )
  }
  if (statement.dividendTotal) {
    notes.push(
      f.t("statement.dividendNote", {
        a: f.money(statement.dividendTotal),
        b: f.money(statement.dividendTaxable),
      })
    )
  }
  if (statement.surplusTotal) {
    notes.push(
      f.t("statement.surplusNote", {
        a: f.money(statement.surplusTotal),
        b: f.money(statement.surplusTaxable),
      })
    )
  }
  if (statement.depreciationExcess > 0) {
    notes.push(
      f.t("statement.depreciationNote", {
        a: f.money(statement.depreciationExcess),
      })
    )
  }
  if (statement.entertainmentTotal) {
    notes.push(
      f.t("statement.entertainmentNote", {
        a: f.money(statement.entertainmentTotal),
        b: f.money(statement.entertainmentDeductible),
      })
    )
  }
  if (statement.nonDeductibleTotal) {
    notes.push(
      f.t("statement.note", { a: f.money(statement.nonDeductibleTotal) })
    )
  }
  const open = balancesAt(input.entries, cats, `${input.year}-12-31`)
  notes.push(
    f.t(
      input.traderType === "business"
        ? "statement.accrualNote"
        : "statement.cashNote",
      {
        d: f.date(`${input.year}-12-31`),
        r: f.money(open.receivables),
        p: f.money(open.payables),
      }
    )
  )
  for (const text of notes) blocks.push({ kind: "text", text, style: "note" })

  return {
    id: "statement",
    title: `${f.t("nav.statement")} ${input.year}`,
    header: header(f, input),
    blocks,
    footer: f.t("landing.footer"),
  }
}

/** A Form 5 section as a table of its codes, labels and amounts. */
function formTable(
  f: ReportText,
  sections: readonly TaxFormSection[]
): ReportBlock[] {
  const blocks: ReportBlock[] = []
  for (const section of sections) {
    const title = `${section.number ? `${section.number} ` : ""}${section.title[f.lang]}`
    const rows: ReportRow[] = []
    for (const row of section.rows) {
      if (row.kind === "group") {
        rows.push({ kind: "group", text: row.label[f.lang] })
        continue
      }
      if (row.unused) continue
      const label = row.hint
        ? `${row.label[f.lang]}\n${row.hint[f.lang]}`
        : row.label[f.lang]
      rows.push({
        kind: "data",
        muted: row.value === 0 && !row.total,
        strong: row.total,
        cells: [
          row.portion ? `  ${row.code}` : row.code,
          label,
          row.value === 0 ? "-" : f.money(row.value),
        ],
      })
    }
    blocks.push(
      { kind: "text", text: title, style: "heading" },
      {
        kind: "table",
        columns: [
          { head: "", align: "left", weight: 7 },
          { head: "", align: "left", weight: 40 },
          { head: "", align: "right", weight: 14 },
        ],
        rows,
      }
    )
  }
  return blocks
}

function form5Report(f: ReportText, input: YearReportInput): ReportDoc {
  const cats = indexCategories(input.cats)
  const yearEnd = input.yearEnd ?? EMPTY_YEAR_END
  const balance = form5Balance({
    entries: input.entries,
    cats,
    year: input.year,
    yearEnd,
    assetOpening: input.assetOpening,
    loanOpening: input.loanOpening,
  })
  const sections = [
    ...form5Sections(statementOf(input)),
    ...form5BalanceSections(balance, yearEnd),
  ]
  return {
    id: "form5",
    title: f.t("ledger.packForm5Title", { y: input.year }),
    header: [...header(f, input), f.t("ledger.packForm5Sub")],
    blocks: formTable(f, sections),
    footer: f.t("landing.footer"),
  }
}

/** The five reports, in the order the package lists them. */
export function yearReports(
  f: ReportText,
  input: YearReportInput
): ReportDoc[] {
  return [
    journalReport(f, input),
    ledgerReport(f, input),
    accountListReport(f, input),
    statementReport(f, input),
    form5Report(f, input),
  ]
}
