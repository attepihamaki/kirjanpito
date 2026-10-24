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
  "b_ostot" | "b_henk" | "b_poist" | "b_muut" | "b_rah" | "b_var" | "b_vk"
> = {
  ostot: "b_ostot",
  henk: "b_henk",
  poist: "b_poist",
  muut: "b_muut",
  rah: "b_rah",
  var: "b_var",
  vk: "b_vk",
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
        title={f.t("v_yhteenveto")}
        subtitle={f.t("sumSub", { y: year })}
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">{f.t("chartLabel")}</h2>
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
                    name === "income" ? f.t("tulot") : f.t("kulut"),
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "income"
                      ? `${f.t("tulot")} · ${f.money(data.totals.incomeNet)}`
                      : `${f.t("kulut")} · ${f.money(data.totals.expenseNet)}`
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
          title={f.t("sales")}
          columns={[
            { key: "total", label: f.t("salesTot"), get: salesTotal },
            ...data.rateColumns.map((rate) => ({
              key: `r${rate}`,
              label: f.t("s_fi", { r: f.rate(rate) }),
              get: (row: MonthRow) => row.salesByRate.get(rate) ?? 0,
            })),
            { key: "eu", label: f.t("s_eu"), get: (r: MonthRow) => r.eu },
            {
              key: "other",
              label: f.t("s_other"),
              get: (r: MonthRow) => r.muutmaat,
            },
            {
              key: "rc",
              label: f.t("s_rc"),
              get: (r: MonthRow) => r.kaanteinen,
            },
            {
              key: "otherInc",
              label: f.t("otherInc"),
              get: (r: MonthRow) => r.otherIncome,
            },
          ]}
          rows={data.months}
          totals={data.totals}
        />

        <WideTable
          title={f.t("expenses")}
          columns={[
            {
              key: "total",
              label: f.t("expTot"),
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
    <section className="rounded-lg border">
      <h2 className="border-b px-4 py-3 font-medium">{title}</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(sticky, "min-w-20")}>
                {f.t("mo")}
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
                {f.t("tot")}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.key} className="text-right font-medium">
                  <Money cents={c.get(totals)} />
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  )
}
