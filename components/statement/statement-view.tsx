"use client"

import * as React from "react"
import { PrinterIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The income statement as a printable paper sheet (§8.8): warm paper
 * background, a thin border, a soft shadow, and chrome stripped on print.
 */
export function StatementView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const statement = React.useMemo(
    () => incomeStatement(entries, indexCategories(cats), year),
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
      | { kind: "section"; side: "tulo" | "kulu"; total: number }
      | { kind: "group"; id: string; label: string }
      | { kind: "line"; id: string; tili: number; label: string; net: number }

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
            line.side === "tulo"
              ? statement.revenueTotal
              : statement.deductibleTotal + statement.nonDeductibleTotal,
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
        tili: line.tili,
        label: f.lineName(line),
        net,
      })
    }
    return out
  }, [statement, f])

  return (
    <>
      <div className="print-hidden">
        <PageHeader
          title={f.t("v_tulos")}
          subtitle={f.t("isSub")}
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon data-icon="inline-start" />
              {f.t("print")}
            </Button>
          }
        />
      </div>

      <div className="print-sheet mx-auto max-w-2xl rounded-lg border border-paper-edge bg-paper p-6 text-paper-foreground shadow-sm md:p-8">
        <header className="mb-6">
          <h2 className="font-heading text-xl font-semibold">
            {f.t("v_tulos")}
          </h2>
          <p className="tabular text-sm text-paper-foreground/70">
            1.1.{year} – 31.12.{year}
          </p>
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
                    {row.side === "tulo" ? f.t("revenue") : f.t("bizExp")}
                  </th>
                  <td className="tabular pt-5 pb-1 text-right font-semibold">
                    {f.money(row.total)}
                  </td>
                </tr>
              ) : row.kind === "group" ? (
                <tr key={row.id}>
                  <td
                    colSpan={2}
                    className="pt-3 pb-1 text-xs tracking-wide text-paper-foreground/60"
                  >
                    {row.label}
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-dashed border-paper-edge/60",
                    !row.net && "text-paper-foreground/45"
                  )}
                >
                  <td className="py-1.5">
                    <span className="tabular mr-2 text-xs text-paper-foreground/50">
                      {row.tili}
                    </span>
                    {row.label}
                  </td>
                  <td className="tabular py-1.5 text-right">
                    {row.net ? f.money(row.net) : "–"}
                  </td>
                </tr>
              )
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="pt-5">{f.t("revTotal")}</td>
              <td className="tabular pt-5 text-right">
                {f.money(statement.revenueTotal)}
              </td>
            </tr>
            <tr>
              <td className="pb-2">{f.t("dedTotal")}</td>
              <td className="tabular pb-2 text-right">
                −{f.money(statement.deductibleTotal)}
              </td>
            </tr>
            <tr className="border-t-[3px] border-double border-paper-foreground/40">
              <th scope="row" className="pt-2 text-left font-semibold">
                {statement.resultLine === "358" ? f.t("profit") : f.t("loss")}
              </th>
              {/* Form 5 wants a positive figure on both 358 and 359. */}
              <td className="tabular pt-2 text-right text-base font-semibold">
                {f.money(statement.resultMagnitude)}
              </td>
            </tr>
          </tfoot>
        </table>

        {statement.nonDeductibleTotal ? (
          <p className="mt-6 text-xs text-paper-foreground/60">
            {f.t("isNote", { a: f.money(statement.nonDeductibleTotal) })}
          </p>
        ) : null}

        <p className="mt-6 border-t border-paper-edge pt-3 text-xs text-paper-foreground/60">
          {f.t("lp_foot")}
        </p>
      </div>
    </>
  )
}
