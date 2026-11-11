"use client"

import { Money } from "@/components/common/money"
import { TotalCard } from "@/components/common/total-card"
import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"
import type { LedgerTotals } from "@/lib/domain/vat"

/**
 * Three cards side by side, one per figure (§8.4). Under 640 px they join
 * into one bordered row of three cells, so the figures take one line of a
 * phone's screen and the entries start right under them.
 *
 * These are the period's totals, deliberately not the filtered rows': the
 * cards answer "what does this month come to", which a search box should
 * not change.
 */
export function TotalsCards({ totals }: { totals: LedgerTotals }) {
  const t = useT()
  const refund = totals.due < 0

  return (
    <div
      className={cn(
        "grid grid-cols-3 sm:gap-4",
        "max-sm:divide-x max-sm:rounded-lg max-sm:border max-sm:bg-card max-sm:shadow-xs",
        "max-sm:[&>section]:rounded-none max-sm:[&>section]:border-y-0 max-sm:[&>section]:border-r-0 max-sm:[&>section]:bg-transparent max-sm:[&>section]:shadow-none max-sm:[&>section:first-child]:border-l-0"
      )}
    >
      <TotalCard compact label={t("ledger.incomeNet")}>
        <Money cents={totals.incomeNet} tone="income" />
      </TotalCard>
      <TotalCard compact label={t("ledger.expenseNet")}>
        <Money cents={totals.expenseNet} tone="expense" />
      </TotalCard>
      <TotalCard
        compact
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
