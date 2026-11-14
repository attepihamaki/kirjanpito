import { filterPeriod } from "@/lib/domain/period"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import {
  asPeriod,
  type TimelinePeriod,
  type VatPeriodKind,
  type VatPeriodStatus,
} from "@/lib/domain/vat-deadline"
import { settlementSummary } from "@/lib/domain/vat-settlement"

/**
 * What the owner can take out of the business account today without leaving
 * it short (§8.12): the bank balance estimated for today, less the money the
 * business already owes or will soon. It is an estimate built from the book,
 * so anything the book does not record moves it.
 *
 * Only money owed comes off. A VAT refund, an open sales invoice or anything
 * else still to come in is never added, so the figure errs on the low side.
 */

/** The VAT periods whose return is still to be made and paid. */
const UNFILED: ReadonlySet<VatPeriodStatus> = new Set([
  "overdue",
  "due",
  "open",
  "future",
])

/** Whether a period on the VAT timeline still has a return to be paid. */
export function isUnfiled(status: VatPeriodStatus): boolean {
  return UNFILED.has(status)
}

/** One VAT period the figure holds money back for. */
export interface VatOwed {
  key: string
  status: VatPeriodStatus
  /** Tax to pay so far, in positive cents. */
  amount: Cents
}

/**
 * The VAT periods still to be paid, with their tax so far. A period counts
 * while no settlement entry (§6.6) records its payment, and either it is not
 * filed or its due date is on or after `balanceDate`: a return filed and paid
 * before the balance was read is in the balance already. A refund is left out.
 */
export function vatOwed(
  timeline: readonly TimelinePeriod[],
  vatEntries: readonly Entry[],
  entries: readonly Entry[],
  cats: CategoryMap,
  kind: VatPeriodKind,
  balanceDate: string
): VatOwed[] {
  const out: VatOwed[] = []
  for (const p of timeline) {
    const filed = p.status === "filed"
    if (!isUnfiled(p.status) && !(filed && p.due >= balanceDate)) continue
    const { due } = vatReport(filterPeriod(vatEntries, asPeriod(p)), cats)
    if (due <= 0) continue
    if (settlementSummary(p, entries, cats, kind, due).rows.length) continue
    out.push({ key: p.key, status: p.status, amount: due })
  }
  return out
}

export type WithdrawLineKind = "vat" | "tax" | "yel" | "bills" | "buffer"

/** One amount taken off the bank balance. */
export interface WithdrawLine {
  kind: WithdrawLineKind
  /** In positive cents; 0 when `missing`. */
  cents: Cents
  /** The book lacks what this line needs, so it counts as 0 and says so. */
  missing: boolean
}

export interface SafeToWithdraw {
  /** The bank balance estimated for today. */
  balance: Cents
  lines: WithdrawLine[]
  /** Every line added up. */
  reserved: Cents
  /** The balance less `reserved`, at least 0. */
  amount: Cents
  /** How far `reserved` goes past the balance, 0 when it does not. */
  short: Cents
}

export interface SafeToWithdrawInput {
  balance: Cents
  vat: Cents
  /** Income tax still to set aside, or null without a tax estimate (§6.14). */
  tax: Cents | null
  /** The next YEL premium, or null when no YEL income is given. */
  yel: Cents | null
  /** Open bills, gross (§8.30). */
  bills: Cents
  buffer: Cents
}

/**
 * The bank balance less what it has to cover. A line below 0, such as advance
 * tax that already covers the year, counts as 0: money paid ahead for one
 * thing is not free for another.
 */
export function safeToWithdraw(input: SafeToWithdrawInput): SafeToWithdraw {
  const line = (kind: WithdrawLineKind, cents: Cents | null): WithdrawLine => ({
    kind,
    cents: cents === null ? 0 : Math.max(0, cents),
    missing: cents === null,
  })
  const lines = [
    line("vat", input.vat),
    line("tax", input.tax),
    line("yel", input.yel),
    line("bills", input.bills),
    line("buffer", input.buffer),
  ]
  const reserved = lines.reduce((sum, l) => sum + l.cents, 0)
  const left = input.balance - reserved
  return {
    balance: input.balance,
    lines,
    reserved,
    amount: Math.max(0, left),
    short: Math.max(0, -left),
  }
}
