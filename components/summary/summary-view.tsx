"use client"

import * as React from "react"

import {
  IncomeExpenseChart,
  IncomeExpenseLegend,
} from "@/components/common/income-expense-chart"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Money } from "@/components/common/money"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatters } from "@/components/lang-provider"
import { BUCKETS } from "@/lib/domain/accounts"
import {
  monthFigures,
  salesTotal,
  summary,
  type MonthRow,
} from "@/lib/domain/summary"
import { indexCategories } from "@/lib/domain/types"
import { BUCKET_KEYS } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

export function SummaryView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const { data, figures } = React.useMemo(() => {
    const catMap = indexCategories(cats)
    return {
      data: summary(entries, catMap, year),
      figures: monthFigures(entries, catMap, year),
    }
  }, [entries, cats, year])

  return (
    <>
      <PageHeader
        title={f.t("nav.summary")}
        subtitle={f.t("summary.subtitle", { y: year })}
      />

      <div className="flex flex-col gap-6">
        <Panel
          title={f.t("summary.chartLabel")}
          actions={
            <IncomeExpenseLegend
              income={data.totals.incomeNet}
              expenses={data.totals.expenseNet}
              className="ml-auto"
            />
          }
          bodyClassName="p-4"
        >
          <IncomeExpenseChart summary={data} figures={figures} />
        </Panel>

        <WideTable
          title={f.t("summary.sales")}
          columns={[
            { key: "total", label: f.t("summary.salesTotal"), get: salesTotal },
            ...data.rateColumns.map((rate) => ({
              key: `r${rate}`,
              label: f.t("summary.finland", { r: f.rate(rate) }),
              get: (row: MonthRow) => row.salesByRate.get(rate) ?? 0,
            })),
            { key: "eu", label: f.t("summary.eu"), get: (r: MonthRow) => r.eu },
            {
              key: "other",
              label: f.t("summary.otherCountries"),
              get: (r: MonthRow) => r.nonEu,
            },
            {
              key: "rc",
              label: f.t("summary.reverseCharge"),
              get: (r: MonthRow) => r.reverse,
            },
            {
              key: "otherInc",
              label: f.t("summary.otherIncome"),
              get: (r: MonthRow) => r.otherIncome,
            },
          ]}
          rows={data.months}
          totals={data.totals}
        />

        <WideTable
          title={f.t("summary.expenses")}
          columns={[
            {
              key: "total",
              label: f.t("summary.expenseTotal"),
              get: (r: MonthRow) => r.expenseNet,
            },
            ...BUCKETS.map((bucket) => ({
              key: bucket,
              label: f.t(BUCKET_KEYS[bucket]),
              get: (r: MonthRow) => r.byBucket[bucket],
            })),
          ]}
          rows={data.months}
          totals={data.totals}
        />
      </div>
    </>
  )
}

interface Column {
  key: string
  label: string
  get: (row: MonthRow) => number
}

/** Wide tables scroll horizontally with a sticky first column (§8.9). */
function WideTable({
  title,
  columns,
  rows,
  totals,
}: {
  title: string
  columns: Column[]
  rows: readonly MonthRow[]
  totals: MonthRow
}) {
  const f = useFormatters()

  const sticky = "sticky left-0 z-10 bg-background [tr:hover_&]:bg-muted"

  return (
    // The scroll container the sticky column anchors to is `Table`'s own.
    <Panel title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(sticky, "min-w-20")}>
              {f.t("summary.month")}
            </TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className="text-right whitespace-nowrap">
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.month}>
              <TableCell className={cn(sticky, "font-medium")}>
                {f.month(i, true)}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.key} className="text-right">
                  <Money cents={c.get(row)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className={cn(sticky, "font-medium")}>
              {f.t("summary.total")}
            </TableCell>
            {columns.map((c) => (
              <TableCell key={c.key} className="text-right font-medium">
                <Money cents={c.get(totals)} />
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  )
}
