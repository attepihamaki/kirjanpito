import type { RecurringEntry } from "@/lib/domain/recurring"
import { indexCategories } from "@/lib/domain/types"
import type { Category, Entry, EuPurchase } from "@/lib/domain/types"

/**
 * The category says whether an entry is an EU purchase (§6.9).
 * `Entry.euPurchase` is a copy of it, because `calcEntry` works from the entry
 * alone, so the two are kept equal here.
 */

/**
 * Copy each entry's category's EU status onto it. An EU purchase's amount is
 * always without VAT. An entry that does not change stays the same object, so
 * the change log finds nothing to record.
 */
export function syncEuPurchase(
  entries: readonly Entry[],
  cats: readonly Category[]
): Entry[] {
  const byId = indexCategories(cats)
  return entries.map((e) => {
    const cat = byId.get(e.catId)
    if (!cat) return e
    const kind = cat.euPurchase
    if (kind === e.euPurchase && (!kind || e.amountMode === "net")) return e
    if (kind) return { ...e, euPurchase: kind, amountMode: "net" }
    const next = { ...e }
    delete next.euPurchase
    return next
  })
}

const SUFFIX: Readonly<Record<EuPurchase, string>> = {
  goods: "EU, tavarat",
  services: "EU, palvelut",
}

/**
 * The EU category on the same income statement line as `cat`, so a purchase
 * moved to it keeps its Form 5 line. A default category moves to a default one
 * if its line has one. Anything else gets a custom category of its own, and
 * one is added to `cats` when it does not exist yet.
 */
function euSibling(
  cat: Category,
  kind: EuPurchase,
  cats: Category[],
  makeId: () => string
): Category {
  const name = `${cat.name} – ${SUFFIX[kind]}`
  const found = cats.find(
    (c) =>
      c.line === cat.line &&
      c.euPurchase === kind &&
      (c.name === name || (!cat.custom && !c.custom))
  )
  if (found) return found
  const created: Category = {
    id: `c-${makeId()}`,
    line: cat.line,
    name,
    vatRate: cat.vatRate,
    euPurchase: kind,
    enabled: true,
    custom: true,
  }
  cats.push(created)
  return created
}

export interface EuPurchaseBook {
  entries: Entry[]
  recurring: RecurringEntry[]
  cats: Category[]
}

/**
 * Move entries and templates marked as EU purchases, on a category that does
 * not say so, to an EU category on the same line. A stored book or an older
 * file can hold these. Only the category changes, so every figure stays as it
 * was, and a filed period stays correct.
 */
export function moveEuPurchasesToCategories(
  book: {
    entries: readonly Entry[]
    recurring: readonly RecurringEntry[]
    cats: readonly Category[]
  },
  makeId: () => string
): EuPurchaseBook {
  const cats = [...book.cats]
  const move = <T extends { catId: string; euPurchase?: EuPurchase }>(
    item: T
  ): T => {
    const cat = cats.find((c) => c.id === item.catId)
    if (!item.euPurchase || !cat || cat.euPurchase) return item
    return { ...item, catId: euSibling(cat, item.euPurchase, cats, makeId).id }
  }
  const entries = book.entries.map(move)
  const recurring = book.recurring.map(move)
  return { entries, recurring, cats }
}
