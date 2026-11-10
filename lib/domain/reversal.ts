import { calcEntry } from "@/lib/domain/calc"
import { isVoucherNumber } from "@/lib/domain/voucher"
import { yearOf } from "@/lib/domain/dates"
import { paidDate, paidOnFor } from "@/lib/domain/open-items"
import type { Entry } from "@/lib/domain/types"

/**
 * Links between a refund, a credit note or a correction and the entry it
 * reverses (§8.4). The link is stored on the reversing entry as
 * `Entry.reverses`; everything here reads it from either end.
 */

/** The entry `entry` reverses, or undefined when it reverses none or the target is gone. */
export function reversedEntry(
  entry: Pick<Entry, "reverses">,
  entries: readonly Entry[]
): Entry | undefined {
  if (entry.reverses === undefined) return undefined
  return entries.find((e) => e.id === entry.reverses)
}

/** The entries that reverse `entry`, in book order. */
export function reversingEntries(
  entry: Pick<Entry, "id">,
  entries: readonly Entry[]
): Entry[] {
  return entries.filter((e) => e.reverses === entry.id)
}

/**
 * Whether pointing `from` at `to` would close a loop: `to` is `from`, or
 * `to` already reverses `from` through any number of steps.
 */
export function reversalLoops(
  from: string,
  to: string,
  entries: readonly Pick<Entry, "id" | "reverses">[]
): boolean {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const seen = new Set<string>()
  let at: string | undefined = to
  while (at !== undefined && !seen.has(at)) {
    if (at === from) return true
    seen.add(at)
    at = byId.get(at)?.reverses
  }
  return false
}

/**
 * The entries the one with id `selfId` may be linked to, nearest in date to
 * `date` first. Any year qualifies, because a credit note often arrives in
 * the year after the invoice.
 */
export function reversalCandidates(
  selfId: string,
  date: string,
  entries: readonly Entry[]
): Entry[] {
  const at = Date.parse(date)
  const distance = (e: Entry) =>
    Number.isNaN(at) ? 0 : Math.abs(Date.parse(e.date) - at)
  return entries
    .filter((e) => !reversalLoops(selfId, e.id, entries))
    .sort(
      (a, b) => distance(a) - distance(b) || (b.voucher ?? 0) - (a.voucher ?? 0)
    )
}

/**
 * How `target` is named from an entry dated in `fromYear`: its voucher number,
 * with the year added when it is another year's, since numbers restart yearly
 * (§4). Empty for an entry that has no number yet.
 */
export function reversalLabel(target: Entry, fromYear: number): string {
  if (!isVoucherNumber(target.voucher)) return ""
  const year = yearOf(target.date)
  return year === fromYear
    ? String(target.voucher)
    : `${target.voucher}/${year}`
}

/**
 * What a credit settles when it takes the whole of an open voucher, as a
 * credit note does for an invoice (§8.27): the voucher it reverses and the
 * credit itself, both marked paid on the credit's date, so they net to
 * nothing as open items under either way of counting. Null when the target is
 * gone or already paid, the credit is paid on another day, is on the other
 * side, or does not cancel the target's gross amount exactly. A part credit
 * stays open beside its voucher until the money moves.
 */
export function creditSettlement(
  credit: Entry,
  entries: readonly Entry[]
): { target: Entry; credit: Entry } | null {
  const target = reversedEntry(credit, entries)
  if (!target || target.type !== credit.type) return null
  if (target.paidOn !== null) return null
  const creditPaid = paidDate(credit)
  if (creditPaid !== null && creditPaid !== credit.date) return null
  if (calcEntry(credit).gross !== -calcEntry(target).gross) return null
  const settled: Entry = { ...credit }
  delete settled.paidOn
  delete settled.cash
  return {
    target: { ...target, paidOn: paidOnFor(target.date, credit.date) },
    credit: settled,
  }
}

/*
 * The CSV cell. The leading "#" keeps Excel from reading "12/2026" as the
 * date December 2026. A voucher number is unique within a year, so number and
 * year name one entry.
 */

/** The `reverses` cell for `target`, or "" when it has no voucher number. */
export function reversalKey(target: Entry): string {
  return isVoucherNumber(target.voucher)
    ? `#${target.voucher}/${yearOf(target.date)}`
    : ""
}

/** The year and voucher number a `reverses` cell names, or null. */
export function parseReversalKey(
  cell: string
): { year: number; voucher: number } | null {
  const m = /^#?(\d+)\/(\d{4})$/.exec(cell.trim())
  if (!m) return null
  const voucher = Number(m[1])
  return isVoucherNumber(voucher) ? { year: Number(m[2]), voucher } : null
}
