import { isVatRate, roundCents } from "@/lib/domain/money"
import type { Cents, Entry } from "@/lib/domain/types"

export interface EntryAmounts {
  net: Cents
  vat: Cents
  gross: Cents
}

type CalcInput = Pick<
  Entry,
  "amount" | "vatRate" | "amountMode" | "euPurchase" | "share"
>

/** A business share the app can hold: a whole percent from 1 to 99 (§6.12). */
export function isShare(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 99
  )
}

/**
 * Split an entry's amount into net, VAT and gross (§4).
 *
 * With a business `share` (§6.12), `net` and `vat` are that share of the
 * whole and `gross` stays what was paid, so `net + vat` falls short of `gross`
 * by the private part. Everything that counts a cost or a tax reads `net` and
 * `vat`; everything that follows money, such as open items and the bank
 * estimate, reads `gross`.
 *
 * Note this is deliberately *not* round-trip stable: gross → net uses
 * `round(gross * r / (100 + r))` while net → gross uses `round(net * r / 100)`,
 * so toggling the mode can shift a value by one cent. That is acceptable
 * because the CSV stores the amount together with its mode, so the entered
 * value and its meaning are both preserved.
 */
export function calcEntry(e: CalcInput): EntryAmounts {
  // The invoice has no VAT, so the whole amount is the cost and the payment (§6.9).
  if (e.euPurchase) return { net: e.amount, vat: 0, gross: e.amount }
  const whole = wholeAmounts(e)
  if (!isShare(e.share)) return whole
  return {
    net: roundCents((whole.net * e.share) / 100),
    vat: roundCents((whole.vat * e.share) / 100),
    gross: whole.gross,
  }
}

function wholeAmounts(e: CalcInput): EntryAmounts {
  const rate = safeRate(e.vatRate)
  if (e.amountMode === "net") {
    const net = e.amount
    const vat = roundCents((net * rate) / 100)
    return { net, vat, gross: net + vat }
  }
  const gross = e.amount
  const vat = roundCents((gross * rate) / (100 + rate))
  return { net: gross - vat, vat, gross }
}

/** The amounts of the whole voucher, before the business share (§6.12). */
export function calcWhole(e: Omit<CalcInput, "share">): EntryAmounts {
  return e.euPurchase
    ? { net: e.amount, vat: 0, gross: e.amount }
    : wholeAmounts(e)
}

/** The tax the buyer reports on an EU purchase, which the invoice does not carry (§6.9). */
export function euPurchaseVat(e: Pick<Entry, "amount" | "vatRate">): Cents {
  return roundCents((e.amount * safeRate(e.vatRate)) / 100)
}

/** A file or browser may hold a rate that import would refuse today. */
function safeRate(vatRate: number): number {
  const stored = Number(vatRate) || 0
  return isVatRate(stored) ? stored : 0
}

/** Gross, negated for expenses — used when sorting the ledger by total. */
export function signedGross(e: CalcInput & Pick<Entry, "type">): Cents {
  const { gross } = calcEntry(e)
  return e.type === "expense" ? -gross + 0 : gross
}
