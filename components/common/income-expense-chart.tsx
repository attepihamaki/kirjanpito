"use client"

import { useRouter } from "next/navigation"
import { useId } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useFormatters } from "@/components/lang-provider"
import { MINUS } from "@/lib/domain/money"
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
  const clearFilters = useBookStore((s) => s.clearLedgerFilters)

  const hatchId = `hatch-${useId().replace(/:/g, "")}`

  const rows = summary.months
  const data: MonthDatum[] = rows.map((r, i) => ({
    month: f.month(i, true),
    m: i + 1,
    income: r.incomeNet / 100,
    expense: -r.expenseNet / 100,
  }))

  // Only the largest bar of each side carries its amount, so twelve months
  // fit a phone width. A label is matched by value: its index counts only the
  // bars that were drawn, and a zero month has none.
  const maxIncome = Math.max(...data.map((d) => d.income))
  const maxExpense = Math.max(...data.map((d) => -d.expense))

  /*
   * The axis runs 12 % of its span past the tallest bar on each side, so an
   * amount never lands on the month names under the plot or on the legend
   * above it. The ticks stay on round steps inside that range.
   */
  const span = maxIncome + maxExpense || 1
  const step = niceStep(span / 4)
  const top = maxIncome + span * 0.12
  const bottom = maxExpense ? -(maxExpense + span * 0.12) : 0
  const ticks: number[] = []
  for (let t = Math.ceil(bottom / step) * step; t <= top; t += step) {
    ticks.push(t)
  }

  // Old filters left in place could hide the month's rows.
  const openMonth = (m: number) => {
    clearFilters()
    setMonth(m)
    router.push(APP_ROUTES.ledger)
  }

  return (
    <div className={cn("flex h-64 w-full flex-col", className)}>
      {/* Outside the plot, so a tall bar or its amount never runs under it. */}
      <div
        className="flex shrink-0 justify-end gap-4 pr-2 text-xs text-muted-foreground"
        aria-hidden
      >
        <span className="inline-flex items-center gap-1.5">
          <Swatch kind="income" />
          {f.t("common.incomePlural")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Swatch kind="expense" />
          {f.t("common.expensePlural")}
        </span>
      </div>
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="min-h-0 flex-1"
      >
        <BarChart
          data={data}
          stackOffset="sign"
          margin={{ left: 4, right: 4, top: 20, bottom: 4 }}
        >
          <defs>
            <pattern
              id={hatchId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--expense-subtle)" />
              <rect width="2.4" height="6" fill="var(--expense)" />
            </pattern>
          </defs>
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
            domain={[bottom, top]}
            ticks={ticks}
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
          >
            <LabelList
              dataKey="income"
              content={(p) =>
                Number(p.value) === maxIncome ? (
                  <BarLabel
                    {...p}
                    text={`+${wholeEuros.format(maxIncome)}`}
                    above
                  />
                ) : null
              }
            />
          </Bar>
          <Bar
            dataKey="expense"
            stackId="month"
            fill={`url(#${hatchId})`}
            stroke="var(--expense)"
            strokeWidth={1.2}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            className="cursor-pointer"
            onClick={(_, i) => openMonth(i + 1)}
          >
            <LabelList
              dataKey="expense"
              content={(p) =>
                -Number(p.value) === maxExpense ? (
                  <BarLabel
                    {...p}
                    text={`${MINUS}${wholeEuros.format(maxExpense)}`}
                    above={false}
                  />
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** The round number at or above `raw`: 1, 2 or 5 times a power of ten. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power
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
        kind="income"
        label={f.t("common.incomePlural")}
        value={f.money(income)}
      />
      <LegendItem
        kind="expense"
        label={f.t("common.expensePlural")}
        value={f.money(expenses)}
      />
    </div>
  )
}

/** Solid for income, hatched for expenses, so the series differ without colour. */
function Swatch({ kind }: { kind: "income" | "expense" }) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-xs",
        kind === "income"
          ? "bg-income"
          : "border border-expense bg-[repeating-linear-gradient(135deg,var(--expense)_0_1.5px,var(--expense-subtle)_1.5px_4px)]"
      )}
      aria-hidden
    />
  )
}

/** The amount of a month's bar, placed outside the bar's data end. */
function BarLabel({
  x,
  y,
  width,
  height,
  text,
  above,
}: {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  text: string
  above: boolean
}) {
  const bx = Number(x)
  const by = Number(y)
  const bw = Number(width)
  const bh = Number(height)
  const edge = above ? Math.min(by, by + bh) - 5 : Math.max(by, by + bh) + 13
  return (
    <text
      x={bx + bw / 2}
      y={edge}
      textAnchor="middle"
      fontSize={11}
      className="tabular"
      fill="var(--foreground)"
    >
      {text}
    </text>
  )
}

function LegendItem({
  kind,
  label,
  value,
}: {
  kind: "income" | "expense"
  label: string
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <Swatch kind={kind} />
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
