import * as React from "react"

import { depreciationMaximums } from "@/lib/domain/assets"
import { yearOf } from "@/lib/domain/dates"
import { indexCategories } from "@/lib/domain/types"
import type { StatementOptions } from "@/lib/domain/income-statement"
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

/**
 * What the income statement needs besides the entries: the register's yearly
 * maximum for depreciation (§8.8). Every view that reports a result passes it,
 * so they all deduct the same depreciation.
 */
export function useStatementOptions(): StatementOptions {
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const assetOpening = useBookStore((s) => s.assetOpening)
  return React.useMemo(() => {
    const latest = entries.reduce((max, e) => Math.max(max, yearOf(e.date)), year)
    return {
      depreciationMax: depreciationMaximums(
        entries,
        indexCategories(cats),
        assetOpening,
        latest
      ),
    }
  }, [entries, cats, year, assetOpening])
}
