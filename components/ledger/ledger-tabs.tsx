"use client"

import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { LEDGER_ROUTES } from "@/lib/site"

/** The entries, the journal and the general ledger (§8.4). */
export function LedgerTabs() {
  const t = useT()
  return (
    <SubPageTabs
      label={t("ledger.sections")}
      tabs={[
        { href: LEDGER_ROUTES.entries, label: t("ledger.entriesTab") },
        { href: LEDGER_ROUTES.journal, label: t("ledger.journalTab") },
        { href: LEDGER_ROUTES.accounts, label: t("ledger.accountsTab") },
      ]}
    />
  )
}
