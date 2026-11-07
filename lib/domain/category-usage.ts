import type { Category, Entry } from "@/lib/domain/types"

/** How many entries each category holds, by category id. */
export function categoryUsage(
  entries: readonly Pick<Entry, "catId">[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.catId, (counts.get(e.catId) ?? 0) + 1)
  return counts
}

/**
 * The categories the picker lists first (§8.5): the `limit` most used among
 * `cats`, most used first, ties in the order `cats` came in. A category with
 * no entry never qualifies, so an empty book gets no group.
 */
export function mostUsedCategories(
  cats: readonly Category[],
  usage: ReadonlyMap<string, number>,
  limit = 5
): Category[] {
  return cats
    .map((cat, index) => ({ cat, index, n: usage.get(cat.id) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.cat)
}
