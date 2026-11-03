"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { todayIso } from "@/lib/domain/dates"
import { indexCategories } from "@/lib/domain/types"
import {
  settlementSummary,
  type SettlementRow,
} from "@/lib/domain/vat-settlement"
import { periodLabel } from "@/lib/i18n/period-label"
import { useBookStore } from "@/stores/book-store"

function useSettlement() {
  const { current, currentStatus: status, report } = useVatPeriod()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const kind = useBookStore((s) => s.vatPeriod)
  const summary = React.useMemo(
    () =>
      settlementSummary(
        current,
        entries,
        indexCategories(cats),
        kind,
        report.due
      ),
    [current, entries, cats, kind, report.due]
  )
  const closed = status === "filed" || status === "due" || status === "overdue"
  return {
    current,
    due: report.due,
    summary,
    // A nil return moves no money. An entry already booked always shows.
    visible: summary.rows.length > 0 || (closed && report.due !== 0),
  }
}

/** Whether the selected period has a payment or refund to show or to book. */
export function useSettlementVisible(): boolean {
  return useSettlement().visible
}

/** The control on the VAT calculation, in a panel of its own. */
export function VatSettlementPanel() {
  const f = useFormatters()
  const { visible } = useSettlement()
  if (!visible) return null
  return (
    <Panel title={f.t("vat.settlementTitle")} bodyClassName="p-5">
      <VatSettlementControl />
    </Panel>
  )
}

/**
 * The tax paid or the refund received for the selected period (§6.6), checked
 * against what the calculation says. Each is an entry with its own voucher
 * number, booked through the entry dialog so the bank statement can be
 * attached. The app cannot see the bank, so it never assumes the money moved.
 */
export function VatSettlementControl() {
  const f = useFormatters()
  const { current, due, summary } = useSettlement()
  const openDialog = useBookStore((s) => s.openDialog)

  const book = () => {
    const refund = due < 0
    const p = periodLabel(f, current)
    openDialog({
      kind: "entry",
      mode: "new",
      prefill: {
        date: todayIso(),
        description: refund
          ? f.t("vat.settlementDescRefund", { p })
          : f.t("vat.settlementDescPayment", { p }),
        type: refund ? "income" : "expense",
        catId: refund ? "vat-refund" : "vat-payment",
        amount: Math.abs(due),
        vatRate: 0,
        amountMode: "gross",
        settles: current.key,
      },
    })
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {summary.rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {summary.rows.map((row) => (
            <SettlementItem
              key={row.entry.id}
              row={row}
              otherPeriod={row.period.key !== current.key}
              onOpen={() =>
                openDialog({
                  kind: "entry",
                  mode: "edit",
                  entryId: row.entry.id,
                })
              }
            />
          ))}
        </ul>
      ) : null}

      {summary.wider ? (
        <p className="text-muted-foreground">{f.t("vat.settlementWider")}</p>
      ) : summary.difference === 0 ? (
        <p className="text-muted-foreground">{f.t("vat.settlementMatches")}</p>
      ) : summary.difference !== null ? (
        <p className="text-muted-foreground">
          {f.t("vat.settlementDifference", {
            x: f.money(Math.abs(summary.difference)),
          })}
        </p>
      ) : null}

      {summary.rows.length === 0 || summary.difference ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {summary.rows.length === 0 ? (
            <p className="max-w-prose text-muted-foreground">
              {f.t("vat.settlementHint")}
            </p>
          ) : null}
          <Button variant="outline" size="sm" onClick={book}>
            {due < 0
              ? f.t("vat.settlementAddRefund")
              : f.t("vat.settlementAddPayment")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SettlementItem({
  row,
  otherPeriod,
  onOpen,
}: {
  row: SettlementRow
  /** Booked under another filing period (§6.5), so the row names it. */
  otherPeriod: boolean
  onOpen(): void
}) {
  const f = useFormatters()
  const { entry } = row
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>
        {row.amount > 0
          ? f.t("vat.settlementPaidOn", { d: f.date(entry.date) })
          : f.t("vat.settlementReceivedOn", { d: f.date(entry.date) })}
        <span className="text-muted-foreground">
          {entry.voucher
            ? ` · ${f.t("vat.settlementVoucher", { n: entry.voucher })}`
            : ""}
          {otherPeriod ? ` · ${periodLabel(f, row.period)}` : ""}
        </span>
      </span>
      <Money
        cents={Math.abs(row.amount)}
        tone={row.amount < 0 ? "income" : undefined}
        className="font-medium"
      />
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onOpen}>
        {f.t("vat.settlementOpen")}
      </Button>
    </li>
  )
}
