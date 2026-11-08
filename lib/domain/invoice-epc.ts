import { parseIban } from "@/lib/domain/iban"
import { compactReference, isRfReference } from "@/lib/domain/invoice-reference"

/** The largest amount an EPC code holds: 999 999 999,99 € in cents. */
const EPC_MAX_CENTS = 99_999_999_999

export interface EpcInput {
  /** The payee's name, cut to 70 characters. */
  name: string
  iban: string
  /** The amount in cents, at least 1. */
  cents: number
  /** An RF reference goes in the structured reference field. */
  rfReference?: string
  /** Free text for the payer's bank, cut to 140 characters. Used when there is no RF reference. */
  message?: string
}

/**
 * The text of an EPC credit transfer QR code (the "Girocode"), version 002 with
 * the SEPA credit transfer service tag, or null if the IBAN or amount is not
 * valid. A bank's app reads it and fills in the payment.
 */
export function epcPayload(input: EpcInput): string | null {
  const iban = parseIban(input.iban)
  if (iban === null) return null
  if (
    !Number.isInteger(input.cents) ||
    input.cents < 1 ||
    input.cents > EPC_MAX_CENTS
  )
    return null
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 70)
  if (name === "") return null
  const rf = input.rfReference ? compactReference(input.rfReference) : ""
  if (rf !== "" && !isRfReference(rf)) return null
  const euros = Math.floor(input.cents / 100)
  const amount = `EUR${euros}.${String(input.cents % 100).padStart(2, "0")}`
  const message =
    rf === ""
      ? (input.message ?? "").replace(/\s+/g, " ").trim().slice(0, 140)
      : ""
  /* BIC (optional since version 002), purpose and the free information line stay empty. */
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    name,
    iban,
    amount,
    "",
    rf,
    message,
  ].join("\n")
}
