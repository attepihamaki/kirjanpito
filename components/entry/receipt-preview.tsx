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
    ? f.t("r_noVat")
    : income
      ? f.t("r_salesTax")
      : f.t("r_deduct")

  return (
    <ReceiptPaper>
      <ReceiptHead
        label={income ? f.t("r_income") : f.t("r_expense")}
        date={date ? f.date(date) : "—"}
        tone={income ? "income" : "expense"}
      />

      <p className="mt-3 text-sm font-medium break-words">
        {description.trim() || (
          <span className="text-paper-foreground/50">{f.t("noDesc")}</span>
        )}
      </p>
      <p className="text-xs text-paper-foreground/70">
        {cat ? f.catLabel(cat) : f.t("unknownCat")}
      </p>

      <ReceiptRule className="mt-4 mb-3" />
      <div className="flex flex-col gap-1">
        <ReceiptRow label={f.t("r_net")} value={f.money(net)} />
        <ReceiptRow
          label={`${f.t("c_vat")} ${vatRate ? f.rate(vatRate) : ""}`.trim()}
          value={f.money(vat)}
        />
        <div className="mt-1 border-t border-paper-edge pt-2">
          <ReceiptTotal label={f.t("r_total")} value={f.money(gross)} />
        </div>
      </div>

      <p className="mt-3 text-center text-[0.7rem] text-paper-foreground/60">
        {badge}
      </p>
    </ReceiptPaper>
  )
}
