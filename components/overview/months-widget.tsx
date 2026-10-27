"use client"

import {
  IncomeExpenseChart,
  IncomeExpenseLegend,
} from "@/components/common/income-expense-chart"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"

/** The year by month on the shared chart, with four plain figures under it. */
export function MonthsWidget() {
  const f = useFormatters()
  const data = useOverviewData()

  const rows = data.summary.months
  const totals = data.summary.totals
  const elapsed = Math.max(1, data.elapsedMonths)
  const results = data.months.result
  const best = results.reduce((top, r, i) => (r > results[top] ? i : top), 0)
  const active = rows.filter((r) => r.incomeNet || r.expenseNet).length

  return (
    <Panel
      title={f.t("overview.widgetMonths")}
      description={f.t("overview.monthsHint")}
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

      <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm @xl:grid-cols-4">
        <Stat
          label={f.t("overview.bestMonth")}
          value={`${f.month(best)} · ${f.money(results[best])}`}
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
        <Stat
          label={f.t("overview.activeMonths")}
          value={`${active} / ${Math.max(data.elapsedMonths, active)}`}
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
