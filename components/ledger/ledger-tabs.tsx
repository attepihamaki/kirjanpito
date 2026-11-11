"use client"

import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { LEDGER_ROUTES } from "@/lib/site"
import { LEDGER_GROUPS } from "@/lib/ui/sub-pages"
import { useBookStore } from "@/stores/book-store"

/** The entries, the books (§8.4) and the inbox (§8.31), with its count. */
export function LedgerTabs() {
  const t = useT()
  const waiting = useBookStore((s) => s.inbox.length)
  return (
    <SubPageTabs
      label={t("ledger.sections")}
      groups={LEDGER_GROUPS}
      counts={{ [LEDGER_ROUTES.inbox]: waiting }}
    />
  )
}
