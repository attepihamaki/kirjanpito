import { LINE_BY_KEY, categoryName } from "@/lib/domain/accounts"
import { calcEntry, signedGross } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import type { Category, Entry, Lang } from "@/lib/domain/types"
import type {
  LedgerSortKey,
  MonthFilter,
  SortState,
  TypeFilter,
} from "@/stores/book-store"

/**
 * Derived data, as plain functions. Nothing here is stored — components call
 * these inside useMemo keyed on the narrow slices they select.
 */

export function entriesInYear(entries: readonly Entry[], year: number) {
  return entries.filter((e) => yearOf(e.pvm) === year)
}

/** Entries for the selected year, narrowed to a month when one is picked. */
export function entriesInPeriod(
  entries: readonly Entry[],
  year: number,
  month: MonthFilter
) {
  return entries.filter(
    (e) => yearOf(e.pvm) === year && (month === 0 || monthOf(e.pvm) === month)
  )
}

/** Entry counts per month, 1-indexed; index 0 holds the year total. */
export function monthCounts(entries: readonly Entry[], year: number) {
  const counts = new Array<number>(13).fill(0)
  for (const e of entries) {
    if (yearOf(e.pvm) !== year) continue
    counts[0] += 1
    counts[monthOf(e.pvm)] += 1
  }
  return counts
}

/** The years to offer in the selector: those in the data, plus now and the selection. */
export function yearsAvailable(entries: readonly Entry[], selected: number) {
  const years = new Set<number>(entries.map((e) => yearOf(e.pvm)))
  years.add(new Date().getFullYear())
  years.add(selected)
  return [...years].sort((a, b) => b - a)
}

export function usedCategoryIds(entries: readonly Entry[]) {
  return new Set(entries.map((e) => e.catId))
}

export interface LedgerFilters {
  query: string
  type: TypeFilter
  catId: string
  sort: SortState<LedgerSortKey>
}

function ledgerValue(
  entry: Entry,
  key: LedgerSortKey,
  cats: ReadonlyMap<string, Category>,
  lang: Lang
): string | number {
  switch (key) {
    case "pvm":
      return entry.pvm
    case "selite":
      return entry.selite
    case "luokka": {
      const cat = cats.get(entry.catId)
      return cat ? categoryName(cat, lang) : ""
    }
    case "net":
      return calcEntry(entry).net
    case "vat":
      return calcEntry(entry).vat
    case "gross":
      // Signed, so income and expenses sort to opposite ends.
      return signedGross(entry)
  }
}

export function filterAndSortEntries(
  entries: readonly Entry[],
  cats: ReadonlyMap<string, Category>,
  filters: LedgerFilters,
  lang: Lang,
  collator: Intl.Collator
): Entry[] {
  const needle = filters.query.trim().toLowerCase()

  const filtered = entries.filter((e) => {
    if (filters.type !== "all" && e.tyyppi !== filters.type) return false
    if (filters.catId !== "all" && e.catId !== filters.catId) return false
    if (!needle) return true
    const cat = cats.get(e.catId)
    const name = cat ? categoryName(cat, lang) : ""
    return (
      e.selite.toLowerCase().includes(needle) ||
      name.toLowerCase().includes(needle)
    )
  })

  const { key, dir } = filters.sort
  return filtered.sort((a, b) => {
    const av = ledgerValue(a, key, cats, lang)
    const bv = ledgerValue(b, key, cats, lang)
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : collator.compare(String(av), String(bv))
    // Date ascending is the stable tiebreaker, so equal keys keep a sane order.
    return (cmp || a.pvm.localeCompare(b.pvm)) * dir
  })
}

export function categorySide(cat: Category) {
  return LINE_BY_KEY.get(cat.line)?.side
}

export function categoryAccount(cat: Category) {
  return LINE_BY_KEY.get(cat.line)?.tili ?? 0
}

/** Clamp a page to the available range and return the visible slice. */
export function paginate<T>(rows: readonly T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(Math.max(1, page), pages)
  return {
    page: current,
    pages,
    total: rows.length,
    rows: rows.slice((current - 1) * size, current * size),
  }
}
