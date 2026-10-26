"use client"

import {
  ReceiptHead,
  ReceiptPaper,
  ReceiptRow,
  ReceiptRule,
  ReceiptTotal,
} from "@/components/common/receipt-paper"
import { useFormatters } from "@/components/lang-provider"
import { calcEntry } from "@/lib/domain/calc"
import type { AmountMode, Category, EntryType } from "@/lib/domain/types"

/**
 * The live paper receipt (§8.5) — the one bold element in the design (§11).
 * A perforated bottom edge, warm paper tone, everything else quiet.
 */
export function ReceiptPreview({
  date,
  description,
  type,
  cat,
  amount,
  vatRate,
  amountMode,
}: {
  date: string
  description: string
  type: EntryType
  cat: Category | undefined
  amount: number
  vatRate: number
  amountMode: AmountMode
}) {
  const f = useFormatters()
  const { net, vat, gross } = calcEntry({ amount, vatRate, amountMode })
  const income = type === "income"

  const badge = !vatRate
    ? f.t("receipt.noVatBadge")
    : income
      ? f.t("receipt.salesBadge")
      : f.t("receipt.purchaseBadge")

  return (
    <ReceiptPaper>
      <ReceiptHead
        label={income ? f.t("receipt.income") : f.t("receipt.expense")}
        date={date ? f.date(date) : "—"}
        tone={income ? "income" : "expense"}
      />

      <p className="mt-3 text-sm font-medium break-words">
        {description.trim() || (
          <span className="text-paper-foreground/50">
            {f.t("ledger.noDescription")}
          </span>
        )}
      </p>
      <p className="text-xs text-paper-foreground/70">
        {cat ? f.catLabel(cat) : f.t("entry.unknownCategory")}
      </p>

      <ReceiptRule className="mt-4 mb-3" />
      <div className="flex flex-col gap-1">
        <ReceiptRow label={f.t("receipt.net")} value={f.money(net)} />
        <ReceiptRow
          label={`${f.t("ledger.colVat")} ${vatRate ? f.rate(vatRate) : ""}`.trim()}
          value={f.money(vat)}
        />
        <div className="mt-1 border-t border-paper-edge pt-2">
          <ReceiptTotal label={f.t("receipt.total")} value={f.money(gross)} />
        </div>
      </div>

      <p className="mt-3 text-center text-[0.7rem] text-paper-foreground/60">
        {badge}
      </p>
    </ReceiptPaper>
  )
}
