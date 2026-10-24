/**
 * Core domain types. Everything in `lib/domain` is pure TypeScript: no React,
 * no Next.js, no `window`, `Blob`, `localStorage` or `indexedDB`.
 */

export type Lang = "fi" | "en"

export type EntryType = "income" | "expense"

/** Whether `Entry.amount` includes VAT (gross) or excludes it (net). */
export type AmountMode = "gross" | "net"

/** Classification of an income category for the VAT return (§6.1). */
export type SalesKind = "domestic" | "eu" | "nonEu" | "reverse"

/** Expense summary buckets, the Yhteenveto columns (§5). */
export type Bucket =
  | "purchases"
  | "personnel"
  | "depreciation"
  | "otherDeductible"
  | "financial"
  | "provisions"
  | "nondeductible"

/**
 * Integer cents. Never a float, never a string.
 *
 * Deliberately a plain alias rather than a branded type: branding would force
 * a cast at every papaparse, `Intl` and test-literal boundary for no real
 * safety gain. The discipline is enforced by convention plus the rule that no
 * test in this layer may use `toBeCloseTo`.
 */
export type Cents = number

/** A receipt attached to an entry (tosite). */
export interface Attachment {
  /** IndexedDB key, or null when the file itself is not available. */
  id: string | null
  /** Display / original file name. */
  name: string
  /** MIME type. */
  type: string
  /** Size in bytes. */
  size: number
  /** Listed in the CSV but the file was not available on import. */
  missing?: true
  /** Original path from the CSV, kept so re-export does not lose the link. */
  path?: string
}

/**
 * A bookkeeping entry (kirjaus).
 *
 * This shape is what localStorage holds, so its field names are English even
 * though the CSV columns they serialize to are Finnish (§7.1). `lib/domain/csv`
 * owns that translation and is the only place the Finnish names appear.
 */
export interface Entry {
  id: string
  /** ISO date, "YYYY-MM-DD". */
  date: string
  description: string
  type: EntryType
  /** `Category.id`. */
  catId: string
  /** Integer cents, as entered — gross or net depending on `amountMode`. */
  amount: Cents
  /** VAT rate in percent, e.g. 25.5. */
  vatRate: number
  amountMode: AmountMode
  atts?: Attachment[]
}

/** A category (luokka) the user books entries to. */
export interface Category {
  /** e.g. "300-domestic", "333", "344-travel", or "c-<uid>" for custom ones. */
  id: string
  /** Key of the income statement line it belongs to (§5). */
  line: string
  /** Finnish name. Custom categories use the user's own name. */
  name: string
  /** Default VAT %, used to pre-fill the entry dialog. */
  vatRate: number
  /** Set on income categories; drives the §6.1 VAT treatment. */
  kind?: SalesKind
  /** Shown in the entry dialog's dropdown. */
  enabled: boolean
  /** User-created. */
  custom: boolean
}

export type CategoryMap = ReadonlyMap<string, Category>

/** Index categories by id for O(1) lookup during aggregation. */
export function indexCategories(cats: readonly Category[]): CategoryMap {
  return new Map(cats.map((c) => [c.id, c]))
}
