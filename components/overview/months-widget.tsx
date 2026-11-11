"use client"

import {
  IncomeExpenseChart,
  IncomeExpenseLegend,
} from "@/components/common/income-expense-chart"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"

/** The year by month on the shared chart, with three plain figures under it. A click on a month opens it in the ledger. */
export function MonthsWidget() {
  const f = useFormatters()
  const data = useOverviewData()

  const totals = data.summary.totals
  const elapsed = Math.max(1, data.elapsedMonths)
  const results = data.months.result
  const best = results.reduce((top, r, i) => (r > results[top] ? i : top), 0)

  return (
    <Panel
      title={f.t("overview.widgetMonths")}
      actions={
        <IncomeExpenseLegend
          income={totals.incomeNet}
          expenses={totals.expenseNet}
          className="ml-auto"
        />
      }
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col justify-between gap-5 p-4"
    >
      <IncomeExpenseChart summary={data.summary} figures={data.months} />

      <dl className="grid grid-cols-1 gap-3 border-t pt-4 text-sm @md:grid-cols-3">
        <Stat
          label={f.t("overview.bestMonth")}
          value={
            data.yearEntries.length
              ? `${f.month(best)} · ${f.money(results[best])}`
              : "–"
          }
        />
        <Stat
          label={f.t("overview.avgIncome")}
          value={f.t("overview.perMonth", {
            a: f.money(Math.round(totals.incomeNet / elapsed)),
          })}
        />
        <Stat
          label={f.t("overview.avgExpenses")}
          value={f.t("overview.perMonth", {
            a: f.money(Math.round(totals.expenseNet / elapsed)),
          })}
        />
      </dl>
    </Panel>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular truncate font-medium">{value}</dd>
    </div>
  )
}
