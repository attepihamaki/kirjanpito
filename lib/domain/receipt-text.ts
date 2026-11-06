import type { Entry } from "@/lib/domain/types"

/** Receipt text by attachment id, as held in memory for the ledger search. */
export type ReceiptTexts = ReadonlyMap<string, string>

/**
 * The most text kept per receipt. A long contract or a statement runs to
 * hundreds of pages; the first part is where a name, an invoice number or a
 * total sits, and the whole index is held in memory.
 */
export const RECEIPT_TEXT_LIMIT = 100_000

/** Lower case with runs of whitespace as one space, cut to the limit. */
export function normalizeReceiptText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, RECEIPT_TEXT_LIMIT)
}

/**
 * Whether the text of any receipt on the entry holds the lower-cased `needle`
 * (§8.4). An attachment that is not indexed yet matches nothing.
 */
export function receiptTextMatches(
  entry: Entry,
  needle: string,
  texts: ReceiptTexts | undefined
): boolean {
  if (!texts || !entry.atts?.length) return false
  const words = needle.replace(/\s+/g, " ")
  return entry.atts.some(
    (att) => att.id !== null && (texts.get(att.id) ?? "").includes(words)
  )
}
