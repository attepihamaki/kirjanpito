"use client"

import { BankImportButton } from "@/components/bank/bank-import-button"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { useFormatters } from "@/components/lang-provider"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { yearOf } from "@/lib/domain/dates"
import type { MessageKey } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/** True when the selected year holds no entries, so a report would only show zeros. */
export function useYearIsEmpty(): boolean {
  const year = useBookStore((s) => s.year)
  return useBookStore((s) => !s.entries.some((e) => yearOf(e.date) === year))
}

/**
 * Stands in for a report of a year with no entries (§8.12): it says what fills
 * the view and offers the two ways to start filling it. `bodyKey` is the
 * message that names the report.
 */
export function NoEntriesState({ bodyKey }: { bodyKey: MessageKey }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{f.t("empty.noEntriesTitle", { y: year })}</EmptyTitle>
        <EmptyDescription>{f.t(bodyKey, { y: year })}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewEntryButton />
        <BankImportButton />
      </EmptyContent>
    </Empty>
  )
}
