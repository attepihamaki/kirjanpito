import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { billBarcode } from "@/lib/domain/bill-payment"
import { calcEntry } from "@/lib/domain/calc"
import { daysBetween } from "@/lib/domain/dates"
import { canBeUnpaid } from "@/lib/domain/open-items"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * Bills received and not yet paid, by when they fall due (§8.30). Worked out
 * from the entries each time and never stored, like the receivables of §8.27.
 */

/** How many days ahead counts as due soon. */
const DUE_SOON_DAYS = 7

/**
 * `overdue` is past its due date, `soon` falls due today or within
 * `DUE_SOON_DAYS`, `later` after that, and `noDue` has no due date.
 */
export const PAYABLE_GROUPS = ["overdue", "soon", "later", "noDue"] as const

export type PayableGroup = (typeof PAYABLE_GROUPS)[number]

/** The group for a due date on `today`. */
export function payableGroup(
  due: string | undefined,
  today: string
): PayableGroup {
  if (!due) return "noDue"
  const ahead = daysBetween(today, due)
  if (ahead < 0) return "overdue"
  return ahead <= DUE_SOON_DAYS ? "soon" : "later"
}

/** One bill: an open expense voucher, with the parts of a split receipt together. */
export interface Payable {
  /** The voucher's entries: one, or every open part of a split receipt. */
  entries: Entry[]
  /** The first entry, which the row opens. */
  lead: Entry
  /** What is still to pay, gross. */
  open: Cents
  /** The earliest due date among the parts, if any has one. */
  due?: string
  /** Whole days past the due date, 0 when not past it. */
  daysLate: number
  group: PayableGroup
  /** The payee's IBAN and the reference, from the first part that has them. */
  iban?: string
  reference?: string
  /** The virtual barcode for what is still to pay, when the details make one. */
  barcode?: string
}

export interface PayablesReport {
  items: Payable[]
  totals: Record<PayableGroup, Cents>
  total: Cents
}

const emptyTotals = (): Record<PayableGroup, Cents> => ({
  overdue: 0,
  soon: 0,
  later: 0,
  noDue: 0,
})

/** Whether an entry is a bill still to pay. */
function isPayable(entry: Entry, cats: CategoryMap): boolean {
  if (entry.type !== "expense" || entry.paidOn !== null) return false
  const cat = cats.get(entry.catId)
  return canBeUnpaid(cat && LINE_BY_KEY.get(cat.line))
}

/**
 * Every open bill in the book, across years, the one falling due first at the
 * top and those with no due date last. A voucher dated after `today` is still
 * listed: a bill can arrive before its delivery date.
 */
export function payablesReport(
  entries: readonly Entry[],
  cats: CategoryMap,
  today: string
): PayablesReport {
  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    if (!isPayable(e, cats)) continue
    const key = e.split ? `split:${e.split}` : `id:${e.id}`
    const list = groups.get(key)
    if (list) list.push(e)
    else groups.set(key, [e])
  }

  const totals = emptyTotals()
  let total = 0
  const items: Payable[] = []
  for (const parts of groups.values()) {
    parts.sort(
      (a, b) =>
        (a.voucher ?? Infinity) - (b.voucher ?? Infinity) ||
        a.date.localeCompare(b.date)
    )
    const lead = parts[0]
    const open = parts.reduce((sum, e) => sum + calcEntry(e).gross, 0)
    const due = parts
      .map((e) => e.due)
      .filter((d): d is string => !!d)
      .sort()[0]
    const group = payableGroup(due, today)
    const iban = parts.find((e) => e.iban)?.iban
    const reference = parts.find((e) => e.reference)?.reference
    const barcode =
      open > 0 ? billBarcode({ ...lead, iban, reference, due }, open) : null
    items.push({
      entries: parts,
      lead,
      open,
      ...(due ? { due } : {}),
      daysLate: due ? Math.max(0, daysBetween(due, today)) : 0,
      group,
      ...(iban ? { iban } : {}),
      ...(reference ? { reference } : {}),
      ...(barcode ? { barcode } : {}),
    })
    totals[group] += open
    total += open
  }

  items.sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due) || byDate(a, b)
    if (a.due) return -1
    if (b.due) return 1
    return byDate(a, b)
  })
  return { items, totals, total }
}

const byDate = (a: Payable, b: Payable) =>
  a.lead.date.localeCompare(b.lead.date)
