/**
 * Core domain types. Everything in `lib/domain` is pure TypeScript: no React,
 * no Next.js, no `window`, `Blob`, `localStorage` or `indexedDB`.
 */

export type Lang = "fi" | "en"

/** Income | expense. */
export type EntryType = "tulo" | "kulu"

/** Whether `Entry.summa` includes VAT (brutto) or excludes it (netto). */
export type AmountMode = "brutto" | "netto"

/** Classification of an income category for the VAT return (§6.1). */
export type SalesKind = "kotimaa" | "eu" | "muutmaat" | "kaanteinen"

/** Expense summary buckets, the Yhteenveto columns (§5). */
export type Bucket = "ostot" | "henk" | "poist" | "muut" | "rah" | "var" | "vk"

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

/** A bookkeeping entry (kirjaus). */
export interface Entry {
  id: string
  /** ISO date, "YYYY-MM-DD". */
  pvm: string
  /** Description. */
  selite: string
  tyyppi: EntryType
  /** `Category.id`. */
  catId: string
  /** Integer cents, as entered — gross or net depending on `syotto`. */
  summa: Cents
  /** VAT rate in percent, e.g. 25.5. */
  alv: number
  syotto: AmountMode
  atts?: Attachment[]
}

/** A category (luokka) the user books entries to. */
export interface Category {
  /** e.g. "300-suomi", "333", "344-matka", or "c-<uid>" for custom ones. */
  id: string
  /** Key of the income statement line it belongs to (§5). */
  line: string
  /** Finnish name. Custom categories use the user's own name. */
  nimi: string
  /** Default VAT %, used to pre-fill the entry dialog. */
  alv: number
  /** Set on income categories; drives the §6.1 VAT treatment. */
  kind?: SalesKind
  /** Enabled — shown in the entry dialog's dropdown. */
  on: boolean
  /** User-created. */
  custom: boolean
}

export type CategoryMap = ReadonlyMap<string, Category>

/** Index categories by id for O(1) lookup during aggregation. */
export function indexCategories(cats: readonly Category[]): CategoryMap {
  return new Map(cats.map((c) => [c.id, c]))
}
