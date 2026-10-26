"use client"

import { Money } from "@/components/common/money"
import { useT } from "@/components/lang-provider"
import type { LedgerTotals } from "@/lib/domain/vat"

/**
 * Three cells in one bordered bar, not separate cards (§8.4).
 *
 * These are the period's totals, deliberately not the filtered rows': the
 * strip answers "what does this month come to", which a search box should
 * not change.
 */
export function TotalsStrip({ totals }: { totals: LedgerTotals }) {
  const t = useT()
  const refund = totals.due < 0

  return (
    <div className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Cell label={t("ledger.incomeNet")}>
        <Money cents={totals.incomeNet} tone="income" />
      </Cell>
      <Cell label={t("ledger.expenseNet")}>
        <Money cents={totals.expenseNet} tone="expense" />
      </Cell>
      <Cell label={refund ? t("ledger.vatRefundable") : t("ledger.vatPayable")}>
        <Money
          cents={Math.abs(totals.due)}
          tone={refund ? "income" : undefined}
        />
      </Cell>
    </div>
  )
}

function Cell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium">{children}</span>
    </div>
  )
}
