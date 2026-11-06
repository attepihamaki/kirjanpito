import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { filterPeriod } from "@/lib/domain/period"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  asPeriod,
  periodContaining,
  periodFromKey,
  vatPeriods,
  type VatPeriod,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"

/**
 * The money that moved for a VAT return (§6.6): the tax paid to Verohallinto or
 * the refund received from it. Each is an entry on a settlement line, so it
 * has a voucher number and can carry the bank statement as its receipt. VAT is
 * a debt to the state or a claim on it, not income or an expense, so these
 * entries stay out of the income statement, Form 5 and the VAT return.
 */

function isSettlement(e: Entry, cats: CategoryMap): boolean {
  const cat = cats.get(e.catId)
  return !!cat && !!LINE_BY_KEY.get(cat.line)?.settlement
}

/** Signed like a report's `due`: positive paid, negative received. */
function settlementAmount(e: Entry): Cents {
  const { gross } = calcEntry(e)
  return (e.type === "expense" ? gross : -gross) + 0
}

/**
 * The period a payment made on `date` most likely settles: the one before the
 * period the date falls in. A return is due in the second month after its
 * period, so September's tax is paid in November, while October is open.
 */
export function defaultSettledKey(kind: VatPeriodKind, date: string): string {
  const { from } = periodContaining(kind, date)
  const d = new Date(`${from}T00:00:00Z`)
  d.setUTCDate(0)
  return periodContaining(kind, d.toISOString().slice(0, 10)).key
}

/** The period an entry settles: its own record, or the likely one by date. */
export function settledKey(e: Entry, kind: VatPeriodKind): string {
  return e.settles && periodFromKey(e.settles)
    ? e.settles
    : defaultSettledKey(kind, e.date)
}

export interface SettlementRow {
  entry: Entry
  period: VatPeriod
  amount: Cents
}

export interface SettlementSummary {
  rows: SettlementRow[]
  /** A row settles more than the period, so its amount cannot be compared. */
  wider: boolean
  /** Settled minus due, or null when there is nothing to compare. */
  difference: Cents | null
}

/**
 * The payments and refunds that touch `p`, whatever period length they were
 * recorded under, so changing how often VAT is filed loses none (§6.5): three
 * monthly payments compare against their quarter. A quarter's payment seen
 * from one of its months cannot be split, so it is listed and not compared.
 */
export function settlementSummary(
  p: VatPeriod,
  entries: readonly Entry[],
  cats: CategoryMap,
  kind: VatPeriodKind,
  due: Cents
): SettlementSummary {
  const rows: SettlementRow[] = []
  for (const entry of entries) {
    if (!isSettlement(entry, cats)) continue
    const period = periodFromKey(settledKey(entry, kind))
    if (!period || period.from > p.to || period.to < p.from) continue
    rows.push({ entry, period, amount: settlementAmount(entry) })
  }
  rows.sort(
    (a, b) =>
      a.entry.date.localeCompare(b.entry.date) ||
      (a.entry.voucher ?? 0) - (b.entry.voucher ?? 0)
  )
  const wider = rows.some((r) => r.period.from < p.from || r.period.to > p.to)
  const difference =
    rows.length === 0 || wider
      ? null
      : rows.reduce((sum, r) => sum + r.amount, 0) - due + 0
  return { rows, wider, difference }
}

/** A closed period whose tax or refund has no entry yet. */
export interface UnsettledDue {
  key: string
  /** Signed like a report's `due`: positive to pay, negative to receive. */
  due: Cents
}

/**
 * The closed periods with tax to pay or a refund to receive and no settlement
 * entry (§6.6), oldest first. A bank statement row that equals one of these
 * is most likely that payment (§8.16).
 */
export function unsettledDues(
  entries: readonly Entry[],
  cats: CategoryMap,
  kind: VatPeriodKind,
  today: string
): UnsettledDue[] {
  if (entries.length === 0) return []
  const years = entries.map((e) => yearOf(e.date))
  const out: UnsettledDue[] = []
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    for (const p of vatPeriods(kind, y)) {
      if (p.to >= today) continue
      const { due } = vatReport(filterPeriod(entries, asPeriod(p)), cats)
      if (due === 0) continue
      if (settlementSummary(p, entries, cats, kind, due).rows.length) continue
      out.push({ key: p.key, due })
    }
  }
  return out
}
