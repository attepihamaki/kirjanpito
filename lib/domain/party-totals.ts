import { LINE_BY_KEY, offStatement } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Customer } from "@/lib/domain/invoice"
import type { Cents, CategoryMap, Entry, EntryType } from "@/lib/domain/types"

/**
 * Sales per customer and spend per supplier for one year (§8.9). An entry
 * counts for the register party its `party` names. Amounts are net, as on
 * the rest of Yhteenveto, and a fixed asset or a VAT settlement counts on
 * neither side (§5), so the rows and the two remainders add up to the
 * summary's own income or expense total.
 */

/** How many parties are listed by name before the rest are summed up. */
const PARTY_TOP = 10

export interface PartyTotal {
  party: Customer
  net: Cents
  /** How many vouchers make up `net`. */
  count: number
}

export interface PartyTotals {
  /** The largest parties, largest first, at most `PARTY_TOP`. */
  top: PartyTotal[]
  /** The parties after the top ones, summed. */
  rest: { net: Cents; count: number; parties: number }
  /** Vouchers that name no party, or one no longer in the register. */
  unlinked: { net: Cents; count: number }
  total: Cents
}

/** One side's totals by party: sales on `"income"`, costs on `"expense"`. */
export function partyTotals(
  entries: readonly Entry[],
  parties: readonly Customer[],
  cats: CategoryMap,
  year: number,
  side: EntryType,
  limit: number = PARTY_TOP
): PartyTotals {
  const byId = new Map(parties.map((p) => [p.id, p]))
  const sums = new Map<string, PartyTotal>()
  const unlinked = { net: 0, count: 0 }
  let total = 0

  for (const e of entries) {
    if (e.type !== side || yearOf(e.date) !== year) continue
    const cat = cats.get(e.catId)
    if (cat && offStatement(LINE_BY_KEY.get(cat.line))) continue
    const { net } = calcEntry(e)
    total += net
    const party = e.party === undefined ? undefined : byId.get(e.party)
    if (!party) {
      unlinked.net += net
      unlinked.count++
      continue
    }
    const sum = sums.get(party.id) ?? { party, net: 0, count: 0 }
    sum.net += net
    sum.count++
    sums.set(party.id, sum)
  }

  const ranked = [...sums.values()].sort(
    (a, b) => b.net - a.net || a.party.name.localeCompare(b.party.name, "fi")
  )
  const rest = ranked.slice(limit)
  return {
    top: ranked.slice(0, limit),
    rest: {
      net: rest.reduce((s, r) => s + r.net, 0),
      count: rest.reduce((s, r) => s + r.count, 0),
      parties: rest.length,
    },
    unlinked,
    total,
  }
}

/** `part` as a percentage of `whole` to one decimal, or null when the whole is zero. */
export function sharePercent(part: Cents, whole: Cents): number | null {
  if (whole === 0) return null
  return Math.round((part / whole) * 1000) / 10
}
