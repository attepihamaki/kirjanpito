import { calcEntry } from "@/lib/domain/calc"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import { rateMismatch } from "@/lib/domain/vat-rates"

/**
 * The checks behind the overview's "Tarkistettavaa" and the ledger's
 * "Tarkistettavat" filter (§8.4, §8.12). Each is a hint, never an error: the
 * entry may be right, and saving is never blocked by one.
 */
export type EntryCheck =
  "noReceipt" | "rateMismatch" | "futureDate" | "zeroVatSale" | "largeAmount"

export const ENTRY_CHECKS: readonly EntryCheck[] = [
  "noReceipt",
  "rateMismatch",
  "futureDate",
  "zeroVatSale",
  "largeAmount",
]

/**
 * Whether an entry has a receipt file the app can show. A receipt listed in
 * the CSV but missing from the ZIP does not count (§7.2).
 */
export function hasReceipt(entry: Entry): boolean {
  return entry.atts?.some((a) => a.id !== null) ?? false
}

/** How many times the type's median an amount has to be to stand out. */
const LARGE_FACTOR = 10
/** Below this the median says too little about what is usual. */
const LARGE_MIN_ENTRIES = 5
/** A small amount is never flagged, however small the others are. */
const LARGE_FLOOR = 100_000

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function isDomesticSale(e: Entry, cats: CategoryMap): boolean {
  const cat = cats.get(e.catId)
  return e.type === "income" && cat?.line === "300" && cat.kind === "domestic"
}

/**
 * The ids of the entries a check flags among `entries`, which are the
 * selected year's: the large-amount and zero-VAT checks compare an entry with
 * the rest of the year, so the ledger must not narrow them to a month first.
 */
export function flaggedEntryIds(
  check: EntryCheck,
  entries: readonly Entry[],
  cats: CategoryMap,
  today: string
): Set<string> {
  const ids = (keep: (e: Entry) => boolean) =>
    new Set(entries.filter(keep).map((e) => e.id))

  switch (check) {
    case "noReceipt":
      return ids((e) => !hasReceipt(e))
    case "rateMismatch":
      return ids((e) => rateMismatch(e.vatRate, e.date) !== null)
    case "futureDate":
      return ids((e) => e.date > today)
    case "zeroVatSale": {
      /*
       * A business that is not VAT registered sells everything at 0 %, so a
       * 0 % domestic sale is flagged only in a year that also has domestic
       * sales with VAT.
       */
      const sales = entries.filter((e) => isDomesticSale(e, cats))
      if (!sales.some((e) => e.vatRate > 0)) return new Set()
      return ids((e) => isDomesticSale(e, cats) && e.vatRate === 0)
    }
    case "largeAmount": {
      /*
       * Typically a misplaced decimal comma or an extra zero. Income and
       * expenses are compared separately, since one invoice can easily be
       * worth a year of receipts.
       */
      const out = new Set<string>()
      for (const type of ["income", "expense"] as const) {
        const ofType = entries.filter((e) => e.type === type)
        if (ofType.length < LARGE_MIN_ENTRIES) continue
        const gross = (e: Entry) => Math.abs(calcEntry(e).gross)
        const limit = Math.max(
          LARGE_FLOOR,
          median(ofType.map(gross)) * LARGE_FACTOR
        )
        for (const e of ofType) if (gross(e) > limit) out.add(e.id)
      }
      return out
    }
  }
}
