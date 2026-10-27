"use client"

import * as React from "react"
import { ArrowRightIcon } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"
import { APP_ROUTES } from "@/lib/site"

/** Line 358 or 359 so far this year, and how it built up month by month. */
export function ResultWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const { statement, year, through, elapsedMonths } = data
  const monthResult = data.months.result

  const cumulative = React.useMemo(
    () =>
      monthResult
        .slice(0, Math.max(1, elapsedMonths))
        .reduce<{ value: number }[]>((points, r) => {
          const before = points.at(-1)?.value ?? 0
          points.push({ value: before + r / 100 })
          return points
        }, []),
    [monthResult, elapsedMonths]
  )

  const income = statement.revenueTotal
  const margin =
    income > 0
      ? `${((statement.result / income) * 100).toLocaleString(f.lang === "fi" ? "fi-FI" : "en-GB", { maximumFractionDigits: 1 })} %`
      : "–"
  const yearVat = data.months.vat.reduce((a, b) => a + b, 0)
  const last = cumulative.length - 1

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col justify-between gap-4 p-5"
    >
      <div className="grid items-end gap-5 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <p className="text-sm text-muted-foreground">
            {f.t(
              statement.resultLine === "358"
                ? "statement.profit"
                : "statement.loss"
            )}
            {" · "}
            {f.t("overview.range", {
              a: f.date(`${year}-01-01`),
              b: f.date(through),
            })}
          </p>
          <Money
            cents={statement.resultMagnitude}
            className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {f.t("overview.resultFormula", {
              a: f.money(income),
              b: f.money(statement.deductibleTotal),
            })}
          </p>
        </div>

        <div
          className="h-24"
          role="img"
          aria-label={f.t("overview.sparkLabel", {
            a: f.money(Math.round((cumulative[last]?.value ?? 0) * 100)),
          })}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={cumulative}
              margin={{ top: 6, right: 6, bottom: 2, left: 6 }}
            >
              <YAxis
                hide
                domain={[(min: number) => Math.min(0, min), "auto"]}
              />
              <Area
                type="linear"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="var(--primary)"
                fillOpacity={0.12}
                isAnimationActive={false}
                activeDot={false}
                dot={(props: { index?: number; cx?: number; cy?: number }) =>
                  props.index === last ? (
                    <circle
                      key="end"
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="var(--primary)"
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ) : (
                    <g key={props.index} />
                  )
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {f.t("overview.entries")}
            </dt>
            <dd className="tabular font-medium">{data.yearEntries.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {f.t("overview.margin")}
            </dt>
            <dd className="tabular font-medium">{margin}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {f.t("overview.yearVat")}
            </dt>
            <dd className="font-medium">
              <Money
                cents={yearVat}
                tone={yearVat < 0 ? "income" : undefined}
              />
            </dd>
          </div>
        </dl>
        <ButtonLink
          variant="link"
          size="sm"
          className="px-0"
          href={APP_ROUTES.statement}
        >
          {f.t("nav.statement")}
          <ArrowRightIcon data-icon="inline-end" />
        </ButtonLink>
      </div>
    </Panel>
  )
}
