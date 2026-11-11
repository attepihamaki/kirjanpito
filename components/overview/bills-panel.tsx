"use client"

import * as React from "react"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import {
  BillDuePill,
  BillPaymentLine,
  PayDialog,
} from "@/components/invoices/payables-list"
import { useFormatters } from "@/components/lang-provider"
import {
  periodLabel,
  periodVat,
  useOverviewData,
} from "@/components/overview/overview-data"
import { Button } from "@/components/ui/button"
import { useBillsDue } from "@/hooks/use-bills-due"
import { daysBetween } from "@/lib/domain/dates"
import type { Payable } from "@/lib/domain/payables"
import type { TimelinePeriod } from "@/lib/domain/vat-deadline"
import { INVOICE_ROUTES, VAT_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** How many rows the panel lists before it points to the bills to pay. */
const SHOWN = 5

/** How many days ahead a VAT return joins the list, as a bill due soon does (§8.30). */
const VAT_AHEAD_DAYS = 7

type Row =
  | { kind: "bill"; key: string; due: string; late: boolean; bill: Payable }
  | {
      kind: "vat"
      key: string
      due: string
      late: boolean
      period: TimelinePeriod
      amount: number
      sales: number
      purchases: number
    }

/**
 * What needs doing this week, above the overview's widgets (§8.12): the bills
 * past their due date or due within a week (§8.30) and the VAT returns that
 * are late or due within a week (§8.7), the earliest first. Each row has its
 * way to act: paying a bill, opening the return. The heading gives what it
 * all comes to. The panel is left out when nothing is that close.
 */
export function BillsPanel() {
  const f = useFormatters()
  const data = useOverviewData()
  const openDialog = useBookStore((s) => s.openDialog)
  const { bills } = useBillsDue()
  const [paying, setPaying] = React.useState<Payable | null>(null)

  const rows = React.useMemo(() => {
    const out: Row[] = bills.map((bill) => ({
      kind: "bill" as const,
      key: `b-${bill.lead.id}`,
      due: bill.due ?? data.today,
      late: bill.group === "overdue",
      bill,
    }))
    for (const period of data.timeline) {
      const late = period.status === "overdue"
      const soon =
        period.status === "due" &&
        daysBetween(data.today, period.due) <= VAT_AHEAD_DAYS
      if (!late && !soon) continue
      const { report } = periodVat(data, period)
      out.push({
        kind: "vat",
        key: `v-${period.key}`,
        due: period.due,
        late,
        period,
        amount: report.due,
        sales: report.sales.total.vat,
        purchases: report.purchases.total.vat,
      })
    }
    return out.sort((a, b) => a.due.localeCompare(b.due))
  }, [bills, data])

  if (!rows.length) return null
  const total = rows.reduce(
    (sum, r) => sum + (r.kind === "bill" ? r.bill.open : Math.max(0, r.amount)),
    0
  )
  const rest = rows.length - SHOWN

  const openVat = (period: TimelinePeriod) => {
    const s = useBookStore.getState()
    s.setYear(period.year)
    s.setVatIndex(period.index)
  }

  const dueLine = (due: string) => (
    <span className="tabular text-xs text-muted-foreground">
      {f.t("overview.dueShort", { d: f.date(due) })}
    </span>
  )

  return (
    <Panel
      className="mb-5 overflow-hidden"
      title={f.t("overview.todoTitle")}
      actions={
        <span className="ml-auto text-sm text-muted-foreground">
          {f.t("overview.todoTotal", { s: f.money(total) })}
        </span>
      }
      footer={
        rest > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {f.t("overview.todoMore", { n: rest })}
            </span>
            <ButtonLink
              variant="ghost"
              size="sm"
              className="ml-auto"
              href={INVOICE_ROUTES.payables}
            >
              {f.t("overview.billsAll")}
            </ButtonLink>
          </>
        ) : undefined
      }
    >
      <ul className="divide-y">
        {rows.slice(0, SHOWN).map((row) => (
          <li
            key={row.key}
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-[3px] px-4 py-3",
              row.late ? "border-l-expense" : "border-l-warning"
            )}
          >
            {row.kind === "bill" ? (
              <>
                <div className="flex w-32 shrink-0 flex-col items-start gap-1">
                  <BillDuePill bill={row.bill} today={data.today} />
                  {row.bill.due ? dueLine(row.bill.due) : null}
                </div>
                <div className="min-w-0 flex-[1_1_16rem]">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-left text-[0.9375rem] font-semibold whitespace-normal text-foreground"
                    onClick={() =>
                      openDialog({
                        kind: "entry",
                        mode: "edit",
                        entryId: row.bill.lead.id,
                      })
                    }
                  >
                    {row.bill.lead.description || "–"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {f.t("overview.todoBill")}
                  </p>
                  <BillPaymentLine bill={row.bill} />
                </div>
                <Money cents={row.bill.open} className="text-lg font-bold" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaying(row.bill)}
                  aria-label={`${f.t("payables.pay")}: ${row.bill.lead.description}`}
                >
                  <CheckIcon data-icon="inline-start" />
                  {f.t("payables.pay")}
                </Button>
              </>
            ) : (
              <>
                <div className="flex w-32 shrink-0 flex-col items-start gap-1">
                  <VatDuePill due={row.period.due} late={row.late} />
                  {dueLine(row.period.due)}
                </div>
                <div className="min-w-0 flex-[1_1_16rem]">
                  <p className="text-[0.9375rem] font-semibold">
                    {f.t("overview.todoVat", {
                      p: periodLabel(f, row.period),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.t("overview.todoVatFormula", {
                      a: f.money(row.sales),
                      b: f.money(row.purchases),
                    })}
                  </p>
                </div>
                <Money
                  cents={Math.abs(row.amount)}
                  tone={row.amount < 0 ? "income" : undefined}
                  className="text-lg font-bold"
                />
                <ButtonLink
                  size="sm"
                  href={VAT_ROUTES.sheet}
                  onClick={() => openVat(row.period)}
                >
                  {f.t("overview.todoOpenVat")}
                  <ArrowRightIcon data-icon="inline-end" />
                </ButtonLink>
              </>
            )}
          </li>
        ))}
      </ul>
      {paying ? (
        <PayDialog bill={paying} onClose={() => setPaying(null)} />
      ) : null}
    </Panel>
  )
}

/** Where a return stands: late by how many days, due today or tomorrow, or in how many days. */
function VatDuePill({ due, late }: { due: string; late: boolean }) {
  const f = useFormatters()
  const { today } = useOverviewData()
  const days = daysBetween(today, due)
  if (late) {
    return <Pill tone="expense">{f.t("payables.daysLate", { n: -days })}</Pill>
  }
  return (
    <Pill tone="warning">
      {days === 0
        ? f.t("calendar.today")
        : days === 1
          ? f.t("overview.tomorrow")
          : f.t("overview.daysLeft", { n: days })}
    </Pill>
  )
}
