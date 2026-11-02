import { yearOf } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"

/**
 * Voucher numbers (tositenumero, §4).
 *
 * The Accounting Act (KPL 2:5) has every entry rest on a dated voucher that
 * is "järjestelmällisesti numeroitu tai vastaavalla tavalla yksilöity", with
 * an easy-to-check link between the transaction, the voucher and the entry.
 * An entry here is its own voucher, so it carries the number.
 *
 * The numbers run in one series per financial year, from 1. An entry keeps
 * its number for as long as it stays in that year, since the user may have
 * written it on a paper receipt, and nothing is ever renumbered to close a
 * gap. A new entry takes the year's highest number plus one, so deleting the
 * newest entry frees its number again.
 */

/** Whether `n` can be a voucher number at all. */
export function isVoucherNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0
}

/**
 * Give a number to every entry that has none, or whose number another entry
 * of its year already holds. The entry earlier in `entries` keeps a
 * duplicated number, so pass the book's own entries before ones being added.
 * Newly numbered entries follow the year's highest number, in date order.
 *
 * Entries that keep their number are returned as the same objects, and the
 * array itself when nothing changes, so a store update stays cheap.
 */
export function assignVouchers(entries: readonly Entry[]): readonly Entry[] {
  const taken = new Map<number, Set<number>>()
  const needs: number[] = []

  entries.forEach((e, i) => {
    const year = yearOf(e.date)
    let used = taken.get(year)
    if (!used) taken.set(year, (used = new Set()))
    if (isVoucherNumber(e.voucher) && !used.has(e.voucher)) {
      used.add(e.voucher)
    } else {
      needs.push(i)
    }
  })
  if (needs.length === 0) return entries

  const next = new Map<number, number>()
  for (const [year, used] of taken) next.set(year, Math.max(0, ...used) + 1)

  needs.sort((a, b) => entries[a].date.localeCompare(entries[b].date) || a - b)
  const out = [...entries]
  for (const i of needs) {
    const year = yearOf(out[i].date)
    const n = next.get(year) ?? 1
    out[i] = { ...out[i], voucher: n }
    next.set(year, n + 1)
  }
  return out
}

/**
 * The number an edited entry keeps: its old one while it stays in the same
 * year, none (so `assignVouchers` gives it the next one) when it moves to
 * another year's series.
 */
export function keepVoucher(edited: Entry, previous: Entry | undefined): Entry {
  if (!previous) return edited
  const out: Entry = { ...edited }
  delete out.voucher
  if (
    yearOf(previous.date) === yearOf(edited.date) &&
    isVoucherNumber(previous.voucher)
  ) {
    out.voucher = previous.voucher
  }
  return out
}
