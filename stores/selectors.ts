import { hasTag } from "@/lib/domain/tags"
import { LINE_BY_KEY, categoryName } from "@/lib/domain/accounts"
import { calcEntry, signedGross } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import {
  receiptTextMatches,
  type ReceiptTexts,
} from "@/lib/domain/receipt-text"
import type { Category, Entry, EntryType, Lang } from "@/lib/domain/types"
import {
  LEDGER_SORT_DEFAULT,
  type LedgerSortKey,
  type MonthFilter,
  type SortState,
  type TypeFilter,
} from "@/stores/book-store"

/**
 * Derived data, as plain functions. Nothing here is stored — components call
 * these inside useMemo keyed on the narrow slices they select.
 */

/** Entries for the selected year, narrowed to a month when one is picked. */
export function entriesInPeriod(
  entries: readonly Entry[],
  year: number,
  month: MonthFilter
) {
  return entries.filter(
    (e) => yearOf(e.date) === year && (month === 0 || monthOf(e.date) === month)
  )
}

/** Entry counts per month, 1-indexed; index 0 holds the year total. */
export function monthCounts(entries: readonly Entry[], year: number) {
  const counts = new Array<number>(13).fill(0)
  for (const e of entries) {
    if (yearOf(e.date) !== year) continue
    counts[0] += 1
    counts[monthOf(e.date)] += 1
  }
  return counts
}

/** The years to offer in the selector: those in the data, plus now and the selection. */
export function yearsAvailable(entries: readonly Entry[], selected: number) {
  const years = new Set<number>(entries.map((e) => yearOf(e.date)))
  years.add(new Date().getFullYear())
  years.add(selected)
  return [...years].sort((a, b) => b - a)
}

export { hasReceipt } from "@/lib/domain/entry-checks"

export function usedCategoryIds(entries: readonly Entry[]) {
  return new Set(entries.map((e) => e.catId))
}

export interface LedgerFilters {
  query: string
  type: TypeFilter
  catId: string
  /** A tag the entry must carry, "all" or unset for any (§8.37). */
  tag?: string
  /** The ids a "Tarkistettavat" check flagged, or null for every entry. */
  flagged: ReadonlySet<string> | null
  /** Null while no column is chosen: the rows then take `LEDGER_SORT_DEFAULT`. */
  sort: SortState<LedgerSortKey> | null
  /** Receipt text the query also searches; unset searches the fields only. */
  receiptText?: ReceiptTexts
}

function ledgerValue(
  entry: Entry,
  key: LedgerSortKey,
  cats: ReadonlyMap<string, Category>,
  lang: Lang
): string | number {
  switch (key) {
    case "voucher":
      // By year first, since every year starts its own series at 1.
      return yearOf(entry.date) * 1_000_000 + (entry.voucher ?? 0)
    case "date":
      return entry.date
    case "type":
      // Income first, as in the type toggle and the categories table.
      return entry.type === "income" ? 0 : 1
    case "description":
      return entry.description
    case "category": {
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

/** The entry's own fields: voucher number, description and category (§8.4). */
function matchesFields(
  e: Entry,
  needle: string,
  cats: ReadonlyMap<string, Category>,
  lang: Lang
): boolean {
  const cat = cats.get(e.catId)
  const name = cat ? categoryName(cat, lang) : ""
  return (
    (e.voucher !== undefined && String(e.voucher) === needle) ||
    e.description.toLowerCase().includes(needle) ||
    name.toLowerCase().includes(needle) ||
    (e.tags ?? []).some((t) => t.toLowerCase().includes(needle))
  )
}

/** Search over the entry's fields and the text of its PDF receipts (§8.4). */
function matchesQuery(
  e: Entry,
  needle: string,
  cats: ReadonlyMap<string, Category>,
  lang: Lang,
  texts: ReceiptTexts | undefined
): boolean {
  return (
    matchesFields(e, needle, cats, lang) || receiptTextMatches(e, needle, texts)
  )
}

/**
 * The ids of the entries a search finds only through a receipt's text, for the
 * "in receipt" mark on their rows (§8.4).
 */
export function receiptOnlyHits(
  entries: readonly Entry[],
  cats: ReadonlyMap<string, Category>,
  query: string,
  lang: Lang,
  texts: ReceiptTexts
): Set<string> {
  const needle = query.trim().toLowerCase()
  const hits = new Set<string>()
  if (!needle) return hits
  for (const e of entries) {
    if (
      receiptTextMatches(e, needle, texts) &&
      !matchesFields(e, needle, cats, lang)
    ) {
      hits.add(e.id)
    }
  }
  return hits
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
    if (filters.type !== "all" && e.type !== filters.type) return false
    if (filters.catId !== "all" && e.catId !== filters.catId) return false
    if (filters.tag && filters.tag !== "all" && !hasTag(e, filters.tag))
      return false
    if (filters.flagged && !filters.flagged.has(e.id)) return false
    return !needle || matchesQuery(e, needle, cats, lang, filters.receiptText)
  })

  const { key, dir } = filters.sort ?? LEDGER_SORT_DEFAULT
  // One value per entry, not two per comparison.
  const values = new Map<Entry, string | number>()
  for (const e of filtered) values.set(e, ledgerValue(e, key, cats, lang))
  return filtered.sort((a, b) => {
    const av = values.get(a)!
    const bv = values.get(b)!
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : collator.compare(String(av), String(bv))
    /*
     * Equal keys stay in book order, whichever way the column runs: by date,
     * then by voucher number, as the CSV and the journal have them.
     */
    return (
      cmp * dir ||
      a.date.localeCompare(b.date) ||
      (a.voucher ?? 0) - (b.voucher ?? 0)
    )
  })
}

export interface SearchHits {
  year: number
  count: number
}

/**
 * Where a search also matches outside the period on screen (§8.4), by year
 * with the newest first. The selected year is listed only when a single month
 * is on screen, for the matches in its other months. The other filters do not
 * apply: going to a year clears them, so the count is what the user then sees.
 */
export function searchHitsElsewhere(
  entries: readonly Entry[],
  cats: ReadonlyMap<string, Category>,
  query: string,
  year: number,
  month: number,
  lang: Lang,
  texts?: ReceiptTexts
): SearchHits[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const counts = new Map<number, number>()
  for (const e of entries) {
    const y = yearOf(e.date)
    const onScreen =
      y === year && (month === 0 || Number(e.date.slice(5, 7)) === month)
    if (onScreen || !matchesQuery(e, needle, cats, lang, texts)) continue
    counts.set(y, (counts.get(y) ?? 0) + 1)
  }
  return [...counts]
    .map(([y, count]) => ({ year: y, count }))
    .sort((a, b) => b.year - a.year)
}

export function categorySide(cat: Category) {
  return LINE_BY_KEY.get(cat.line)?.side
}

export function categoryAccount(cat: Category) {
  return LINE_BY_KEY.get(cat.line)?.account ?? 0
}

/**
 * The order categories are listed in: by account number, a line's own category
 * before its EU purchases (§6.9), then by name.
 */
export function compareCategories(
  a: Category,
  b: Category,
  compareNames: (a: Category, b: Category) => number
): number {
  return (
    categoryAccount(a) - categoryAccount(b) ||
    Number(!!a.euPurchase) - Number(!!b.euPurchase) ||
    compareNames(a, b)
  )
}

/**
 * The categories an entry can move to in bulk (§8.4, §8.10): enabled, on its
 * side, and an EU purchase only to an EU purchase, since moving one across
 * would change what was paid (§6.9).
 */
export function categoriesToMoveTo(
  cats: readonly Category[],
  side: EntryType | undefined,
  euPurchase: boolean,
  exceptId?: string
): Category[] {
  return cats.filter(
    (c) =>
      c.id !== exceptId &&
      c.enabled &&
      categorySide(c) === side &&
      !!c.euPurchase === euPurchase
  )
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

/**
 * The ids from `anchor` to `target` in the order `ids` lists them, both
 * included, for a Shift+click in the ledger (§8.4). Null when either is not
 * among `ids`, so the click picks the one row alone.
 */
export function selectionRange(
  ids: readonly string[],
  anchor: string,
  target: string
): string[] | null {
  const a = ids.indexOf(anchor)
  const b = ids.indexOf(target)
  if (a < 0 || b < 0) return null
  return ids.slice(Math.min(a, b), Math.max(a, b) + 1)
}
