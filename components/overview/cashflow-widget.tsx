"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import {
  periodLabel,
  periodVat,
  useOverviewData,
} from "@/components/overview/overview-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { bankEstimate } from "@/lib/domain/bank-balance"
import {
  cashForecast,
  FORECAST_WEEKS,
  type TaxPayment,
} from "@/lib/domain/cash-forecast"
import { yearOf } from "@/lib/domain/dates"
import { taxCalendar } from "@/lib/domain/tax-calendar"
import { bookStartDate } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/** The VAT periods whose return is still to be paid. */
const UNPAID = new Set(["overdue", "due", "open", "future"])

/**
 * The cash-flow forecast (§8.12): the bank balance today carried through the
 * next 13 weeks of open invoices and bills, recurring entries and invoices,
 * VAT returns and advance tax instalments. Hidden by default.
 */
export function CashflowWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const balance = useBookStore((s) => s.bankBalance)
  const invoices = useBookStore((s) => s.invoices)
  const recurring = useBookStore((s) => s.recurring)
  const invoiceSettings = useBookStore((s) => s.invoiceSettings)
  const customers = useBookStore((s) => s.customers)
  const payMonths = useBookStore((s) => s.payMonths)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const bookEnd = useBookStore((s) => s.bookEnd)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const form5Filed = useBookStore((s) => s.form5Filed)

  const forecast = React.useMemo(() => {
    const { today, entries, catMap } = data
    const taxes: TaxPayment[] = data.timeline
      .filter((p) => UNPAID.has(p.status))
      .map((p) => ({
        kind: "vat" as const,
        date: p.due,
        amount: periodVat(data, p).report.due,
        label: periodLabel(f, p),
      }))
    const first = entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
    for (const year of [yearOf(today), yearOf(today) + 1]) {
      for (const event of taxCalendar({
        year,
        today,
        vatPeriod,
        startDate: bookStartDate(bookStart, first),
        endMonth: bookEnd,
        vatFiled,
        form5Filed,
        payMonths,
        entries,
        cats: catMap,
      })) {
        if (event.kind !== "advanceTax" || event.done) continue
        if (!event.amount || event.date < today) continue
        taxes.push({
          kind: "advanceTax",
          date: event.date,
          amount: event.amount,
          label: f.t("overview.cashflowAdvanceTax"),
        })
      }
    }
    return cashForecast({
      today,
      balance: balance
        ? bankEstimate(balance, entries, catMap, today).estimate
        : null,
      entries,
      catMap,
      invoices,
      recurring,
      recurringInvoices: invoiceSettings.recurring,
      customers,
      termDays: invoiceSettings.termDays,
      taxes,
    })
  }, [
    data,
    f,
    balance,
    invoices,
    recurring,
    invoiceSettings,
    customers,
    payMonths,
    vatPeriod,
    bookStart,
    bookEnd,
    vatFiled,
    form5Filed,
  ])

  const last = forecast.weeks[forecast.weeks.length - 1]
  const totalIn = forecast.weeks.reduce((s, w) => s + w.in, 0)
  const totalOut = forecast.weeks.reduce((s, w) => s + w.out, 0)
  const low = forecast.lowest
  const overdue = forecast.overdueIn !== 0 || forecast.overdueOut !== 0

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {f.t("overview.cashflowEnd", {
            n: FORECAST_WEEKS,
            d: f.date(last.end),
          })}
        </p>
        <Money
          cents={last.balance}
          tone={last.balance < 0 ? "expense" : undefined}
          className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
        />
        {!forecast.hasBalance ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {f.t("overview.cashflowNoBalance")}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y py-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">
            {f.t(
              forecast.hasBalance
                ? "overview.cashflowToday"
                : "overview.cashflowStart"
            )}
          </dt>
          <dd>
            <Money cents={forecast.start} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {f.t("overview.cashflowIn")}
          </dt>
          <dd>
            <Money cents={totalIn} tone="income" />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {f.t("overview.cashflowOut")}
          </dt>
          <dd>
            <Money cents={totalOut} tone="expense" />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {f.t("overview.cashflowLowest")}
          </dt>
          <dd>
            <Money
              cents={low.balance}
              tone={low.balance < 0 ? "expense" : undefined}
            />
            <span className="block text-xs text-muted-foreground">
              {f.t("overview.cashflowWeekOf", { d: f.date(low.start) })}
            </span>
          </dd>
        </div>
      </dl>

      {overdue ? (
        <p className="text-sm text-muted-foreground">
          {f.t("overview.cashflowOverdue", {
            a: f.money(forecast.overdueIn),
            b: f.money(-forecast.overdueOut),
          })}
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {f.t("overview.cashflowWeeks")}
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.t("overview.cashflowWeek")}</TableHead>
                <TableHead className="text-right">
                  {f.t("overview.cashflowIn")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("overview.cashflowOut")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("overview.cashflowBalance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.weeks.map((w) => (
                <TableRow key={w.start}>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(w.start)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={w.in} tone={w.in ? "income" : "muted"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={w.out} tone={w.out ? "expense" : "muted"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={w.balance}
                      tone={w.balance < 0 ? "expense" : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>

      <p className="mt-auto text-xs text-muted-foreground">
        {f.t("overview.cashflowNote")}
      </p>
    </Panel>
  )
}
