/**
 * Core domain types. Everything in `lib/domain` is pure TypeScript: no React,
 * no Next.js, no `window`, `Blob`, `localStorage` or `indexedDB`.
 */

export type Lang = "fi" | "en"

export type EntryType = "income" | "expense"

/** Whether `Entry.amount` includes VAT (gross) or excludes it (net). */
export type AmountMode = "gross" | "net"

/** Classification of an income category for the VAT return (§6.1). */
/**
 * "euGoods" and "euServices" are separate fields on the VAT return. "eu" is the
 * retired category that does not say which of the two a sale was (§5).
 */
export type SalesKind =
  "domestic" | "euGoods" | "euServices" | "eu" | "nonEu" | "reverse"

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

/** A file attached to an entry (liite). */
export interface Attachment {
  /** IndexedDB key, or null when the file itself is not available. */
  id: string | null
  /**
   * The original file name. It names the receipt everywhere: in the viewer,
   * in the change log, in the duplicate check, and as the file's own name
   * inside the ZIP (§7.2). The extension and the MIME type are read from it.
   */
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
 * A bookkeeping entry (tosite).
 *
 * This shape is what localStorage holds, so its field names are English even
 * though the CSV columns they serialize to are Finnish (§7.1). `lib/domain/csv`
 * owns that translation and is the only place the Finnish names appear.
 */
/**
 * A purchase whose tax the buyer reports on the VAT return instead of the
 * seller charging it (§6.9). `goods` and `services` come from another EU
 * country, `import` is goods from outside the EU, and `reverse` is a
 * construction service or scrap metal bought in Finland.
 */
export type EuPurchase = "goods" | "services" | "import" | "reverse"

/** Every `EuPurchase`, for reading a value from a file. */
export const EU_PURCHASE_KINDS: readonly EuPurchase[] = [
  "goods",
  "services",
  "import",
  "reverse",
]

export interface Entry {
  id: string
  /**
   * Voucher number (tositenumero), one series per year from 1 (§4). Set by
   * `assignVouchers` whenever entries are added or opened, so it is missing
   * only on an entry that has not reached the store yet.
   */
  voucher?: number
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
  /**
   * On a VAT payment or refund (§6.6), the key of the period it settles:
   * `"2026-09"`, `"2026-Q3"` or `"2026"`. Absent on every other entry.
   */
  settles?: string
  /**
   * When it was paid, if not on `date`: an ISO date, or null while it is open.
   * `date` itself is the delivery or invoice date (§6.3).
   */
  paidOn?: string | null
  /**
   * The first and last day the cost or income covers, as ISO dates, when that
   * is not just `date`. A liikkeenharjoittaja's statement spreads the net
   * amount over the calendar years the period touches (§6.3). Both or neither,
   * and only on a line that can be paid.
   */
  periodFrom?: string
  periodTo?: string
  /**
   * Paid in cash. KPL 2:4 has a cash payment booked without delay and day by
   * day, so the app checks when it was booked, and the bank estimate leaves it
   * out (§8.5). Only on a paid entry on a line that can be paid.
   */
  cash?: true
  /** The buyer's VAT number on a sale to another EU country (§8.7). */
  buyerVatId?: string
  /**
   * Set on an expense whose invoice carries no VAT because the buyer reports
   * it: a purchase from another EU country, an import or a domestic
   * reverse-charge purchase. The buyer reports the tax, so `amount` is what was paid and `vatRate` is the
   * rate the buyer reports it at (§6.9).
   */
  euPurchase?: EuPurchase
  /**
   * Links the parts of one receipt that was split across categories or VAT
   * rates. Entries with the same value belong together. The value is opaque
   * and only means something next to other entries that hold it.
   */
  split?: string
  /**
   * The share of the voucher that belongs to the business, in whole percent
   * from 1 to 99, for a cost used partly for work and partly privately (§6.12).
   * Absent means all of it. The cost and the VAT counted are that share of
   * the whole; the amount paid stays whole.
   */
  share?: number
  /**
   * The `id` of the entry this one reverses: a refund, a credit note or a
   * correction (§8.4). It is a reference only and changes no figure. The
   * reversed entry holds nothing; it finds its reversals by looking for this
   * id, so the two sides cannot disagree. An id no longer in the book means
   * no link.
   */
  reverses?: string
  /**
   * The `id` of the counterparty in the register (§8.29) this voucher is with.
   * A reference only: the description stays the text the user typed, and an
   * id no longer in the register means no link.
   */
  party?: string
  /**
   * When a bill received falls due, as an ISO date (§8.30). Only on an
   * expense on a line that can be paid, and only while the payment is not on
   * the entry's own date. It reports nothing: the payables list reads it.
   */
  due?: string
  /**
   * The payee's IBAN on a bill received (§8.30), compact. Kept on the same
   * entries as `due`, and like it reports nothing.
   */
  iban?: string
  /** The payment reference on a bill received (§8.30), Finnish or RF, compact. */
  reference?: string
  /**
   * The `id` of the purchase this sale of machinery or equipment disposes of
   * (§8.8). A reference for the asset list only: the pool is still one balance
   * and no figure reads it. An id no longer in the book means no link.
   */
  sells?: string
  /**
   * Free labels such as a project or a job (§8.37), each once, in the order
   * the user gave them. They report nothing; the tag report reads them.
   */
  tags?: string[]
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
  /** Set on expense categories whose tax the buyer reports (§6.9). */
  euPurchase?: EuPurchase
  /** Default business share for new entries on a cost category (§6.12). */
  share?: number
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
