import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { canBeUnpaid, paidOnFor } from "@/lib/domain/open-items"
import { tagsField } from "@/lib/domain/tags"
import type { CategoryMap, Cents, Entry } from "@/lib/domain/types"

/**
 * Credit loss (luottotappio, §6.18). A sale that will not be paid is written
 * off on the day the loss is found: each open income entry gets a reversing
 * entry of the same category and rate, dated that day and marked
 * `creditLoss`, and the open entry is marked paid on that day, so the
 * receivable closes.
 *
 * The pair then nets out the way AVL 78 § 1 mom. 3 kohta and §6.3 need,
 * whichever way the trader is taxed:
 * - VAT by the invoice date: the sale stays on its own return and the
 *   reversal takes the tax off the return of the loss's month (AVL 139 §).
 * - Cash-basis VAT (§6.16): both fall on the loss's date and cancel, unless
 *   the 12-month rule already reported the sale, which the reversal then
 *   takes back.
 * - An ammatinharjoittaja: both count in the year of the loss and cancel,
 *   since the money never came.
 * - A liikkeenharjoittaja: the sale stays in its year and the reversal lowers
 *   the sales of the loss's year.
 */

/** Whether `entry` is an unpaid sale a credit loss can write off. */
export function canWriteOff(entry: Entry, cats: CategoryMap): boolean {
  if (entry.type !== "income" || entry.paidOn !== null) return false
  if (entry.creditLoss || entry.amount <= 0) return false
  const cat = cats.get(entry.catId)
  return canBeUnpaid(cat ? LINE_BY_KEY.get(cat.line) : undefined)
}

export interface CreditLoss {
  /** The open entries, now paid on the loss's date. */
  updated: Entry[]
  /** One reversing entry for each. */
  added: Entry[]
  /** The gross amount written off. */
  gross: Cents
}

/**
 * The entries that write `open` off on `on`. The caller has checked
 * `canWriteOff` and that `on` is not before any entry's date.
 */
export function creditLossEntries(
  open: readonly Entry[],
  on: string,
  makeId: () => string,
  describe: (entry: Entry) => string
): CreditLoss {
  const updated: Entry[] = []
  const added: Entry[] = []
  let gross = 0
  for (const entry of open) {
    const paid: Entry = { ...entry }
    const paidOn = paidOnFor(entry.date, on)
    if (paidOn === undefined) delete paid.paidOn
    else paid.paidOn = paidOn
    updated.push(paid)
    added.push({
      id: makeId(),
      date: on,
      description: describe(entry),
      type: "income",
      catId: entry.catId,
      amount: -entry.amount,
      vatRate: entry.vatRate,
      amountMode: entry.amountMode,
      reverses: entry.id,
      creditLoss: true,
      ...(entry.buyerVatId ? { buyerVatId: entry.buyerVatId } : {}),
      ...(entry.party ? { party: entry.party } : {}),
      // An advance's tax falls on its payment, so the reversal's does too (§6.17).
      ...(entry.advance ? { advance: true as const } : {}),
      ...tagsField(entry.tags),
    })
    gross += calcEntry(entry).gross
  }
  return { updated, added, gross }
}

const reversedCache = new WeakMap<ReadonlyMap<string, Entry>, Set<string>>()

/** The ids of the entries a credit loss has written off. */
export function writtenOffIds(byId: ReadonlyMap<string, Entry>): Set<string> {
  let ids = reversedCache.get(byId)
  if (!ids) {
    ids = new Set()
    for (const e of byId.values()) {
      if (e.creditLoss && e.reverses) ids.add(e.reverses)
    }
    reversedCache.set(byId, ids)
  }
  return ids
}
