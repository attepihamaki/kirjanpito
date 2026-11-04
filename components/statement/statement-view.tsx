"use client"

import * as React from "react"

import { BusinessLine } from "@/components/common/business-line"
import { Money, ZeroDash } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { Form5FiledToggle } from "@/components/statement/form5-filed-control"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { balancesAt } from "@/lib/domain/open-items"
import { useBookStore } from "@/stores/book-store"

/**
 * The income statement as a printable sheet (§8.8): the --sheet surface, a
 * thin border, a soft shadow, and chrome stripped on print. It uses --sheet
 * rather than the receipt's --paper because it is a document on screen, not a
 * printed slip: it follows the theme and goes dark with it.
 */
export function StatementView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const basis = useTaxBasisEntries()
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const statement = React.useMemo(
    () => incomeStatement(basis, indexCategories(cats), year),
    [basis, cats, year]
  )
  const open = React.useMemo(
    () => balancesAt(entries, indexCategories(cats), `${year}-12-31`),
    [entries, cats, year]
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

  return (
    <>
      <div className="print-sheet mx-auto max-w-2xl rounded-lg border border-sheet-edge bg-sheet p-6 shadow-sm md:p-8">
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
          <Form5FiledToggle compact className="print-hidden" />
        </header>

        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) =>
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
                    <Money cents={row.total} />
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
                  </td>
                  <td className="py-1.5 text-right">
                    {row.net ? <Money cents={row.net} /> : <ZeroDash />}
                  </td>
                </tr>
              )
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="pt-5">{f.t("statement.revenueTotal")}</td>
              <td className="pt-5 text-right">
                <Money cents={statement.revenueTotal} />
              </td>
            </tr>
            <tr>
              <td className="pb-2">{f.t("statement.deductibleTotal")}</td>
              <td className="pb-2 text-right">
                <Money cents={statement.deductibleTotal} signed />
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
                <Money cents={statement.resultMagnitude} />
              </td>
            </tr>
          </tfoot>
        </table>

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
          {f.t("statement.cashNote", {
            d: f.date(`${year}-12-31`),
            r: f.money(open.receivables),
            p: f.money(open.payables),
          })}
        </p>

        <p className="mt-6 border-t border-sheet-edge pt-3 text-xs text-muted-foreground">
          {f.t("landing.footer")}
        </p>
      </div>
    </>
  )
}
