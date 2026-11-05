import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import type { ChangeRecord } from "@/lib/domain/change-log"
import { todayIso } from "@/lib/domain/dates"
import { paidDate } from "@/lib/domain/open-items"
import { limitOn } from "@/lib/domain/rule-tables"
import { defineRules, type Rule } from "@/lib/domain/rules/engine"
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
  | "vatNotDeductible"
  | "privateUseNoVat"
  | "lateCash"

export const ENTRY_CHECKS: readonly EntryCheck[] = [
  "noReceipt",
  "rateMismatch",
  "futureDate",
  "zeroVatSale",
  "largeAmount",
  "duplicate",
  "vatNotDeductible",
  "privateUseNoVat",
  "lateCash",
]

/**
 * How many days after a cash payment its voucher may be booked before the
 * check says so. KPL 2:4 has cash payments booked "viipymättä" and day by day,
 * and gives no number, so this allows a weekend and no more.
 */
export const CASH_BOOKING_DAYS = 2

const DAY_MS = 86_400_000

/** Whole days from one ISO date to another. */
function daysFrom(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)
}

/**
 * The local date each entry was first added, from the change log. An entry
 * from a file whose log has no record of adding it has no date here.
 */
function addedOn(log: readonly ChangeRecord[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const r of log) {
    if (r.action !== "add" || !r.entryId || out.has(r.entryId)) continue
    out.set(r.entryId, todayIso(new Date(r.at)))
  }
  return out
}

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

/** Whether two entries are parts of one split receipt, which share figures and files on purpose. */
function sameSplit(a: Pick<Entry, "split">, b: Pick<Entry, "split">): boolean {
  return a.split !== undefined && a.split === b.split
}

/**
 * Another entry that has the same figures as `entry`, if any. The entry
 * itself, by id, and the other parts of its split never count.
 */
export function duplicateOf(
  entry: Entry,
  entries: readonly Entry[]
): Entry | undefined {
  const key = figuresKey(entry)
  return entries.find(
    (e) => e.id !== entry.id && !sameSplit(e, entry) && figuresKey(e) === key
  )
}

/**
 * The entry other than `exceptId` that already holds a stored receipt file
 * looking like `att`, if any. The other parts of `exceptId`'s split share its
 * receipt on purpose, so they never count.
 */
export function entryWithReceipt(
  att: Attachment,
  entries: readonly Entry[],
  exceptId?: string
): Entry | undefined {
  const key = fileKey(att)
  if (key === null) return undefined
  const own = entries.find((e) => e.id === exceptId)
  return entries.find(
    (e) =>
      e.id !== exceptId &&
      !(own && sameSplit(e, own)) &&
      e.atts?.some((a) => fileKey(a) === key)
  )
}

/**
 * Whether an expense carries VAT on a line whose VAT cannot be deducted
 * (`AccountLine.noVatDeduction`). Its VAT would count as purchase VAT. An EU
 * purchase is left out: its tax is due either way and is simply not deducted.
 */
export function vatNotDeductible(
  entry: Pick<Entry, "type" | "catId" | "vatRate" | "euPurchase">,
  cats: CategoryMap
): boolean {
  const cat = cats.get(entry.catId)
  const line = cat && LINE_BY_KEY.get(cat.line)
  return (
    entry.type === "expense" &&
    entry.vatRate > 0 &&
    !entry.euPurchase &&
    !!line?.noVatDeduction
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

/** What the entry checks look at: the selected year's entries and the book around them. */
export interface EntryCheckContext {
  /** The selected year's entries: the large-amount and zero-VAT checks compare an entry with the rest of the year. */
  entries: readonly Entry[]
  cats: CategoryMap
  today: string
  /** The change log, which says when a cash voucher was booked. */
  log: readonly ChangeRecord[]
}

type EntryRule = Rule<EntryCheckContext, string>

function entryRule(
  id: EntryCheck,
  source: string,
  flagged: (ctx: EntryCheckContext) => Iterable<string>
): EntryRule {
  return {
    id,
    severity: "warn",
    source,
    check: (ctx) => [...flagged(ctx)],
  }
}

const idsWhere = (ctx: EntryCheckContext, keep: (e: Entry) => boolean) =>
  ctx.entries.filter(keep).map((e) => e.id)

/**
 * One rule per check, each returning the ids of the entries it flags. They
 * are hints, never errors (`severity: "warn"`): the entry may be right.
 */
export const ENTRY_RULES = defineRules<EntryCheckContext, string>([
  /*
   * Every entry, calculated ones included: depreciation, line 354 and the
   * stock change rest on a memo voucher the calculator attaches (KPL 2:5).
   */
  entryRule("noReceipt", "KPL 2:5", (ctx) =>
    idsWhere(ctx, (e) => !hasReceipt(e))
  ),
  entryRule("rateMismatch", "vero.fi, VAT rates", (ctx) =>
    idsWhere(ctx, (e) => rateMismatch(e.vatRate, e.date) !== null)
  ),
  entryRule("futureDate", "app", (ctx) =>
    idsWhere(ctx, (e) => e.date > ctx.today)
  ),
  entryRule("zeroVatSale", "app", (ctx) => {
    /*
     * A business that is not VAT registered sells everything at 0 %, so a
     * 0 % domestic sale is flagged only in a year that also has domestic
     * sales with VAT.
     */
    const sales = ctx.entries.filter((e) => isDomesticSale(e, ctx.cats))
    if (!sales.some((e) => e.vatRate > 0)) return []
    return idsWhere(ctx, (e) => isDomesticSale(e, ctx.cats) && e.vatRate === 0)
  }),
  entryRule("largeAmount", "app", (ctx) => {
    /*
     * Typically a misplaced decimal comma or an extra zero. Income and
     * expenses are compared separately, since one invoice can easily be
     * worth a year of receipts. A VAT payment is a quarter's or a year's tax
     * in one sum, and the owner and a loan move money in round sums, so all
     * are large next to a receipt by nature (§6.6 to §6.8).
     */
    const exempt = (e: Entry) => {
      const cat = ctx.cats.get(e.catId)
      const line = cat && LINE_BY_KEY.get(cat.line)
      return !!line && (line.settlement || line.owner || line.loan)
    }
    const out: string[] = []
    for (const type of ["income", "expense"] as const) {
      const ofType = ctx.entries.filter((e) => e.type === type && !exempt(e))
      if (ofType.length < LARGE_MIN_ENTRIES) continue
      const gross = (e: Entry) => Math.abs(calcEntry(e).gross)
      const limit = Math.max(
        LARGE_FLOOR,
        median(ofType.map(gross)) * LARGE_FACTOR
      )
      for (const e of ofType) if (gross(e) > limit) out.push(e.id)
    }
    return out
  }),
  entryRule("duplicate", "app", (ctx) => {
    /*
     * Entries that share their figures, or a receipt file, with another
     * entry. Both of a pair are flagged, since either may be the extra one.
     * Parts of one split receipt share both on purpose and are not a pair.
     */
    const out = new Set<string>()
    const group = (keysOf: (e: Entry) => (string | null)[]) => {
      const seen = new Map<string, Entry[]>()
      for (const e of ctx.entries) {
        for (const key of new Set(keysOf(e))) {
          if (key === null) continue
          const earlier = seen.get(key)
          if (!earlier) {
            seen.set(key, [e])
            continue
          }
          for (const other of earlier) {
            if (!sameSplit(other, e)) out.add(other.id).add(e.id)
          }
          earlier.push(e)
        }
      }
    }
    group((e) => [figuresKey(e)])
    group((e) => (e.atts ?? []).map(fileKey))
    return out
  }),
  entryRule("vatNotDeductible", "AVL 114 § 1 mom. 3 kohta", (ctx) =>
    idsWhere(ctx, (e) => vatNotDeductible(e, ctx.cats))
  ),
  entryRule("privateUseNoVat", "AVL 21 §", (ctx) => {
    // Line 314 only: a car's private use depends on how much of it was deducted.
    const goods = ctx.entries.filter(
      (e) => ctx.cats.get(e.catId)?.line === "314"
    )
    if (goods.length === 0) return []
    // What a natural person may take into private use in a year before it carries VAT.
    const free = limitOn("privateUseFree", goods[0].date)
    const total = goods.reduce((sum, e) => sum + calcEntry(e).net, 0)
    if (total <= free) return []
    return idsWhere(
      ctx,
      (e) => ctx.cats.get(e.catId)?.line === "314" && e.vatRate === 0
    )
  }),
  entryRule("lateCash", "KPL 2:4", (ctx) => {
    // A cash payment is booked without delay and day by day.
    const added = addedOn(ctx.log)
    return idsWhere(ctx, (e) => {
      const paid = e.cash ? paidDate(e) : null
      const on = added.get(e.id)
      return !!paid && !!on && daysFrom(paid, on) > CASH_BOOKING_DAYS
    })
  }),
])

/**
 * The ids of the entries a check flags among `entries`, which are the
 * selected year's: the large-amount and zero-VAT checks compare an entry with
 * the rest of the year, so the ledger must not narrow them to a month first.
 */
export function flaggedEntryIds(
  check: EntryCheck,
  entries: readonly Entry[],
  cats: CategoryMap,
  today: string,
  log: readonly ChangeRecord[] = []
): Set<string> {
  return new Set(ENTRY_RULES.get(check).check({ entries, cats, today, log }))
}
