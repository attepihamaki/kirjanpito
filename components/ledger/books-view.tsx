"use client"

import * as React from "react"
import { NoEntriesState } from "@/components/common/no-entries-state"
import { PrinterIcon } from "lucide-react"

import { BusinessLine } from "@/components/common/business-line"
import { Money } from "@/components/common/money"
import { PageHeader } from "@/components/common/page-header"
import { useSectionHeading } from "@/components/common/sub-page-tabs"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { groupName, lineName } from "@/lib/domain/accounts"
import {
  accountList,
  generalLedger,
  journal,
  ledgerReconciliation,
  type BookRow,
  type Totals,
} from "@/lib/domain/books"
import { receiptFolder } from "@/lib/domain/receipt-path"
import { retentionDates } from "@/lib/domain/retention"
import { indexCategories, type Category } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The journal (päiväkirja) and the general ledger (pääkirja), the two views
 * of the entries that KPL 2:4 asks for (§8.4). Each is a printable sheet on
 * the same --sheet surface as the income statement (§8.8), and the page's
 * chrome is hidden on paper.
 */

function useBookData() {
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  return { entries, catMap, year }
}

function ReportPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const retention = retentionDates(year)
  const heading = useSectionHeading("ledger")

  return (
    <>
      <div className="print-hidden">
        <PageHeader
          {...heading}
          subtitle={`${f.t("ledger.wholeYear")} ${year}`}
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon data-icon="inline-start" />
              {f.t("ledger.print")}
            </Button>
          }
        />
        <LedgerTabs />
      </div>

      <div className="print-sheet max-w-4xl rounded-lg border border-sheet-edge bg-sheet p-4 shadow-sm md:p-8">
        <header className="mb-6">
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <BusinessLine />
          <p className="tabular text-sm text-muted-foreground">
            {f.t("overview.range", {
              a: f.date(`${year}-01-01`),
              b: f.date(`${year}-12-31`),
            })}{" "}
            · {subtitle}
          </p>
        </header>
        {children}
        <p className="mt-8 text-xs text-muted-foreground">
          {f.t("ledger.retention", {
            b: f.date(retention.books),
            v: f.date(retention.vouchers),
          })}
        </p>
      </div>
    </>
  )
}

const cell = "py-1.5 pr-3 align-top last:pr-0"
const num = cn(cell, "text-right")

/** The column heads shared by both books; the journal adds the account. */
function HeadRow({ withAccount }: { withAccount: boolean }) {
  const f = useFormatters()
  const head = "pb-2 pr-3 text-xs font-medium text-muted-foreground last:pr-0"
  return (
    <tr className="border-b border-sheet-edge">
      <th scope="col" className={cn(head, "w-px text-right")}>
        {f.t("ledger.colVoucher")}
      </th>
      <th scope="col" className={cn(head, "w-px text-left")}>
        {f.t("ledger.colDate")}
      </th>
      <th scope="col" className={cn(head, "text-left")}>
        {f.t("ledger.colDescription")}
      </th>
      {withAccount ? (
        <th scope="col" className={cn(head, "w-px text-left")}>
          {f.t("ledger.colAccount")}
        </th>
      ) : null}
      <th scope="col" className={cn(head, "text-right")}>
        {f.t("ledger.colNet")}
      </th>
      <th scope="col" className={cn(head, "text-right")}>
        {f.t("ledger.colVat")}
      </th>
      <th scope="col" className={cn(head, "text-right")}>
        {f.t("ledger.colGross")}
      </th>
    </tr>
  )
}

function EntryRow({
  row,
  cat,
  withAccount,
  signed,
}: {
  row: BookRow
  cat: Category | undefined
  withAccount: boolean
  /** Show expenses as negative, so a column of mixed rows reads at a glance. */
  signed: boolean
}) {
  const f = useFormatters()
  const { entry } = row
  const minus = signed && entry.type === "expense"
  /*
   * In the general ledger the account heading already names the line, so a
   * category of the same name would only repeat it.
   */
  const catLabel = cat ? f.catName(cat) : null
  const showCat =
    catLabel !== null &&
    (withAccount || !row.line || catLabel !== f.lineName(row.line))

  return (
    <tr className="border-b border-dashed border-sheet-edge/60">
      <td className={cn(num, "tabular text-muted-foreground")}>
        {entry.voucher}
      </td>
      <td className={cn(cell, "tabular whitespace-nowrap")}>
        {f.date(entry.date)}
      </td>
      <td className={cell}>
        {entry.description || f.t("ledger.noDescription")}
        {showCat ? (
          <span className="block text-xs text-muted-foreground">
            {catLabel}
          </span>
        ) : null}
      </td>
      {withAccount ? (
        <td className={cn(cell, "tabular")}>{row.line?.account ?? ""}</td>
      ) : null}
      <td className={num}>
        <Money cents={row.net} signed={minus} />
      </td>
      <td className={num}>
        <Money cents={row.vat} signed={minus} />
        {entry.vatRate ? (
          <span className="block text-xs text-muted-foreground">
            {f.rate(entry.vatRate)}
          </span>
        ) : null}
      </td>
      <td className={cn(num, "font-medium")}>
        <Money cents={row.gross} signed={minus} />
      </td>
    </tr>
  )
}

function TotalRow({
  label,
  totals,
  span,
  signed = false,
  strong = false,
}: {
  label: string
  totals: Totals
  /** Columns before the amounts. */
  span: number
  signed?: boolean
  strong?: boolean
}) {
  return (
    <tr className={cn(strong && "font-semibold")}>
      <th scope="row" colSpan={span} className={cn(cell, "pt-2 text-left")}>
        {label}
      </th>
      <td className={cn(num, "pt-2")}>
        <Money cents={totals.net} signed={signed} />
      </td>
      <td className={cn(num, "pt-2")}>
        <Money cents={totals.vat} signed={signed} />
      </td>
      <td className={cn(num, "pt-2")}>
        <Money cents={totals.gross} signed={signed} />
      </td>
    </tr>
  )
}

function Empty() {
  return <NoEntriesState bodyKey="empty.booksBody" />
}

/** Päiväkirja: the year in date order, by month (§8.4). */
export function JournalView() {
  const f = useFormatters()
  const { entries, catMap, year } = useBookData()
  const book = React.useMemo(
    () => journal(entries, catMap, year),
    [entries, catMap, year]
  )

  return (
    <ReportPage
      title={f.t("ledger.journalTitle", { y: year })}
      subtitle={f.t("ledger.journalSub")}
    >
      {book.months.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <HeadRow withAccount />
            </thead>
            {book.months.map(({ month, rows }) => (
              <tbody key={month}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={7}
                    className="pt-5 pb-1 text-left font-heading font-semibold"
                  >
                    {f.month(month - 1)}
                  </th>
                </tr>
                {rows.map((row) => (
                  <EntryRow
                    key={row.entry.id}
                    row={row}
                    cat={catMap.get(row.entry.catId)}
                    withAccount
                    signed
                  />
                ))}
              </tbody>
            ))}
            <tfoot className="border-t-[3px] border-double border-foreground/40">
              <TotalRow
                label={f.t("ledger.incomeTotal")}
                totals={book.income}
                span={4}
              />
              <TotalRow
                label={f.t("ledger.expenseTotal")}
                totals={book.expense}
                span={4}
                signed
              />
            </tfoot>
          </table>
        </div>
      )}
    </ReportPage>
  )
}

/** Pääkirja: the same entries by account, in chart-of-accounts order. */
export function GeneralLedgerView() {
  const f = useFormatters()
  const { entries, catMap, year } = useBookData()
  const accounts = React.useMemo(
    () => generalLedger(entries, catMap, year),
    [entries, catMap, year]
  )

  return (
    <ReportPage
      title={f.t("ledger.accountsTitle", { y: year })}
      subtitle={f.t("ledger.accountsSub")}
    >
      {accounts.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <HeadRow withAccount={false} />
            </thead>
            {accounts.map(({ line, rows, totals }) => (
              <tbody key={line.key}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={6}
                    className="pt-5 pb-1 text-left font-heading font-semibold"
                  >
                    <span className="tabular mr-2 text-muted-foreground">
                      {line.account}
                    </span>
                    {f.lineName(line)}
                  </th>
                </tr>
                {rows.map((row) => (
                  <EntryRow
                    key={row.entry.id}
                    row={row}
                    cat={catMap.get(row.entry.catId)}
                    withAccount={false}
                    signed={false}
                  />
                ))}
                <TotalRow
                  label={f.t("common.total")}
                  totals={totals}
                  span={3}
                  strong
                />
              </tbody>
            ))}
          </table>
        </div>
      )}
      <ReconciliationSection />
    </ReportPage>
  )
}

/**
 * How the general ledger, by date, becomes the income statement, by payment
 * year (KPL 2:6, §8.4). Shown only when some voucher crosses a year-end.
 */
function ReconciliationSection() {
  const f = useFormatters()
  const { entries, catMap, year } = useBookData()
  const traderType = useBookStore((s) => s.traderType)
  const recon = React.useMemo(
    () => ledgerReconciliation(entries, catMap, year, traderType),
    [entries, catMap, year, traderType]
  )
  if (recon.crossings.length === 0) return null
  const head = "pb-2 pr-3 text-xs font-medium text-muted-foreground last:pr-0"

  return (
    <section className="mt-10" aria-labelledby="recon-title">
      <h3 id="recon-title" className="font-heading text-lg font-semibold">
        {f.t("ledger.reconTitle")}
      </h3>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {f.t("ledger.reconIntro")}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-sheet-edge">
              <th scope="col" className={cn(head, "text-left")}>
                {f.t("ledger.colAccount")}
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                {f.t("ledger.reconLedger")}
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                {f.t("ledger.reconOut")}
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                {f.t("ledger.reconIn", { y: year })}
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                {f.t("ledger.reconStatement")}
              </th>
            </tr>
          </thead>
          <tbody>
            {recon.lines.map((r) => (
              <tr
                key={r.line.key}
                className="border-b border-dashed border-sheet-edge/60"
              >
                <th scope="row" className={cn(cell, "text-left font-normal")}>
                  <span className="tabular mr-2 text-muted-foreground">
                    {r.line.account}
                  </span>
                  {f.lineName(r.line)}
                </th>
                <td className={num}>
                  <Money cents={r.ledger} />
                </td>
                <td className={num}>
                  <Money cents={r.out} />
                </td>
                <td className={num}>
                  <Money cents={r.in} />
                </td>
                <td className={cn(num, "font-semibold")}>
                  <Money cents={r.statement} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-6 font-heading font-semibold">
        {f.t("ledger.reconEntries")}
      </h4>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-sheet-edge">
              <th scope="col" className={cn(head, "w-px text-right")}>
                {f.t("ledger.colVoucher")}
              </th>
              <th scope="col" className={cn(head, "w-px text-left")}>
                {f.t("ledger.colDate")}
              </th>
              <th scope="col" className={cn(head, "w-px text-left")}>
                {f.t("ledger.colPaid")}
              </th>
              <th scope="col" className={cn(head, "text-left")}>
                {f.t("ledger.colDescription")}
              </th>
              <th scope="col" className={cn(head, "w-px text-left")}>
                {f.t("ledger.colAccount")}
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                {f.t("ledger.colEffect")}
              </th>
            </tr>
          </thead>
          <tbody>
            {recon.crossings.map(({ row, paid, direction }) => (
              <tr
                key={row.entry.id}
                className="border-b border-dashed border-sheet-edge/60"
              >
                <td className={cn(num, "tabular text-muted-foreground")}>
                  {row.entry.voucher}
                </td>
                <td className={cn(cell, "tabular whitespace-nowrap")}>
                  {f.date(row.entry.date)}
                </td>
                <td className={cn(cell, "tabular whitespace-nowrap")}>
                  {paid ? f.date(paid) : f.t("ledger.openPill")}
                </td>
                <td className={cell}>
                  {row.entry.description || f.t("ledger.noDescription")}
                </td>
                <td className={cn(cell, "tabular")}>{row.line?.account}</td>
                <td className={num}>
                  <Money cents={row.net} signed={direction === "out"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {f.t("ledger.reconNote")}
      </p>
    </section>
  )
}

/** The kinds of book and material KPL 2:7a asks to have listed, each with how it is kept. */
const BOOK_LIST = [
  ["ledger.bookJournal", "ledger.bookJournalKept"],
  ["ledger.bookGeneral", "ledger.bookGeneralKept"],
  ["ledger.bookVouchers", "ledger.bookVouchersKept"],
  ["ledger.bookReports", "ledger.bookReportsKept"],
] as const

/** Tililuettelo and the list of books and material (KPL 2:2, 2:7a, §8.4). */
export function AccountListView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const exportLang = useBookStore((s) => s.exportLang)
  const rows = React.useMemo(
    () => accountList(entries, cats, year),
    [entries, cats, year]
  )
  const head = "pb-2 pr-3 text-left text-xs font-medium text-muted-foreground"

  return (
    <ReportPage
      title={f.t("ledger.chartTitle", { y: year })}
      subtitle={f.t("ledger.chartSub")}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-sheet-edge">
              <th scope="col" className={cn(head, "w-px")}>
                {f.t("ledger.colAccount")}
              </th>
              <th scope="col" className={head}>
                {f.t("ledger.chartName")}
              </th>
              <th scope="col" className={head}>
                {f.t("ledger.chartContent")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, categories }) => {
              const name = lineName(line, f.lang)
              const own = categories
                .map((c) => f.catName(c))
                .filter((c) => c !== name)
              const content = [groupName(line, f.lang), ...own]
                .filter(Boolean)
                .join(", ")
              return (
                <tr key={line.key} className="border-b border-sheet-edge">
                  <td className={cn(cell, "tabular text-muted-foreground")}>
                    {line.account}
                  </td>
                  <td className={cell}>{name}</td>
                  <td className={cn(cell, "text-muted-foreground")}>
                    {content}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 mb-2 font-heading font-semibold">
        {f.t("ledger.bookListTitle")}
      </h3>
      <dl className="grid gap-3 text-sm">
        {BOOK_LIST.map(([name, kept]) => (
          <div key={name}>
            <dt className="font-medium">{f.t(name)}</dt>
            {/* `d` is the receipt folder, which follows the export language. */}
            <dd className="text-muted-foreground">
              {f.t(kept, { d: receiptFolder(exportLang) })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-muted-foreground">
        {f.t("ledger.closingNote")}
      </p>
    </ReportPage>
  )
}
