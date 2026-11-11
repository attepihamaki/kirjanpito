import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { canBeUnpaid, paidDate } from "@/lib/domain/open-items"
import { paidChangeHitsForm5, type LockMarks } from "@/lib/domain/period-lock"
import type { Attachment, CategoryMap, Entry } from "@/lib/domain/types"

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

/** What identifies an attachment within a split: its stored file, else its listed path. */
function receiptKey(a: Attachment): string {
  return a.id ?? a.path ?? a.name
}

/**
 * One receipt is one set of files, so a file added to or removed from a part
 * is added to or removed from the other parts (§8.4). It carries the
 * difference rather than replacing the list, so a file a sibling holds on its
 * own survives. The shared file keeps its `id`, so the archive stores it once
 * (§7.2).
 */
export function shareReceipts(
  before: readonly Entry[],
  after: readonly Entry[]
): Entry[] {
  const was = new Map(before.map((e) => [e.id, e]))
  const sources = new Map<
    string,
    { added: Attachment[]; removed: Set<string> }
  >()
  for (const e of after) {
    const old = was.get(e.id)
    if (e.split === undefined || !old || sources.has(e.split)) continue
    const oldKeys = new Set((old.atts ?? []).map(receiptKey))
    const newKeys = new Set((e.atts ?? []).map(receiptKey))
    const added = (e.atts ?? []).filter((a) => !oldKeys.has(receiptKey(a)))
    const removed = new Set([...oldKeys].filter((k) => !newKeys.has(k)))
    if (added.length || removed.size) sources.set(e.split, { added, removed })
  }
  if (sources.size === 0) return [...after]

  const changedIds = new Set(
    after
      .filter((e) => {
        const old = was.get(e.id)
        return old && receiptsOf(old) !== receiptsOf(e)
      })
      .map((e) => e.id)
  )
  return after.map((e) => {
    const source = e.split === undefined ? undefined : sources.get(e.split)
    if (!source || changedIds.has(e.id)) return e
    const have = (e.atts ?? []).filter(
      (a) => !source.removed.has(receiptKey(a))
    )
    const keys = new Set(have.map(receiptKey))
    const atts = [
      ...have,
      ...source.added
        .filter((a) => !keys.has(receiptKey(a)))
        .map((a) => ({ ...a })),
    ]
    const next: Entry = { ...e }
    if (atts.length) next.atts = atts
    else delete next.atts
    return next
  })
}

function receiptsOf(e: Entry): string {
  return (e.atts ?? []).map(receiptKey).join("|")
}

/**
 * Fold `entry` into the sibling with the lowest voucher number (§8.4). The
 * amounts add in their shared mode, so the receipt's total is unchanged, and the
 * sibling keeps its category and rate. When only two parts were left the
 * survivor stops being a split. Null when `entry` has no siblings.
 */
export function mergeSplitPart(
  entry: Entry,
  entries: readonly Entry[]
): { target: Entry; result: Entry } | null {
  const siblings = splitSiblings(entry, entries)
  if (siblings.length === 0) return null
  const target = [...siblings].sort(
    (a, b) => (a.voucher ?? Infinity) - (b.voucher ?? Infinity)
  )[0]
  const result: Entry = { ...target, amount: target.amount + entry.amount }
  if (siblings.length === 1) delete result.split
  return { target, result }
}

/** The fields of a part carved off an entry. */
export interface SplitPart {
  amount: number
  catId: string
  vatRate: number
}

export type CarveResult =
  | { ok: true; original: Entry; part: Entry }
  | { ok: false; error: "amount" | "category" }

/**
 * Whether an entry on `catId` can be split, or be split into it (§8.4). An EU
 * purchase has no VAT in its amount, and a VAT payment, an owner's transfer or a loan movement is
 * one sum with nothing to divide.
 */
export function canSplitLine(
  catId: string,
  cats: CategoryMap,
  euPurchase?: Entry["euPurchase"]
): boolean {
  if (euPurchase || cats.get(catId)?.euPurchase) return false
  const line = LINE_BY_KEY.get(cats.get(catId)?.line ?? "")
  return !!line && !line.settlement && !line.owner && !line.loan
}

/**
 * Carve `part` off `entry` (§8.4). The original keeps what is left of its
 * amount, in the same mode, and both take the split link. The new part is the
 * same receipt: same date, side, description, mode, files and payment, so the
 * rule that parts share a payment already holds when it is made. `ids` are the
 * part's own id and the link, used when the entry is not split yet.
 *
 * The part must be smaller than the entry and have its sign, so the two always
 * add up to what the receipt said.
 */
export function carveSplit(
  entry: Entry,
  part: SplitPart,
  cats: CategoryMap,
  ids: { part: string; split: string }
): CarveResult {
  const amount = part.amount
  if (
    !Number.isInteger(amount) ||
    amount === 0 ||
    Math.sign(amount) !== Math.sign(entry.amount) ||
    Math.abs(amount) >= Math.abs(entry.amount)
  ) {
    return { ok: false, error: "amount" }
  }
  const cat = cats.get(part.catId)
  const line = cat && LINE_BY_KEY.get(cat.line)
  if (
    !cat ||
    !line ||
    line.side !== entry.type ||
    !canSplitLine(part.catId, cats) ||
    !canSplitLine(entry.catId, cats, entry.euPurchase)
  ) {
    return { ok: false, error: "category" }
  }

  const split = entry.split ?? ids.split
  const next: Entry = {
    id: ids.part,
    date: entry.date,
    description: entry.description,
    type: entry.type,
    catId: part.catId,
    amount,
    vatRate: part.vatRate,
    amountMode: entry.amountMode,
    split,
  }
  if (entry.atts) next.atts = entry.atts.map((a) => ({ ...a }))
  if (entry.tags) next.tags = [...entry.tags]
  if (canBeUnpaid(line)) {
    if (entry.paidOn !== undefined) next.paidOn = entry.paidOn
    if (entry.cash) next.cash = true
    if (entry.periodFrom && entry.periodTo) {
      next.periodFrom = entry.periodFrom
      next.periodTo = entry.periodTo
    }
  }
  return {
    ok: true,
    original: { ...entry, amount: entry.amount - amount, split },
    part: next,
  }
}
