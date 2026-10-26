"use client"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
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
      <Card label={t("ledger.incomeNet")}>
        <Money cents={totals.incomeNet} tone="income" />
      </Card>
      <Card label={t("ledger.expenseNet")}>
        <Money cents={totals.expenseNet} tone="expense" />
      </Card>
      <Card label={refund ? t("ledger.vatRefundable") : t("ledger.vatPayable")}>
        <Money
          cents={Math.abs(totals.due)}
          tone={refund ? "income" : undefined}
        />
      </Card>
    </div>
  )
}

function Card({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Panel bodyClassName="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium">{children}</span>
    </Panel>
  )
}
