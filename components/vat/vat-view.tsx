"use client"

import * as React from "react"

import { PageHeader } from "@/components/common/page-header"
import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFormatters } from "@/components/lang-provider"
import { quarterMonths } from "@/lib/domain/dates"
import { filterPeriod, type Period } from "@/lib/domain/period"
import { indexCategories } from "@/lib/domain/types"
import { vatReport, type VatSide } from "@/lib/domain/vat"
import { cn } from "@/lib/utils"
import { useBookStore, type VatMode } from "@/stores/book-store"

export function VatView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const mode = useBookStore((s) => s.vatMode)
  const index = useBookStore((s) => s.vatIndex)
  const setMode = useBookStore((s) => s.setVatMode)
  const setIndex = useBookStore((s) => s.setVatIndex)

  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const period: Period = React.useMemo(() => {
    if (mode === "year") return { kind: "year", year }
    if (mode === "quarter") {
      return {
        kind: "quarter",
        year,
        quarter: Math.min(4, Math.max(1, index)) as 1 | 2 | 3 | 4,
      }
    }
    return { kind: "month", year, month: Math.min(12, Math.max(1, index)) }
  }, [mode, index, year])

  const report = React.useMemo(
    () => vatReport(filterPeriod(entries, period), catMap),
    [entries, period, catMap]
  )

  // Month names or quarter labels, so the trigger shows a name not an index.
  const periodOptions = React.useMemo(() => {
    if (mode === "month") {
      return Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: f.month(i),
      }))
    }
    return ([1, 2, 3, 4] as const).map((q) => {
      const [a, b] = quarterMonths(q)
      return {
        value: String(q),
        label: f.t("vat.quarterOption", {
          q,
          a: f.month(a - 1, true),
          b: f.month(b - 1, true),
        }),
      }
    })
  }, [mode, f])

  const refund = report.due < 0
  const periodLabel =
    mode === "year"
      ? f.t("vat.yearN", { y: year })
      : mode === "quarter"
        ? f.t("vat.quarterN", { q: index, y: year })
        : `${f.month(index - 1)} ${year}`

  return (
    <>
      <PageHeader title={f.t("nav.vat")} subtitle={periodLabel} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            aria-label={f.t("vat.period")}
            value={[mode]}
            onValueChange={(value) => {
              const next = value[0] as VatMode | undefined
              if (next) setMode(next)
            }}
          >
            <ToggleGroupItem value="month">{f.t("vat.month")}</ToggleGroupItem>
            <ToggleGroupItem value="quarter">
              {f.t("vat.quarter")}
            </ToggleGroupItem>
            <ToggleGroupItem value="year">{f.t("vat.year")}</ToggleGroupItem>
          </ToggleGroup>

          {mode !== "year" ? (
            <OptionSelect
              options={periodOptions}
              value={String(index)}
              onChange={(value) => setIndex(Number(value))}
              label={f.t("vat.period")}
              className="w-[15rem]"
            />
          ) : null}
        </div>

        {/* Result banner */}
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {refund ? f.t("vat.refundableTitle") : f.t("vat.payableTitle")}
          </p>
          <p
            className={cn(
              "tabular mt-1 font-heading text-4xl font-semibold tracking-tight",
              refund && "text-income"
            )}
          >
            {f.money(Math.abs(report.due))}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {f.t("vat.formula", {
              a: f.money(report.sales.total.vat),
              b: f.money(report.purchases.total.vat),
            })}
          </p>
        </div>

        {report.anomalies.length ? (
          <Alert>
            <AlertDescription>
              {f.t("vat.exemptSaleWarning", {
                x:
                  entries.find((e) => e.id === report.anomalies[0].entryId)
                    ?.description || f.t("ledger.noDescription"),
              })}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <RateTable title={f.t("vat.salesTable")} side={report.sales} />
          <RateTable
            title={f.t("vat.purchaseTable")}
            side={report.purchases}
            // §6.1: 0% purchases are not deductible, so the row is hidden.
            skipZero
          />
        </div>

        <Panel title={f.t("vat.otherSales")}>
          <dl className="divide-y">
            <OtherRow label={f.t("vat.euSales")} cents={report.otherSales.eu} />
            <OtherRow
              label={f.t("vat.nonEuSales")}
              cents={report.otherSales.nonEu}
            />
            <OtherRow
              label={f.t("vat.reverseChargeSales")}
              cents={report.otherSales.reverse}
            />
          </dl>
        </Panel>

        <p className="text-xs text-muted-foreground">{f.t("vat.note")}</p>
      </div>
    </>
  )
}

function RateTable({
  title,
  side,
  skipZero,
}: {
  title: string
  side: VatSide
  skipZero?: boolean
}) {
  const f = useFormatters()
  const rows = [...side.byRate.entries()].filter(
    ([rate, bucket]) =>
      !(skipZero && rate === 0) && (rate !== 0 || bucket.net !== 0 || !skipZero)
  )

  return (
    <Panel title={title} bodyClassName="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{f.t("common.rate")}</TableHead>
            <TableHead className="text-right">{f.t("ledger.colNet")}</TableHead>
            <TableHead className="text-right">{f.t("common.vat")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([rate, bucket]) => (
            <TableRow key={rate}>
              <TableCell className="tabular">{f.rate(rate)}</TableCell>
              <TableCell className="text-right">
                <Money cents={bucket.net} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={bucket.vat} />
              </TableCell>
            </TableRow>
          ))}
          {side.other.net !== 0 || side.other.vat !== 0 ? (
            <TableRow>
              <TableCell>{f.t("vat.otherRates")}</TableCell>
              <TableCell className="text-right">
                <Money cents={side.other.net} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={side.other.vat} />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">{f.t("common.total")}</TableCell>
            <TableCell className="text-right font-medium">
              <Money cents={side.total.net} />
            </TableCell>
            <TableCell className="text-right font-medium">
              <Money cents={side.total.vat} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  )
}

function OtherRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <Money cents={cents} />
      </dd>
    </div>
  )
}
