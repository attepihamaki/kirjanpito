import { isoDate, monthOf, yearOf } from "@/lib/domain/dates"
import type {
  AmountMode,
  Cents,
  Entry,
  EntryType,
  EuPurchase,
} from "@/lib/domain/types"
import { rateOnDate } from "@/lib/domain/vat-rates"

/**
 * Recurring entries (§8.5): rent, a phone bill, YEL. A template lives in
 * `settings.json`, and nothing books itself: the user adds a month's entries
 * with one click.
 *
 * Whether a month already has its entry is read from the entries rather than
 * stored. An entry on the same side and category with the same description
 * counts, so a changed amount still counts, a deleted entry comes due again,
 * and the answer survives a round trip through the CSV.
 */
export interface RecurringEntry {
  id: string
  description: string
  type: EntryType
  catId: string
  amount: Cents
  vatRate: number
  amountMode: AmountMode
  euPurchase?: EuPurchase
  /** 1 to 31. A shorter month uses its last day. */
  day: number
  /** `"2026-10"`: the first month it is due. */
  from: string
}

/** `"2026-10"`, the form a month has in `RecurringEntry.from`. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function normalized(description: string): string {
  return description.trim().toLocaleLowerCase("fi")
}

/** The template this entry belongs to, by side, category and description. */
export function matchRecurring(
  templates: readonly RecurringEntry[],
  entry: Pick<Entry, "type" | "catId" | "description">
): RecurringEntry | undefined {
  const description = normalized(entry.description)
  return templates.find(
    (r) =>
      r.type === entry.type &&
      r.catId === entry.catId &&
      normalized(r.description) === description
  )
}

/** The template's date in `month`, on its day or the month's last day. */
export function recurringDate(day: number, month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  for (let d = day; d > 0; d--) {
    const iso = isoDate(y, m, d)
    if (iso) return iso
  }
  return `${month}-01`
}

/** The templates that have begun by `month` and have no entry in it. */
export function dueRecurring(
  templates: readonly RecurringEntry[],
  month: string,
  entries: readonly Entry[]
): RecurringEntry[] {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const inMonth = entries.filter(
    (e) => yearOf(e.date) === y && monthOf(e.date) === m
  )
  return templates.filter(
    (r) =>
      r.from <= month &&
      !inMonth.some((e) => matchRecurring([r], e) !== undefined)
  )
}

/**
 * The template as an entry of `month`. A rate that changed since the template
 * was made follows the date, as it does in the entry dialog (§5).
 */
export function recurringToEntry(
  r: RecurringEntry,
  month: string,
  makeId: () => string
): Entry {
  const date = recurringDate(r.day, month)
  return {
    id: makeId(),
    date,
    description: r.description,
    type: r.type,
    catId: r.catId,
    amount: r.amount,
    vatRate: rateOnDate(r.vatRate, date),
    amountMode: r.amountMode,
    ...(r.euPurchase ? { euPurchase: r.euPurchase } : {}),
  }
}

/** A template from an entry. The day comes from its date. */
export function entryToRecurring(
  entry: Entry,
  id: string,
  from: string
): RecurringEntry {
  return {
    id,
    description: entry.description.trim(),
    type: entry.type,
    catId: entry.catId,
    amount: entry.amount,
    vatRate: entry.vatRate,
    amountMode: entry.amountMode,
    ...(entry.euPurchase ? { euPurchase: entry.euPurchase } : {}),
    day: Number(entry.date.slice(8, 10)),
    from,
  }
}
