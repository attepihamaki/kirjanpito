import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { canBeUnpaid, paidDate } from "@/lib/domain/open-items"
import { paidChangeHitsForm5, type LockMarks } from "@/lib/domain/period-lock"
import type { CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The parts of a receipt that was split across categories or VAT rates (§8.4).
 * They are ordinary entries linked by `Entry.split`.
 */

/** The other parts of `entry`'s split, in book order. Empty for an ordinary entry. */
export function splitSiblings(
  entry: Pick<Entry, "id" | "split">,
  entries: readonly Entry[]
): Entry[] {
  if (entry.split === undefined) return []
  return entries.filter((e) => e.id !== entry.id && e.split === entry.split)
}

/** What a receipt's payment is: the day it was paid, or open, and whether in cash. */
function payment(e: Entry): string {
  return `${paidDate(e) ?? "open"}|${e.cash ? "cash" : ""}`
}

/**
 * One receipt is one payment, so the parts of a split share their payment
 * (§8.5): when a part's paid date, open state or cash flag changes, the other
 * parts take it. `before` and `after` are the entries without and with the
 * change, and the result is `after` with the siblings brought along.
 *
 * Only a change is carried across, so editing another field of a part never
 * rewrites its siblings. A sibling is left alone when its line cannot be
 * unpaid, or when the move would reach into a year whose Form 5 is filed
 * (§8.11).
 */
export function sharePayment(
  before: readonly Entry[],
  after: readonly Entry[],
  cats: CategoryMap,
  marks: Pick<LockMarks, "form5Filed">
): Entry[] {
  const was = new Map(before.map((e) => [e.id, e]))
  const sources = new Map<string, Entry>()
  for (const e of after) {
    const old = was.get(e.id)
    if (e.split === undefined || !old || payment(old) === payment(e)) continue
    if (!sources.has(e.split)) sources.set(e.split, e)
  }
  if (sources.size === 0) return [...after]

  return after.map((e) => {
    const source = e.split === undefined ? undefined : sources.get(e.split)
    if (!source || source.id === e.id) return e
    const line = LINE_BY_KEY.get(cats.get(e.catId)?.line ?? "")
    if (!canBeUnpaid(line)) return e

    const paid = paidDate(source)
    if (paidChangeHitsForm5(paidDate(e), paid, marks)) return e

    const next: Entry = { ...e }
    delete next.paidOn
    delete next.cash
    if (paid === null) next.paidOn = null
    else if (paid !== e.date) next.paidOn = paid
    if (source.cash && paid !== null) next.cash = true
    return next
  })
}
