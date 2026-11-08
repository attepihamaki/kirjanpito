import { isFinnishIban, parseIban } from "@/lib/domain/iban"
import {
  compactReference,
  isFinnishReference,
  isRfReference,
} from "@/lib/domain/invoice-reference"

/** The largest amount the barcode holds: 999 999,99 € in cents. */
export const BARCODE_MAX_CENTS = 99_999_999

/** The due date as YYMMDD, or six zeros for none. Null if the text is not a date in 2000 to 2099. */
function dueDigits(dueDate: string | null): string | null {
  if (dueDate === null) return "000000"
  const match = /^20(\d\d)-(\d\d)-(\d\d)$/.exec(dueDate)
  if (!match) return null
  return match[1] + match[2] + match[3]
}

export interface BarcodeInput {
  /** The payee's IBAN. Only a Finnish one fits. */
  iban: string
  /** The amount in cents, 0 to `BARCODE_MAX_CENTS`. */
  cents: number
  /** A Finnish reference (version 4) or an RF reference of digits (version 5). */
  reference: string
  /** ISO date, or null for a barcode with no due date. */
  dueDate: string | null
}

/**
 * The 54 digits of the Finnish virtual barcode (virtuaaliviivakoodi), or null
 * when the data does not fit it.
 *
 * Version 4 is `4`, the 16 digits of the IBAN after `FI`, euros in 6 digits,
 * cents in 2, three zeros, the Finnish reference padded to 20 digits and the
 * due date. Version 5 is `5`, the IBAN, the amount, the RF reference without
 * its letters in 23 digits and the due date, with the zeros padded between the
 * check digits and the rest of the reference.
 */
export function virtualBarcode(input: BarcodeInput): string | null {
  const iban = parseIban(input.iban)
  if (iban === null || !isFinnishIban(iban)) return null
  if (
    !Number.isInteger(input.cents) ||
    input.cents < 0 ||
    input.cents > BARCODE_MAX_CENTS
  )
    return null
  const due = dueDigits(input.dueDate)
  if (due === null) return null
  const reference = compactReference(input.reference)
  const amount = String(input.cents).padStart(8, "0")
  const account = iban.slice(2)
  if (isRfReference(reference)) {
    const body = reference.slice(4).padStart(21, "0")
    return `5${account}${amount}${reference.slice(2, 4)}${body}${due}`
  }
  if (isFinnishReference(reference)) {
    return `4${account}${amount}000${reference.padStart(20, "0")}${due}`
  }
  return null
}
