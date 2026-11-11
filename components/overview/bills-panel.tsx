"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import {
  BillDuePill,
  BillPaymentLine,
  PayDialog,
} from "@/components/invoices/payables-list"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useBillsDue } from "@/hooks/use-bills-due"
import { useToday } from "@/hooks/use-today"
import type { Payable } from "@/lib/domain/payables"
import { INVOICE_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/** How many bills the panel lists before it points to the whole list. */
const SHOWN = 4

/**
 * The bills that are overdue or fall due within a week, above the overview's
 * widgets (§8.12, §8.30). Each row has what paying it takes: the amount, the
 * payee's details to copy and "Maksa". The panel is left out when no bill is
 * that close.
 */
export function BillsPanel() {
  const f = useFormatters()
  const today = useToday()
  const openDialog = useBookStore((s) => s.openDialog)
  const { bills, total } = useBillsDue()
  const [paying, setPaying] = React.useState<Payable | null>(null)

  if (!bills.length) return null
  const rest = bills.length - SHOWN

  return (
    <Panel
      className="mb-5"
      title={f.t("overview.billsTitle")}
      actions={
        <span className="ml-auto text-sm text-muted-foreground">
          {f.t("overview.billsTotal", { s: f.money(total) })}
        </span>
      }
      footer={
        <>
          {rest > 0 ? (
            <span className="text-sm text-muted-foreground">
              {f.t("overview.billsMore", { n: rest })}
            </span>
          ) : null}
          <ButtonLink
            variant="ghost"
            size="sm"
            className="ml-auto"
            href={INVOICE_ROUTES.payables}
          >
            {f.t("overview.billsAll")}
          </ButtonLink>
        </>
      }
    >
      <ul className="divide-y">
        {bills.slice(0, SHOWN).map((bill) => (
          <li
            key={bill.lead.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <div className="flex w-32 shrink-0 flex-col items-start gap-1">
              <BillDuePill bill={bill} today={today} />
              {bill.due ? (
                <span className="tabular text-xs text-muted-foreground">
                  {f.date(bill.due)}
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-[1_1_16rem]">
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-left text-sm font-medium whitespace-normal text-foreground"
                onClick={() =>
                  openDialog({
                    kind: "entry",
                    mode: "edit",
                    entryId: bill.lead.id,
                  })
                }
              >
                {bill.lead.description || "–"}
              </Button>
              <BillPaymentLine bill={bill} />
            </div>
            <Money cents={bill.open} className="text-base font-semibold" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaying(bill)}
              aria-label={`${f.t("payables.pay")}: ${bill.lead.description}`}
            >
              <CheckIcon data-icon="inline-start" />
              {f.t("payables.pay")}
            </Button>
          </li>
        ))}
      </ul>
      {paying ? (
        <PayDialog bill={paying} onClose={() => setPaying(null)} />
      ) : null}
    </Panel>
  )
}
