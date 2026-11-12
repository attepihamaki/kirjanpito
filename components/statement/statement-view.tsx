"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import {
  NoEntriesState,
  useYearIsEmpty,
} from "@/components/common/no-entries-state"
import { BusinessLine } from "@/components/common/business-line"
import { FigureLink } from "@/components/common/figure-link"
import { HelpHint } from "@/components/common/help-hint"
import { Money, ZeroDash } from "@/components/common/money"
import { Pill } from "@/components/common/pill"
import { useFormatters } from "@/components/lang-provider"
import { CAT_354, CAT_CAR } from "@/components/statement/deduction-dialog"
import { Panel } from "@/components/common/panel"
import { useShownFeatures } from "@/hooks/use-shown-features"
import { yearOf } from "@/lib/domain/dates"
import { form5Due } from "@/lib/domain/tax-return-deadline"
import { Checkbox } from "@/components/ui/checkbox"
import { VatYearSection } from "@/components/statement/vat-year-section"
import { YearEndButton } from "@/components/statement/year-end-button"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
} from "@/lib/domain/form5-balance"
import { lineHelp } from "@/lib/domain/field-help"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useStatementDrill } from "@/hooks/use-figure-drill"
import { useLossInput } from "@/hooks/use-loss-input"
import { useToday } from "@/hooks/use-today"
import { useStatementOptions, useTaxBasisEntries } from "@/hooks/use-tax-basis"
import {
  DEDUCTIBLE,
  REVENUE,
  lineSelection,
  sideSelection,
} from "@/lib/domain/figure-vouchers"
import { balancesAt } from "@/lib/domain/open-items"
import { lossLedger } from "@/lib/domain/tax-loss"
import { STATEMENT_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The income statement as a printable sheet (§8.8): the --sheet surface, a
 * thin border, a soft shadow, and chrome stripped on print. It uses --sheet
 * rather than the receipt's --paper because it is a document on screen, not a
 * printed slip: it follows the theme and goes dark with it.
 */
export function StatementView() {
  const f = useFormatters()
  const yearEmpty = useYearIsEmpty()
  const filed = useBookStore((s) => !!s.form5Filed[String(s.year)])
  const entries = useBookStore((s) => s.entries)
  const basis = useTaxBasisEntries()
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const traderType = useBookStore((s) => s.traderType)
  const today = useToday()

  const options = useStatementOptions()
  const { selectionDrill, resultDrill, form5Drill } = useStatementDrill()
  const statement = React.useMemo(
    () => incomeStatement(basis, indexCategories(cats), year, options),
    [basis, cats, year, options]
  )
  const yearEnd = useBookStore((s) => s.yearEnd[year]) ?? EMPTY_YEAR_END
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const balanceSections = React.useMemo(
    () =>
      form5BalanceSections(
        form5Balance({
          entries,
          cats: indexCategories(cats),
          year,
          yearEnd,
          assetOpening,
          loanOpening,
        }),
        yearEnd
      ),
    [entries, cats, year, yearEnd, assetOpening, loanOpening]
  )
  const open = React.useMemo(
    () => balancesAt(entries, indexCategories(cats), `${year}-12-31`),
    [entries, cats, year]
  )
  const lossInput = useLossInput()
  const lossDeducted = React.useMemo(
    () =>
      lossLedger(lossInput, year).years.find((y) => y.year === year)
        ?.deducted ?? 0,
    [lossInput, year]
  )

  /**
   * Flatten the lines into display rows, inserting a section heading when the
   * side changes and a group heading when the group does. Computed up front
   * rather than by mutating counters inside the JSX map, which would be a
   * render-time side effect.
   */
  const rows = React.useMemo(() => {
    type Row =
      | { kind: "section"; side: "income" | "expense"; total: number }
      | { kind: "group"; id: string; label: string }
      | {
          kind: "line"
          id: string
          account: number
          label: string
          grouped: boolean
          net: number
        }

    const out: Row[] = []
    let side: string | null = null
    let group: string | null = null

    for (const { line, net } of statement.lines) {
      if (line.side !== side) {
        side = line.side
        group = null
        out.push({
          kind: "section",
          side: line.side,
          total:
            line.side === "income"
              ? statement.incomeTotal
              : statement.expenseTotal,
        })
      }
      const groupLabel = f.groupName(line)
      if (groupLabel && groupLabel !== group) {
        group = groupLabel
        out.push({ kind: "group", id: `g-${line.key}`, label: groupLabel })
      }
      out.push({
        kind: "line",
        id: line.key,
        account: line.account,
        label: f.lineName(line),
        grouped: !!groupLabel,
        net,
      })
    }
    return out
  }, [statement, f])

  /*
   * A line with no amount is left out until the user asks for every line of
   * the form, and a group heading goes with its last line (§8.8).
   */
  const [showEmpty, setShowEmpty] = React.useState(false)
  const emptyCount =
    rows.filter((r) => r.kind === "line" && !r.net).length +
    balanceSections.reduce(
      (n, s) => n + s.rows.filter((r) => r.kind !== "group" && !r.value).length,
      0
    )
  const shownRows = React.useMemo(() => {
    if (showEmpty) return rows
    const kept = rows.filter((r) => r.kind !== "line" || r.net)
    return kept.filter(
      (r, i) => r.kind !== "group" || kept[i + 1]?.kind === "line"
    )
  }, [rows, showEmpty])
  const shownSections = React.useMemo(
    () =>
      showEmpty
        ? balanceSections
        : balanceSections
            .map((section) => {
              const kept = section.rows.filter(
                (r) => r.kind === "group" || r.value
              )
              return {
                ...section,
                rows: kept.filter(
                  (r, i) =>
                    r.kind !== "group" ||
                    (kept[i + 1] && kept[i + 1].kind !== "group")
                ),
              }
            })
            .filter((section) => section.rows.length > 0),
    [balanceSections, showEmpty]
  )
  const running = today <= `${year}-12-31`
  const resultLabel =
    statement.resultLine === "358"
      ? f.t("statement.profit")
      : f.t("statement.loss")

  /* A year already marked as filed keeps its statement, even with no entries. */
  if (yearEmpty && !filed) {
    return <NoEntriesState bodyKey="empty.statementBody" />
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,42rem)_18rem]">
      <div className="print-sheet rounded-lg border border-sheet-edge bg-sheet p-6 shadow-sm md:p-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              {f.t("nav.statement")}
            </h2>
            <BusinessLine />
            <p className="tabular text-sm text-muted-foreground">
              {f.t("overview.range", {
                a: f.date(`${year}-01-01`),
                b: f.date(`${year}-12-31`),
              })}
            </p>
          </div>
          {running && !filed ? (
            <Pill className="print-hidden">{f.t("statement.yearRunning")}</Pill>
          ) : (
            <YearEndButton className="print-hidden" />
          )}
        </header>

        {/* The answer first: the result the lines below add up to. */}
        <div className="mb-2 border-y border-sheet-edge py-4">
          <p className="text-sm text-muted-foreground">{resultLabel}</p>
          <Money
            cents={statement.resultMagnitude}
            className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {f.t("statement.resultFormula", {
              a: f.money(statement.revenueTotal),
              b: f.money(statement.deductibleTotal),
            })}
          </p>
        </div>

        {emptyCount ? (
          <label className="print-hidden flex min-h-9 items-center justify-end gap-2 text-sm">
            <Checkbox
              checked={showEmpty}
              onCheckedChange={(checked) => setShowEmpty(checked === true)}
            />
            {f.t("statement.showEmpty", { n: emptyCount })}
          </label>
        ) : null}

        <table className="w-full text-sm">
          <tbody>
            {shownRows.map((row) =>
              row.kind === "section" ? (
                <tr key={`sec-${row.side}`}>
                  <th
                    scope="colgroup"
                    className="pt-5 pb-1 text-left font-heading text-[0.95rem] font-semibold"
                  >
                    {row.side === "income"
                      ? f.t("statement.revenue")
                      : f.t("statement.expenses")}
                  </th>
                  <td className="pt-5 pb-1 text-right font-semibold">
                    <FigureLink
                      label={
                        row.side === "income"
                          ? f.t("statement.revenue")
                          : f.t("statement.expenses")
                      }
                      onOpen={selectionDrill(
                        row.side === "income"
                          ? f.t("statement.revenue")
                          : f.t("statement.expenses"),
                        row.total,
                        sideSelection(row.side)
                      )}
                    >
                      <Money cents={row.total} />
                    </FigureLink>
                  </td>
                </tr>
              ) : row.kind === "group" ? (
                <tr key={row.id}>
                  <td
                    colSpan={2}
                    className="pt-3 pb-1 text-xs tracking-wide text-muted-foreground"
                  >
                    {row.label}
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-dashed border-sheet-edge/60",
                    /*
                     * Greyed, not faded out (§6.3): --muted-foreground
                     * reads as clearly secondary against --foreground and
                     * still clears AA, which an opacity step would not.
                     */
                    !row.net && "text-muted-foreground"
                  )}
                >
                  {/* The indent ends a group, so a line with none does not read as part of it. */}
                  <td className={cn("py-1.5", row.grouped && "pl-3")}>
                    <span className="tabular mr-2 text-xs text-muted-foreground">
                      {row.account}
                    </span>
                    {row.label}
                    <span className="ml-1 inline-flex align-middle">
                      <HelpHint topic={lineHelp(row.account)} />
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    {row.net ? (
                      <FigureLink
                        label={`${row.account} ${row.label}`}
                        onOpen={selectionDrill(
                          `${row.account} ${row.label}`,
                          row.net,
                          lineSelection(row.id)
                        )}
                      >
                        <Money cents={row.net} />
                      </FigureLink>
                    ) : (
                      <ZeroDash />
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="pt-5">{f.t("statement.revenueTotal")}</td>
              <td className="pt-5 text-right">
                <FigureLink
                  label={f.t("statement.revenueTotal")}
                  onOpen={selectionDrill(
                    f.t("statement.revenueTotal"),
                    statement.revenueTotal,
                    REVENUE
                  )}
                >
                  <Money cents={statement.revenueTotal} />
                </FigureLink>
              </td>
            </tr>
            <tr>
              <td className="pb-2">{f.t("statement.deductibleTotal")}</td>
              <td className="pb-2 text-right">
                <FigureLink
                  label={f.t("statement.deductibleTotal")}
                  onOpen={selectionDrill(
                    f.t("statement.deductibleTotal"),
                    statement.deductibleTotal,
                    DEDUCTIBLE
                  )}
                >
                  <Money cents={statement.deductibleTotal} signed />
                </FigureLink>
              </td>
            </tr>
            <tr className="border-t-[3px] border-double border-foreground/40">
              <th scope="row" className="pt-2 text-left font-semibold">
                {statement.resultLine === "358"
                  ? f.t("statement.profit")
                  : f.t("statement.loss")}
              </th>
              {/* Form 5 wants a positive figure on both 358 and 359. */}
              <td className="pt-2 text-right text-base font-semibold">
                <FigureLink
                  label={
                    statement.resultLine === "358"
                      ? f.t("statement.profit")
                      : f.t("statement.loss")
                  }
                  onOpen={resultDrill(
                    statement.resultLine === "358"
                      ? f.t("statement.profit")
                      : f.t("statement.loss"),
                    statement.resultMagnitude,
                    statement.resultLine === "359"
                  )}
                >
                  <Money cents={statement.resultMagnitude} />
                </FigureLink>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* The assets, liabilities and wages Form 5 asks for beside the result (§8.8). */}
        {shownSections.map((section) => (
          <table key={section.title.fi} className="mt-6 w-full text-sm">
            <tbody>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={2}
                  className="pb-1 text-left font-heading text-[0.95rem] font-semibold"
                >
                  {section.title[f.lang]}
                </th>
              </tr>
              {section.rows.map((row) =>
                row.kind === "group" ? (
                  <tr key={row.label.fi}>
                    <td
                      colSpan={2}
                      className="pt-3 pb-1 text-xs tracking-wide text-muted-foreground"
                    >
                      {row.label[f.lang]}
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={row.code}
                    className={cn(
                      "border-b border-dashed border-sheet-edge/60",
                      !row.value && "text-muted-foreground",
                      row.total && "font-semibold"
                    )}
                  >
                    <td className="py-1.5 pl-3">
                      <span className="tabular mr-2 text-xs text-muted-foreground">
                        {row.code}
                      </span>
                      {row.label[f.lang]}
                    </td>
                    <td className="py-1.5 text-right">
                      {row.value ? (
                        <FigureLink
                          label={`${row.code} ${row.label[f.lang]}`}
                          onOpen={form5Drill(row)}
                        >
                          <Money cents={row.value} />
                        </FigureLink>
                      ) : (
                        <ZeroDash />
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        ))}

        {statement.resultLine === "359" ? (
          <p className="mt-6 text-xs text-muted-foreground">
            {f.t("statement.lossNote", {
              a: f.money(statement.resultMagnitude),
            })}
          </p>
        ) : null}

        {statement.resultLine === "358" && lossDeducted > 0 ? (
          <p className="mt-6 text-xs text-muted-foreground">
            {f.t("statement.earlierLossNote", {
              a: f.money(lossDeducted),
              b: f.money(statement.resultMagnitude - lossDeducted),
            })}{" "}
            <Link
              href={STATEMENT_ROUTES.losses}
              className="underline underline-offset-2"
            >
              {f.t("losses.tab")}
            </Link>
          </p>
        ) : null}

        {statement.taxExemptTotal ? (
          <p className="mt-6 text-xs text-muted-foreground">
            {f.t("statement.exemptNote", {
              a: f.money(statement.taxExemptTotal),
            })}
          </p>
        ) : null}

        {statement.dividendTotal ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {f.t("statement.dividendNote", {
              a: f.money(statement.dividendTotal),
              b: f.money(statement.dividendTaxable),
            })}
          </p>
        ) : null}

        {statement.surplusTotal ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {f.t("statement.surplusNote", {
              a: f.money(statement.surplusTotal),
              b: f.money(statement.surplusTaxable),
            })}
          </p>
        ) : null}

        {statement.depreciationExcess > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {f.t("statement.depreciationNote", {
              a: f.money(statement.depreciationExcess),
            })}
          </p>
        ) : null}

        {statement.entertainmentTotal ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {f.t("statement.entertainmentNote", {
              a: f.money(statement.entertainmentTotal),
              b: f.money(statement.entertainmentDeductible),
            })}
          </p>
        ) : null}

        {statement.nonDeductibleTotal ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {f.t("statement.note", {
              a: f.money(statement.nonDeductibleTotal),
            })}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-muted-foreground">
          {f.t(
            traderType === "business"
              ? "statement.accrualNote"
              : "statement.cashNote",
            {
              d: f.date(`${year}-12-31`),
              r: f.money(open.receivables),
              p: f.money(open.payables),
            }
          )}
        </p>

        <VatYearSection />

        <p className="mt-6 border-t border-sheet-edge pt-3 text-xs text-muted-foreground">
          {f.t("landing.footer")}
        </p>
      </div>
      <StatementAside running={running && !filed} />
    </div>
  )
}

/**
 * Beside the sheet (§8.8): when the return is due and what the book does not
 * hold yet. Off paper, since the sheet is the document.
 */
function StatementAside({ running }: { running: boolean }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const yearEnd = useBookStore((s) => s.yearEnd[year])
  const shown = useShownFeatures()
  const due = form5Due(year)
  const booked = (catId: string) =>
    entries.some((e) => e.catId === catId && yearOf(e.date) === year)

  const todo = [
    shown.has("car") && !booked(CAT_CAR)
      ? {
          label: f.t("deductions.mileageTitle"),
          verb: f.t("statement.asideCalc"),
          href: STATEMENT_ROUTES.deductions,
        }
      : null,
    shown.has("homeOffice") && !booked(CAT_354)
      ? {
          label: f.t("deductions.homeTitle"),
          verb: f.t("statement.asideCalc"),
          href: STATEMENT_ROUTES.deductions,
        }
      : null,
    !yearEnd
      ? {
          label: f.t("statement.asideStock", { d: "31.12." }),
          verb: f.t("statement.asideEnter"),
          href: STATEMENT_ROUTES.inventory,
        }
      : null,
  ].filter((x) => x !== null)

  return (
    <aside className="print-hidden flex flex-col gap-4">
      {running ? (
        <Panel
          title={f.t("statement.asideReturn")}
          bodyClassName="flex flex-col gap-2 p-4 text-sm"
        >
          <p className="text-muted-foreground">
            {f.t("statement.asideReturnBody", { y: year + 1 })}
          </p>
          {due ? <p>{f.t("statement.asideDue", { d: f.date(due) })}</p> : null}
        </Panel>
      ) : null}
      {todo.length ? (
        <Panel
          title={f.t("statement.asideTodo")}
          bodyClassName="flex flex-col p-2"
        >
          {todo.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="focus-ring flex min-h-9 items-center justify-between gap-3 rounded-md px-2 text-sm text-primary hover:bg-muted"
            >
              <span>{item.label}</span>
              <span className="inline-flex items-center gap-1">
                {item.verb}
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </span>
            </Link>
          ))}
        </Panel>
      ) : null}
    </aside>
  )
}
