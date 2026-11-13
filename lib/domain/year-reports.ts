import { groupName, lineName } from "@/lib/domain/accounts"
import { depreciationMaximums } from "@/lib/domain/assets"
import {
  accountList,
  generalLedger,
  journal,
  ledgerReconciliation,
  scopeRange,
  type BookRow,
  type BookScope,
  type DateRange,
  type Totals,
} from "@/lib/domain/books"
import { form5Report } from "@/lib/domain/form5-report"
import { type LoanOpening, type YearEnd } from "@/lib/domain/form5-balance"
import type { AssetOpening } from "@/lib/domain/assets"
import { yearOf } from "@/lib/domain/dates"
import { incomeStatement } from "@/lib/domain/income-statement"
import {
  balancesAt,
  taxBasisEntries,
  type TraderType,
} from "@/lib/domain/open-items"
import {
  figureRows,
  rowsTotal,
  vatContribution,
  vatFieldSelector,
} from "@/lib/domain/figure-vouchers"
import { filterPeriod } from "@/lib/domain/period"
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
import { countsOnVatReturn, vatReport } from "@/lib/domain/vat"
import { vatBasisEntries, type VatCashBasis } from "@/lib/domain/vat-basis"
import {
  asPeriod,
  bookStartDate,
  filedOn,
  vatPeriods,
  type VatPeriod,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"
import { figureChanges } from "@/lib/domain/vat-filing"
import { vatReturnSections } from "@/lib/domain/vat-return"
import type { Formatters } from "@/lib/i18n/create-formatters"
import { periodLabel } from "@/lib/i18n/period-label"

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
  id:
    | "journal"
    | "ledger"
    | "accounts"
    | "statement"
    | "form5"
    | "vat"
    | "stocktake"
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

/**
 * What the three books read, which is less than a year's reports do: the
 * audit package (§8.25) makes them for any range of days.
 */
export type BookReportInput = Pick<
  YearReportInput,
  | "entries"
  | "cats"
  | "traderType"
  | "businessName"
  | "businessId"
  | "exportLang"
>

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

/** A year as "2026", a range as its two dates: what the titles put in `{y}`. */
function scopeLabel(f: ReportText, scope: BookScope): string {
  if (typeof scope === "number") return String(scope)
  return f.t("overview.range", { a: f.date(scope.from), b: f.date(scope.to) })
}

function header(
  f: ReportText,
  input: BookReportInput,
  scope: BookScope
): string[] {
  const lines: string[] = []
  const who = [
    input.businessName,
    input.businessId ? `${f.t("common.businessId")} ${input.businessId}` : "",
  ].filter(Boolean)
  if (who.length) lines.push(who.join(" · "))
  const { from, to } = scopeRange(scope)
  lines.push(f.t("overview.range", { a: f.date(from), b: f.date(to) }))
  return lines
}

/** A range is kept as long as its last year, the later of the dates. */
function retentionNote(f: ReportText, scope: BookScope): string {
  const r = retentionDates(typeof scope === "number" ? scope : yearOf(scope.to))
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
  /* The journal carries the user's note, for the accountant who reads the package (§8.39). */
  const note =
    withAccount && entry.note
      ? `${f.t("entry.note")}: ${entry.note.replace(/\s*\n\s*/g, " / ")}`
      : null
  const description = [
    entry.description || f.t("ledger.noDescription"),
    showCat ? catLabel : null,
    note,
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

function journalReport(
  f: ReportText,
  input: BookReportInput,
  scope: BookScope
): ReportDoc {
  const cats = indexCategories(input.cats)
  const book = journal(input.entries, cats, scope)
  const columns = bookColumns(f, true)
  const rows: ReportRow[] = []
  const byRange = typeof scope !== "number"
  for (const { year, month, rows: monthRows } of book.months) {
    rows.push({
      kind: "heading",
      text: byRange ? `${f.month(month - 1)} ${year}` : f.month(month - 1),
    })
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
    title: f.t("ledger.journalTitle", { y: scopeLabel(f, scope) }),
    header: [...header(f, input, scope), f.t("ledger.journalSub")],
    blocks: book.months.length
      ? [{ kind: "table", columns, rows }]
      : [{ kind: "text", text: noEntries(f, scope) }],
    footer: retentionNote(f, scope),
  }
}

function noEntries(f: ReportText, scope: BookScope): string {
  return typeof scope === "number"
    ? f.t("ledger.noEntriesYear", { y: scope })
    : f.t("ledger.noEntriesRange", { r: scopeLabel(f, scope) })
}

function ledgerReport(
  f: ReportText,
  input: BookReportInput,
  scope: BookScope
): ReportDoc {
  const cats = indexCategories(input.cats)
  const accounts = generalLedger(input.entries, cats, scope)
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
    : [{ kind: "text", text: noEntries(f, scope) }]

  /* The reconciliation is to a year's statement, so a range has none. */
  const year = typeof scope === "number" ? scope : null
  const recon =
    year === null
      ? null
      : ledgerReconciliation(input.entries, cats, year, input.traderType)
  if (year !== null && recon && recon.crossings.length) {
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
            head: f.t("ledger.reconIn", { y: year }),
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
    title: f.t("ledger.accountsTitle", { y: scopeLabel(f, scope) }),
    header: [...header(f, input, scope), f.t("ledger.accountsSub")],
    blocks,
    footer: retentionNote(f, scope),
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

function accountListReport(
  f: ReportText,
  input: BookReportInput,
  scope: BookScope
): ReportDoc {
  const list = accountList(input.entries, input.cats, scope)
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
    title: f.t("ledger.chartTitle", { y: scopeLabel(f, scope) }),
    header: [...header(f, input, scope), f.t("ledger.chartSub")],
    blocks,
    footer: retentionNote(f, scope),
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
    header: header(f, input, input.year),
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

function form5Doc(f: ReportText, input: YearReportInput): ReportDoc {
  const { sections } = form5Report({
    statement: statementOf(input),
    entries: input.entries,
    cats: indexCategories(input.cats),
    year: input.year,
    yearEnd: input.yearEnd,
    assetOpening: input.assetOpening,
    loanOpening: input.loanOpening,
  })
  return {
    id: "form5",
    title: f.t("ledger.packForm5Title", { y: input.year }),
    header: [...header(f, input, input.year), f.t("ledger.packForm5Sub")],
    blocks: formTable(f, sections),
    footer: f.t("landing.footer"),
  }
}

/* -------------------------------------------------------------------------
 * VAT returns
 * ---------------------------------------------------------------------- */

/** What one VAT return report reads. */
export interface VatReturnBook {
  entries: readonly Entry[]
  cats: readonly Category[]
  /** The months VAT is reported on payment (§6.16). */
  vatCash?: VatCashBasis | null
  businessName: string
  businessId: string
  vatFiled: Readonly<Record<string, string>>
  /** Period key → the figures the return had when it was marked filed. */
  vatFiledFigures: Readonly<Record<string, Readonly<Record<string, number>>>>
}

/** What the year's VAT return reports read besides the year's reports. */
export interface VatReturnInput extends YearReportInput, VatReturnBook {
  vatPeriod: VatPeriodKind
  bookStart: string | null
}

/**
 * One VAT return of the year as a document (§8.21): its fields as OmaVero asks
 * for them, then under each non-zero field the vouchers it is made of. This is
 * the click-through of §8.18 on paper, since KPL 2:6 asks for a trace from a
 * return to its vouchers and the click-through exists only inside the app.
 */
export function vatReturnReport(
  f: ReportText,
  input: VatReturnBook,
  period: VatPeriod
): ReportDoc {
  const cats = indexCategories(input.cats)
  const inPeriodEntries = filterPeriod(
    vatBasisEntries(input.entries, cats, input.vatCash),
    asPeriod(period)
  )
  const byId = new Map(inPeriodEntries.map((e) => [e.id, e]))
  const sections = vatReturnSections(vatReport(inPeriodEntries, cats))

  const rows: ReportRow[] = []
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind !== "field" || row.value === 0) continue
      const vouchers = figureRows(
        inPeriodEntries,
        vatContribution(cats, vatFieldSelector(row.code))
      )
      if (!vouchers.length) continue
      rows.push({ kind: "heading", text: `${row.code} ${row.label[f.lang]}` })
      for (const { entryId, amount } of vouchers) {
        const entry = byId.get(entryId)
        if (!entry) continue
        rows.push({
          kind: "data",
          cells: [
            entry.voucher === undefined ? "" : String(entry.voucher),
            f.date(entry.date),
            entry.description || f.t("ledger.noDescription"),
            f.money(amount),
          ],
        })
      }
      rows.push({
        kind: "total",
        label: f.t("common.total"),
        from: 3,
        cells: [f.money(rowsTotal(vouchers))],
      })
    }
  }

  const who = [
    input.businessName,
    input.businessId ? `${f.t("common.businessId")} ${input.businessId}` : "",
  ].filter(Boolean)
  const filed = filedOn(period, input.vatFiled)
  const lines = [
    f.t("overview.range", { a: f.date(period.from), b: f.date(period.to) }),
    f.t("vat.dueDate", { d: f.date(period.due) }),
  ]
  if (filed) lines.push(f.t("vat.filedOn", { d: f.date(filed) }))

  const blocks: ReportBlock[] = formTable(f, sections)
  const filedFigures = input.vatFiledFigures[period.key]
  if (filed && filedFigures) {
    const changes = figureChanges(
      filedFigures,
      vatReport(inPeriodEntries, cats)
    )
    if (changes.length) {
      blocks.push(
        { kind: "text", text: f.t("ledger.packVatChanged"), style: "heading" },
        {
          kind: "text",
          text: f.t("ledger.packVatChangedIntro"),
          style: "note",
        },
        {
          kind: "table",
          columns: [
            { head: "", align: "left", weight: 7 },
            { head: "", align: "left", weight: 36 },
            { head: f.t("vat.filed"), align: "right", weight: 14 },
            { head: f.t("vat.changedNow"), align: "right", weight: 14 },
          ],
          rows: changes.map((c) => ({
            kind: "data" as const,
            cells: [c.code, c.label[f.lang], f.money(c.filed), f.money(c.now)],
          })),
        }
      )
    } else {
      blocks.push({
        kind: "text",
        text: f.t("ledger.packVatMatches"),
        style: "note",
      })
    }
  }
  if (rows.length) {
    blocks.push(
      { kind: "text", text: f.t("ledger.packVatVouchers"), style: "heading" },
      { kind: "text", text: f.t("ledger.packVatNote"), style: "note" },
      {
        kind: "table",
        columns: [
          { head: f.t("ledger.colVoucher"), align: "right", weight: 5 },
          { head: f.t("ledger.colDate"), align: "left", weight: 10 },
          { head: f.t("ledger.colDescription"), align: "left", weight: 36 },
          { head: f.t("ledger.packVatAmount"), align: "right", weight: 14 },
        ],
        rows,
      }
    )
  }

  return {
    id: "vat",
    title: `${f.t("vat.returnTitle")} ${periodLabel(f, period)}`,
    header: [...(who.length ? [who.join(" · ")] : []), ...lines],
    blocks,
    footer: f.t("landing.footer"),
  }
}

/** Keeps the periods with something to report and makes a document of each. */
function reportsForPeriods(
  f: ReportText,
  input: VatReturnBook & Pick<VatReturnInput, "bookStart">,
  periods: readonly VatPeriod[]
): ReportDoc[] {
  const cats = indexCategories(input.cats)
  const start = bookStartDate(
    input.bookStart,
    input.entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
  )
  if (!start) return []
  const onVat = vatBasisEntries(input.entries, cats, input.vatCash)
  return periods
    .filter((p) => p.to >= start)
    .filter(
      (p) =>
        filedOn(p, input.vatFiled) !== null ||
        filterPeriod(onVat, asPeriod(p)).some((e) => countsOnVatReturn(e, cats))
    )
    .map((p) => vatReturnReport(f, input, p))
}

/**
 * The year's VAT returns, one document per filing period (§6.5) in the order of
 * the year. A period is left out when it ended before the book began, and when
 * it has neither a voucher on the return nor a filed mark, so a quiet month
 * does not add a page of zeros.
 */
export function vatReturnReports(
  f: ReportText,
  input: VatReturnInput
): ReportDoc[] {
  return reportsForPeriods(f, input, vatPeriods(input.vatPeriod, input.year))
}

/** What the audit package's reports read (§8.25). */
export interface AuditReportInput
  extends
    BookReportInput,
    VatReturnBook,
    Pick<VatReturnInput, "vatPeriod" | "bookStart"> {}

/**
 * The reports of the audit package for any range of days (§8.25): the journal,
 * the general ledger and the account list over the range, then the VAT return
 * of every filing period that lies wholly inside it. A period cut by the range
 * is left out, since a return for part of a period is not one that was filed.
 */
export function auditReports(
  f: ReportText,
  input: AuditReportInput,
  range: DateRange
): ReportDoc[] {
  const periods: VatPeriod[] = []
  for (let y = yearOf(range.from); y <= yearOf(range.to); y++) {
    periods.push(...vatPeriods(input.vatPeriod, y))
  }
  return [
    journalReport(f, input, range),
    ledgerReport(f, input, range),
    accountListReport(f, input, range),
    ...reportsForPeriods(
      f,
      input,
      periods.filter((p) => p.from >= range.from && p.to <= range.to)
    ),
  ]
}

/** The five reports, in the order the package lists them. */
export function yearReports(
  f: ReportText,
  input: YearReportInput
): ReportDoc[] {
  return [
    journalReport(f, input, input.year),
    ledgerReport(f, input, input.year),
    accountListReport(f, input, input.year),
    statementReport(f, input),
    form5Doc(f, input),
  ]
}
