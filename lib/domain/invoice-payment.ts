import { calcEntry } from "@/lib/domain/calc"
import type { Invoice } from "@/lib/domain/invoice"
import { openEntries } from "@/lib/domain/invoice-status"
import { paidOnFor } from "@/lib/domain/open-items"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Paying an invoice in part (§8.27). The money received settles the invoice's
 * unpaid entries in book order. An entry the money covers is marked paid; the
 * one it only reaches in part is split into a paid entry for what arrived and
 * an open one for the rest, so income and VAT follow the real payment dates
 * for a trader taxed on payment (§6.3).
 */

export interface InvoicePayment {
  /** Entries to replace by id: marked paid, or reduced to what is still owed. */
  updated: Entry[]
  /** The paid parts carved off an entry. */
  added: Entry[]
  /** The invoice's entry ids once the parts are in. */
  entryIds: string[]
}

/**
 * An amount for `entry`, in its own mode, whose gross is as near `gross` as the
 * VAT rounding allows. A net amount cannot reach every gross, so the nearest is
 * taken.
 */
function amountForGross(entry: Entry, gross: Cents): Cents {
  if (entry.amountMode === "gross") return gross
  const guess = Math.round((gross * 100) / (100 + entry.vatRate))
  let best = guess
  for (const net of [guess, guess - 1, guess + 1]) {
    const reach = calcEntry({ ...entry, amount: net }).gross
    if (reach === gross) return net
    if (
      Math.abs(reach - gross) <
      Math.abs(calcEntry({ ...entry, amount: best }).gross - gross)
    )
      best = net
  }
  return best
}

/** What is owed on the invoice: the gross of its unpaid entries. */
export function owedOn(invoice: Invoice, byId: ReadonlyMap<string, Entry>) {
  return openEntries(invoice, byId).reduce(
    (sum, e) => sum + calcEntry(e).gross,
    0
  )
}

/**
 * Apply `amount` received on `on`. Null when nothing is owed, the amount is
 * not positive or it exceeds what is owed: an overpayment is not split.
 * `newId` makes the id of each carved part.
 */
export function applyInvoicePayment(
  invoice: Invoice,
  byId: ReadonlyMap<string, Entry>,
  amount: Cents,
  on: string,
  newId: () => string
): InvoicePayment | null {
  const open = openEntries(invoice, byId)
  if (!Number.isInteger(amount) || amount <= 0) return null
  if (amount > open.reduce((s, e) => s + calcEntry(e).gross, 0)) return null

  const updated: Entry[] = []
  const added: Entry[] = []
  let left = amount
  for (const entry of open) {
    if (left <= 0) break
    const gross = calcEntry(entry).gross
    if (left >= gross) {
      updated.push({ ...entry, paidOn: paidOnFor(entry.date, on) })
      left -= gross
      continue
    }
    const partAmount = amountForGross(entry, left)
    const rest = entry.amount - partAmount
    if (partAmount === 0 || rest === 0) {
      /* Too little to carve: a cent the rounding cannot place stays open. */
      left = 0
      break
    }
    const part: Entry = { ...entry, id: newId(), amount: partAmount }
    delete part.split
    delete part.voucher
    part.paidOn = paidOnFor(entry.date, on)
    if (entry.atts) part.atts = entry.atts.map((a) => ({ ...a }))
    added.push(part)
    updated.push({ ...entry, amount: rest })
    left = 0
  }
  if (updated.length === 0) return null
  return {
    updated,
    added,
    entryIds: [...invoice.entryIds, ...added.map((e) => e.id)],
  }
}

/** Whether some of the invoice is paid and some is not. */
export function partlyPaid(
  invoice: Invoice,
  byId: ReadonlyMap<string, Entry>
): boolean {
  const entries = invoice.entryIds.flatMap((id) => byId.get(id) ?? [])
  return (
    entries.some((e) => e.paidOn !== null) &&
    entries.some((e) => e.paidOn === null)
  )
}
