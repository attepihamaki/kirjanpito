"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Money } from "@/components/common/money"
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
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { VatPeriodStrip } from "@/components/vat/vat-period-strip"
import { todayIso } from "@/lib/domain/dates"
import { filterPeriod, type Period } from "@/lib/domain/period"
import { indexCategories } from "@/lib/domain/types"
import { vatReport, type VatSide } from "@/lib/domain/vat"
import {
  bookStartDate,
  periodStatus,
  vatPeriods,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

export function VatView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  // The filing period is set in Settings (§8.10); the view only follows it.
  const mode = useBookStore((s) => s.vatPeriod)
  const index = useBookStore((s) => s.vatIndex)
  const setIndex = useBookStore((s) => s.setVatIndex)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const today = todayIso()

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

  const start = React.useMemo(
    () =>
      bookStartDate(
        bookStart,
        entries.reduce<string | null>(
          (min, e) => (min === null || e.date < min ? e.date : min),
          null
        )
      ),
    [bookStart, entries]
  )
  const periods = React.useMemo(() => vatPeriods(mode, year), [mode, year])
  const statuses: VatPeriodStatus[] = periods.map((p) =>
    periodStatus(p, today, vatFiled, start)
  )
  const current = periods.find((p) => p.index === index) ?? periods[0]
  const currentStatus = periodStatus(current, today, vatFiled, start)

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
        {mode !== "year" ? (
          <VatPeriodStrip
            periods={periods}
            selected={current.index}
            statuses={statuses}
            onSelect={setIndex}
          />
        ) : null}

        {/* Result banner */}
        <Panel bodyClassName="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-muted-foreground">
              {refund ? f.t("vat.refundableTitle") : f.t("vat.payableTitle")}
            </p>
            <Money
              cents={Math.abs(report.due)}
              tone={refund ? "income" : undefined}
              className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {f.t("vat.formula", {
                a: f.money(report.sales.total.vat),
                b: f.money(report.purchases.total.vat),
              })}
            </p>
          </div>

          {currentStatus === "before" ? (
            <p className="text-sm text-muted-foreground">
              {f.t("vat.beforeStartHint")}
            </p>
          ) : null}

          {/* Only a closed period can be filed. */}
          {currentStatus === "filed" ||
          currentStatus === "due" ||
          currentStatus === "overdue" ? (
            <div className="flex flex-col items-start gap-2 text-sm min-[560px]:items-end">
              <span className="text-muted-foreground">
                {currentStatus === "filed"
                  ? f.t("vat.filedOn", { d: f.date(vatFiled[current.key]) })
                  : f.t("vat.dueDate", { d: f.date(current.due) })}
              </span>
              {currentStatus === "filed" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVatFiled(current.key, null)}
                >
                  {f.t("vat.unmarkFiled")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVatFiled(current.key, today)}
                >
                  <CheckIcon data-icon="inline-start" />
                  {f.t("vat.markFiled")}
                </Button>
              )}
            </div>
          ) : null}
        </Panel>

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
    <Panel title={title}>
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
