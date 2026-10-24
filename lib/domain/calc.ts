import { roundCents } from "@/lib/domain/money"
import type { Cents, Entry } from "@/lib/domain/types"

export interface EntryAmounts {
  net: Cents
  vat: Cents
  gross: Cents
}

type CalcInput = Pick<Entry, "amount" | "vatRate" | "amountMode">

/**
 * Split an entry's amount into net, VAT and gross (§4).
 *
 * Note this is deliberately *not* round-trip stable: gross → net uses
 * `round(gross * r / (100 + r))` while net → gross uses `round(net * r / 100)`,
 * so toggling the mode can shift a value by one cent. That is acceptable
 * because the CSV stores the amount together with its mode, so the entered
 * value and its meaning are both preserved.
 */
export function calcEntry(e: CalcInput): EntryAmounts {
  const rate = Number(e.vatRate) || 0
  if (e.amountMode === "net") {
    const net = e.amount
    const vat = roundCents((net * rate) / 100)
    return { net, vat, gross: net + vat }
  }
  const gross = e.amount
  const vat = roundCents((gross * rate) / (100 + rate))
  return { net: gross - vat, vat, gross }
}

/** Gross, negated for expenses — used when sorting the ledger by total. */
export function signedGross(e: CalcInput & Pick<Entry, "type">): Cents {
  const { gross } = calcEntry(e)
  return e.type === "expense" ? -gross + 0 : gross
}
