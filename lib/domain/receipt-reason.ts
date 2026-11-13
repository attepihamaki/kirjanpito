import type { Lang } from "@/lib/domain/types"

/**
 * Why a voucher has no receipt attached (§8.5). KPL 2:5 asks every entry to
 * rest on a voucher, and for a bank fee, interest or a transfer that voucher
 * is the bank statement itself, kept with the statements rather than
 * attached here. `statement` says so. `other` is any other reason, which the
 * voucher's note (§8.39) explains. An entry with a reason is left out of the
 * "Ilman liitettä" check, so the check lists only real gaps.
 */
const RECEIPT_REASONS = ["statement", "other"] as const
export type ReceiptReason = (typeof RECEIPT_REASONS)[number]

/** The word each reason is written as in the CSV, in the file's language (§7.1). */
const CSV_WORD: Readonly<Record<Lang, Record<ReceiptReason, string>>> = {
  fi: { statement: "tiliote", other: "muu" },
  en: { statement: "statement", other: "other" },
}

/** The CSV cell for a reason, empty for none. */
export function receiptReasonCell(
  reason: ReceiptReason | undefined,
  lang: Lang
): string {
  return reason ? CSV_WORD[lang][reason] : ""
}

/**
 * `{ receiptReason }` from a CSV cell in either language, or nothing. A cell
 * that names no reason is dropped, like any other value import cannot read.
 */
export function receiptReasonField(cell: string): {
  receiptReason?: ReceiptReason
} {
  const word = cell.trim().toLowerCase()
  if (!word) return {}
  for (const lang of ["fi", "en"] as const) {
    for (const reason of RECEIPT_REASONS) {
      if (CSV_WORD[lang][reason] === word) return { receiptReason: reason }
    }
  }
  return {}
}
