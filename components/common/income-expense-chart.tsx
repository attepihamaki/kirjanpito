"use client"

import { useRouter } from "next/navigation"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useFormatters } from "@/components/lang-provider"
import type { MonthFigures, Summary } from "@/lib/domain/summary"
import type { Cents } from "@/lib/domain/types"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const wholeEuros = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 })

interface MonthDatum {
  month: string
  /** The month, 1 to 12. */
  m: number
  income: number
  /** Negative, so the bar hangs below the axis. */
  expense: number
}

/**
 * Net income above the axis and net expenses below it, by month, on one
 * axis: the overview's month widget and the Yhteenveto chart (§6.4, §8.12).
 *
 * Mirrored on purpose. The income green and the expense red are hard to tell
 * apart side by side for a red-green colour-blind reader; position gives the
 * two series a difference every reader sees. A click opens the ledger on the
 * month.
 */
export function IncomeExpenseChart({
  summary,
  figures,
  className,
}: {
  summary: Summary
  figures: MonthFigures
  className?: string
}) {
  const f = useFormatters()
  const router = useRouter()
  const setMonth = useBookStore((s) => s.setMonth)

  const rows = summary.months
  const data: MonthDatum[] = rows.map((r, i) => ({
    month: f.month(i, true),
    m: i + 1,
    income: r.incomeNet / 100,
    expense: -r.expenseNet / 100,
  }))

  const openMonth = (m: number) => {
    setMonth(m)
    router.push(APP_ROUTES.ledger)
  }

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          stackOffset="sign"
          margin={{ left: 4, right: 4, top: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
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
            width={56}
            fontSize={12}
            stroke="var(--muted-foreground)"
            tickFormatter={(v: number) => wholeEuros.format(v)}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as MonthDatum | undefined
              if (!active || !d) return null
              const row = rows[d.m - 1]
              return (
                <div className="min-w-48 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                  <p className="mb-1.5 font-medium">
                    {f.month(d.m - 1)} {summary.year}
                  </p>
                  <TipRow
                    label={f.t("common.incomePlural")}
                    value={f.money(row.incomeNet)}
                  />
                  <TipRow
                    label={f.t("common.expensePlural")}
                    value={f.money(row.expenseNet)}
                  />
                  <TipRow
                    label={f.t("common.vat")}
                    value={f.money(figures.vat[d.m - 1])}
                  />
                  <div className="mt-1.5 border-t pt-1.5 font-medium">
                    <TipRow
                      label={f.t("common.result")}
                      value={f.money(figures.result[d.m - 1])}
                    />
                  </div>
                </div>
              )
            }}
          />
          <Bar
            dataKey="income"
            stackId="month"
            fill="var(--income)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            className="cursor-pointer"
            onClick={(_, i) => openMonth(i + 1)}
          />
          <Bar
            dataKey="expense"
            stackId="month"
            fill="var(--expense)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            className="cursor-pointer"
            onClick={(_, i) => openMonth(i + 1)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** The two series with their year totals, for a panel's heading row. */
export function IncomeExpenseLegend({
  income,
  expenses,
  className,
}: {
  income: Cents
  expenses: Cents
  className?: string
}) {
  const f = useFormatters()
  return (
    <div className={cn("flex flex-wrap gap-4 text-sm", className)}>
      <LegendItem
        swatch="bg-income"
        label={f.t("common.incomePlural")}
        value={f.money(income)}
      />
      <LegendItem
        swatch="bg-expense"
        label={f.t("common.expensePlural")}
        value={f.money(expenses)}
      />
    </div>
  )
}

function LegendItem({
  swatch,
  label,
  value,
}: {
  swatch: string
  label: string
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className={cn("size-2.5 rounded-xs", swatch)} aria-hidden />
      {label}
      <span className="tabular font-medium text-foreground">{value}</span>
    </span>
  )
}

function TipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}
