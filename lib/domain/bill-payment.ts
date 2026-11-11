import { calcEntry } from "@/lib/domain/calc"
import { parseIban } from "@/lib/domain/iban"
import {
  compactReference,
  isFinnishReference,
  isRfReference,
} from "@/lib/domain/invoice-reference"
import { virtualBarcode } from "@/lib/domain/invoice-barcode"
import type { Entry } from "@/lib/domain/types"

/**
 * How a bill received is paid (§8.30): the payee's IBAN and the reference,
 * kept on the expense entry beside its due date, so the bill can be paid from
 * the payables list without opening the receipt.
 */

/** The IBAN compact and upper case, or null when the check digits fail. */
export function billIban(value: string | undefined | null): string | null {
  if (!value) return null
  return parseIban(value)
}

/**
 * A payment reference compact, or null unless it is a Finnish reference or an
 * RF reference whose check digits are right.
 */
export function billReference(value: string | undefined | null): string | null {
  if (!value) return null
  const compact = compactReference(value)
  return isFinnishReference(compact) || isRfReference(compact) ? compact : null
}

/**
 * The virtual barcode for paying what is still owed on a bill, or null when
 * the bill has no Finnish IBAN or no reference the barcode can carry. The
 * amount is the voucher's gross, and parts of a split receipt each give their
 * own; `gross` overrides it for a voucher paid as a whole.
 */
export function billBarcode(
  e: Pick<
    Entry,
    "iban" | "reference" | "due" | "amount" | "vatRate" | "amountMode" | "share"
  >,
  gross: number = calcEntry(e).gross
): string | null {
  if (!e.iban || !e.reference) return null
  return virtualBarcode({
    iban: e.iban,
    cents: gross,
    reference: e.reference,
    dueDate: e.due ?? null,
  })
}
