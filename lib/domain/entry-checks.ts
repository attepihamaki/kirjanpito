import { calcEntry } from "@/lib/domain/calc"
import type { Attachment, CategoryMap, Entry } from "@/lib/domain/types"
import { rateMismatch } from "@/lib/domain/vat-rates"

/**
 * The checks behind the overview's "Tarkistettavaa" and the ledger's
 * "Tarkistettavat" filter (§8.4, §8.12). Each is a hint, never an error: the
 * entry may be right, and saving is never blocked by one.
 */
export type EntryCheck =
  | "noReceipt"
  | "rateMismatch"
  | "futureDate"
  | "zeroVatSale"
  | "largeAmount"
  | "duplicate"

export const ENTRY_CHECKS: readonly EntryCheck[] = [
  "noReceipt",
  "rateMismatch",
  "futureDate",
  "zeroVatSale",
  "largeAmount",
  "duplicate",
]

/**
 * Whether an entry has a receipt file the app can show. A receipt listed in
 * the CSV but missing from the ZIP does not count (§7.2).
 */
export function hasReceipt(entry: Entry): boolean {
  return entry.atts?.some((a) => a.id !== null) ?? false
}

/**
 * The figures two entries share when one may be the other recorded twice:
 * the date, the side and the gross amount. The category is left out, since
 * the same receipt entered twice can easily land in two categories.
 */
function figuresKey(e: Entry): string {
  return `${e.date}|${e.type}|${calcEntry(e).gross}`
}

/** A stored receipt file, by what survives storing it: name, type and size. */
function fileKey(a: Attachment): string | null {
  return a.id === null ? null : `${a.name}|${a.type}|${a.size}`
}

/**
 * Another entry that has the same figures as `entry`, if any. The entry
 * itself, by id, never counts.
 */
export function duplicateOf(
  entry: Entry,
  entries: readonly Entry[]
): Entry | undefined {
  const key = figuresKey(entry)
  return entries.find((e) => e.id !== entry.id && figuresKey(e) === key)
}

/**
 * The entry other than `exceptId` that already holds a stored receipt file
 * looking like `att`, if any.
 */
export function entryWithReceipt(
  att: Attachment,
  entries: readonly Entry[],
  exceptId?: string
): Entry | undefined {
  const key = fileKey(att)
  if (key === null) return undefined
  return entries.find(
    (e) => e.id !== exceptId && e.atts?.some((a) => fileKey(a) === key)
  )
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
    case "duplicate": {
      /*
       * Entries that share their figures, or a receipt file, with another
       * entry. Both of a pair are flagged, since either may be the extra one.
       */
      const out = new Set<string>()
      const group = (keysOf: (e: Entry) => (string | null)[]) => {
        const seen = new Map<string, string>()
        for (const e of entries) {
          for (const key of new Set(keysOf(e))) {
            if (key === null) continue
            const first = seen.get(key)
            if (first === undefined) seen.set(key, e.id)
            else out.add(first).add(e.id)
          }
        }
      }
      group((e) => [figuresKey(e)])
      group((e) => (e.atts ?? []).map(fileKey))
      return out
    }
  }
}
