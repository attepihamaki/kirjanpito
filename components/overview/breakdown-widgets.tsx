"use client"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"
import { BUCKETS } from "@/lib/domain/accounts"
import { salesTotal } from "@/lib/domain/summary"
import { BUCKET_KEYS } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

/**
 * Line 300 split the way the VAT return needs it: domestic, EU, outside the
 * EU and reverse charge. Lines 301 to 324 sit below as other income.
 */
export function SalesWidget() {
  const f = useFormatters()
  const { summary } = useOverviewData()
  const t = summary.totals
  const total = salesTotal(t)
  let domestic = 0
  for (const v of t.salesByRate.values()) domestic += v

  const kinds = [
    {
      label: f.t("overview.salesDomestic"),
      cents: domestic,
      swatch: "bg-chart-4",
    },
    { label: f.t("summary.eu"), cents: t.eu, swatch: "bg-chart-3" },
    {
      label: f.t("summary.otherCountries"),
      cents: t.nonEu,
      swatch: "bg-chart-2",
    },
    {
      label: f.t("summary.reverseCharge"),
      cents: t.reverse,
      swatch: "bg-chart-1",
    },
  ]
  const pct = (c: number) => (total > 0 ? (c / total) * 100 : 0)

  return (
    <Panel
      title={f.t("overview.widgetSales")}
      actions={<Money cents={total} className="ml-auto font-medium" />}
      className="flex flex-1 flex-col"
      bodyClassName="p-4"
    >
      <div
        className="mb-4 flex h-3.5 gap-0.5 overflow-hidden rounded-sm bg-muted"
        aria-hidden
      >
        {kinds
          .filter((k) => k.cents > 0)
          .map((k) => (
            <div
              key={k.label}
              className={k.swatch}
              style={{ width: `${pct(k.cents)}%` }}
            />
          ))}
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        {kinds.map((k) => (
          <div
            key={k.label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="inline-flex items-center gap-2">
              <span
                className={cn("size-2.5 rounded-xs", k.swatch)}
                aria-hidden
              />
              {k.label}
              <span className="tabular text-muted-foreground">
                {Math.round(pct(k.cents))} %
              </span>
            </dt>
            <dd>
              <Money cents={k.cents} />
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
          <dt>{f.t("overview.otherIncome")}</dt>
          <dd>
            <Money cents={t.otherIncome} tone="muted" />
          </dd>
        </div>
      </dl>
    </Panel>
  )
}

/** The seven summary buckets of §6.4, largest first. Empty ones are counted. */
export function ExpensesWidget() {
  const f = useFormatters()
  const { summary, year } = useOverviewData()
  const byBucket = summary.totals.byBucket
  const rows = BUCKETS.filter((b) => byBucket[b] > 0).sort(
    (a, b) => byBucket[b] - byBucket[a]
  )
  const max = rows.length ? byBucket[rows[0]] : 1
  const empty = BUCKETS.length - rows.length

  return (
    <Panel
      title={f.t("overview.widgetExpenses")}
      actions={
        <span className="ml-auto text-sm text-muted-foreground">{year}</span>
      }
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {rows.map((b) => (
        <div key={b}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{f.t(BUCKET_KEYS[b])}</span>
            <Money cents={byBucket[b]} className="font-medium" />
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-expense"
              style={{ width: `${(byBucket[b] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {empty ? (
        <p className="text-xs text-muted-foreground">
          {f.t("overview.emptyBuckets", { n: empty })}
        </p>
      ) : null}
    </Panel>
  )
}
