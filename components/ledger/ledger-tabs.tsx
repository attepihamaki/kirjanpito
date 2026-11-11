"use client"

import { SectionTabs } from "@/components/common/sub-page-tabs"
import { LEDGER_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/** Kirjanpito's pages (§8.4, §8.31), with the number waiting in the inbox. */
export function LedgerTabs() {
  const waiting = useBookStore((s) => s.inbox.length)
  return (
    <SectionTabs section="ledger" counts={{ [LEDGER_ROUTES.inbox]: waiting }} />
  )
}
