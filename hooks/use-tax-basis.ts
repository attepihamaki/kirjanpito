import * as React from "react"

import { taxBasisEntries } from "@/lib/domain/open-items"
import { useBookStore } from "@/stores/book-store"

/** The entries as the income statement and Form 5 read them (§6.3). */
export function useTaxBasisEntries() {
  const entries = useBookStore((s) => s.entries)
  const traderType = useBookStore((s) => s.traderType)
  return React.useMemo(
    () => taxBasisEntries(entries, traderType),
    [entries, traderType]
  )
}
