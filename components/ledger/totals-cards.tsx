"use client"

import { Money } from "@/components/common/money"
import { TotalCard } from "@/components/common/total-card"
import { useT } from "@/components/lang-provider"
import type { LedgerTotals } from "@/lib/domain/vat"

/**
 * Three cards side by side, one per figure (§8.4).
 *
 * These are the period's totals, deliberately not the filtered rows': the
 * cards answer "what does this month come to", which a search box should
 * not change.
 */
export function TotalsCards({ totals }: { totals: LedgerTotals }) {
  const t = useT()
  const refund = totals.due < 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <TotalCard label={t("ledger.incomeNet")}>
        <Money cents={totals.incomeNet} tone="income" />
      </TotalCard>
      <TotalCard label={t("ledger.expenseNet")}>
        <Money cents={totals.expenseNet} tone="expense" />
      </TotalCard>
      <TotalCard
        label={refund ? t("ledger.vatRefundable") : t("ledger.vatPayable")}
      >
        <Money
          cents={Math.abs(totals.due)}
          tone={refund ? "income" : undefined}
        />
      </TotalCard>
    </div>
  )
}
