import * as React from "react"

import { shownFeatures, type Feature } from "@/lib/domain/features"
import { useBookStore } from "@/stores/book-store"

/** The features the book shows (§8.26): the chosen ones, and any with entries. */
export function useShownFeatures(): ReadonlySet<Feature> {
  const hidden = useBookStore((s) => s.hiddenFeatures)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  return React.useMemo(
    () => shownFeatures(hidden, entries, cats),
    [hidden, entries, cats]
  )
}
