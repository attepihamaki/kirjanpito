"use client"

import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { LEDGER_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/** The entries, the journal, the general ledger, the account list (§8.4) and the inbox (§8.31). */
export function LedgerTabs() {
  const t = useT()
  const waiting = useBookStore((s) => s.inbox.length)
  return (
    <SubPageTabs
      label={t("ledger.sections")}
      tabs={[
        { href: LEDGER_ROUTES.entries, label: t("ledger.entriesTab") },
        { href: LEDGER_ROUTES.journal, label: t("ledger.journalTab") },
        { href: LEDGER_ROUTES.accounts, label: t("ledger.accountsTab") },
        { href: LEDGER_ROUTES.chart, label: t("ledger.chartTab") },
        {
          href: LEDGER_ROUTES.inbox,
          label: waiting ? t("inbox.tabCount", { n: waiting }) : t("inbox.tab"),
        },
      ]}
    />
  )
}
