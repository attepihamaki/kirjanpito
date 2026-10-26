"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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
import { salesTotal, summary, type MonthRow } from "@/lib/domain/summary"
import { indexCategories, type Bucket } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const BUCKET_KEYS: Record<
  Bucket,
  | "summary.bucketPurchases"
  | "summary.bucketPersonnel"
  | "summary.bucketDepreciation"
  | "summary.bucketOtherDeductible"
  | "summary.bucketFinancial"
  | "summary.bucketProvisions"
  | "summary.bucketNondeductible"
> = {
  purchases: "summary.bucketPurchases",
  personnel: "summary.bucketPersonnel",
  depreciation: "summary.bucketDepreciation",
  otherDeductible: "summary.bucketOtherDeductible",
  financial: "summary.bucketFinancial",
  provisions: "summary.bucketProvisions",
  nondeductible: "summary.bucketNondeductible",
}

export function SummaryView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const data = React.useMemo(
    () => summary(entries, indexCategories(cats), year),
    [entries, cats, year]
  )

  const chartData = data.months.map((m, i) => ({
    month: f.month(i, true),
    income: m.incomeNet / 100,
    expenses: m.expenseNet / 100,
  }))

  return (
    <>
      <PageHeader
        title={f.t("nav.summary")}
        subtitle={f.t("summary.subtitle", { y: year })}
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-medium">{f.t("summary.chartLabel")}</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(value: number) => f.money(value * 100)}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    f.money(Math.round(Number(value) * 100)),
                    name === "income"
                      ? f.t("common.incomePlural")
                      : f.t("common.expensePlural"),
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "income"
                      ? `${f.t("common.incomePlural")} · ${f.money(data.totals.incomeNet)}`
                      : `${f.t("common.expensePlural")} · ${f.money(data.totals.expenseNet)}`
                  }
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="income"
                  fill="var(--income)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--expense)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

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
    <Panel title={title} bodyClassName="overflow-x-auto">
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
