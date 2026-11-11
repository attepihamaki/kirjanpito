import { billIban, billReference } from "@/lib/domain/bill-payment"
import { parseVirtualBarcode } from "@/lib/domain/invoice-text"
import type { Cents } from "@/lib/domain/types"

/*
 * The machine-readable codes a bill received is printed with (§8.30): the
 * Finnish bank barcode, a Code 128 of the 54-digit virtual barcode, and the
 * EPC QR code ("BCD"). Reading one from a photo or a PDF fills the payee's
 * account, the reference, the amount and, from the bank barcode, the due date.
 */

/** What a bill's code says about paying it. */
export interface BillCode {
  /** Compact and valid. */
  iban: string
  /** Null when the code carries no amount or a zero one. */
  amount: Cents | null
  /** A valid Finnish or RF reference, compact. */
  reference: string | null
  dueDate: string | null
  /** The payee as the QR code names it; the bank barcode has no name. */
  name: string | null
  /** The free-text message of a QR code without a reference. */
  message: string | null
}

/**
 * An EPC QR payload (EPC069-12, versions 001 and 002): `BCD`, the version,
 * the character set, `SCT` or `INST`, the BIC, the name, the IBAN, the amount
 * as `EUR12.34`, the purpose, the structured reference and the text, one per
 * line. Lines at the end may be left off.
 */
export function parseEpcQr(payload: string): BillCode | null {
  const lines = payload.split(/\r?\n/)
  if (lines[0]?.trim() !== "BCD") return null
  if (!["001", "002"].includes(lines[1]?.trim() ?? "")) return null
  if (!["SCT", "INST"].includes(lines[3]?.trim() ?? "")) return null
  const iban = billIban(lines[6]?.trim())
  if (!iban) return null
  const amountText = /^EUR(\d{1,9})(?:\.(\d{1,2}))?$/.exec(
    lines[7]?.trim() ?? ""
  )
  const amount = amountText
    ? Number(amountText[1]) * 100 + Number((amountText[2] ?? "").padEnd(2, "0"))
    : 0
  const name = lines[5]?.trim() || null
  const message = lines[10]?.trim() || null
  return {
    iban,
    amount: amount > 0 ? amount : null,
    reference: billReference(lines[9]?.trim()),
    dueDate: null,
    name,
    message,
  }
}

/** The Finnish bank barcode's 54 digits, read as a bill code. */
function fromBankBarcode(text: string): BillCode | null {
  const code = parseVirtualBarcode(text)
  const iban = code && billIban(code.iban)
  if (!code || !iban) return null
  return {
    iban,
    amount: code.amount > 0 ? code.amount : null,
    reference: billReference(code.reference),
    dueDate: code.dueDate,
    name: null,
    message: null,
  }
}

/**
 * The first of the decoded texts that is a bill code. A bank barcode wins
 * over a QR code on the same bill, as it also carries the due date.
 */
export function billCodeFrom(texts: readonly string[]): BillCode | null {
  for (const text of texts) {
    const hit = fromBankBarcode(text)
    if (hit) return hit
  }
  for (const text of texts) {
    const hit = parseEpcQr(text)
    if (hit) return hit
  }
  return null
}
