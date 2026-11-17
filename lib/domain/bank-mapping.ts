/*
 * The saved bank-file layouts (§8.16, §7.6). Kept apart from bank-csv so the
 * settings reader can use them without pulling papaparse into the landing
 * bundle (§11b).
 */

export type BankField =
  | "date"
  | "valueDate"
  | "amount"
  | "debit"
  | "credit"
  | "counterparty"
  | "message"
  | "reference"
  | "iban"
  | "bankId"
  | "kind"

/** Which header of the file feeds each field. Only header names are stored. */
export type BankMapping = Partial<Record<BankField, string>>

/** Fields a mapping must have: a date and either one amount column or a debit and a credit one. */
export function mappingComplete(map: BankMapping): boolean {
  if (!map.date) return false
  return Boolean(map.amount) || Boolean(map.debit && map.credit)
}

/**
 * A layout the user mapped by hand and asked to keep (§8.16), found again by
 * the header names of the next file from the same bank.
 */
export interface SavedBankMapping {
  id: string
  /** The user's name for it, such as the bank's. */
  name: string
  /** `headerSignature` of the file it was made from. */
  signature: string
  mapping: BankMapping
}

const BANK_FIELDS: readonly BankField[] = [
  "date",
  "valueDate",
  "amount",
  "debit",
  "credit",
  "counterparty",
  "message",
  "reference",
  "iban",
  "bankId",
  "kind",
]

/** The longest name a saved layout keeps. */
export const MAX_MAPPING_NAME = 40

/**
 * The saved layouts a file holds (§7.6), one per header signature, the first
 * kept. A layout with no name, no signature or a mapping that cannot read a
 * file is dropped, and so is a field the app does not know.
 */
export function parseSavedMappings(value: unknown): SavedBankMapping[] {
  if (!Array.isArray(value)) return []
  const out: SavedBankMapping[] = []
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue
    const { id, name, signature, mapping } = item as Record<string, unknown>
    if (typeof id !== "string" || !id) continue
    if (typeof name !== "string" || !name.trim()) continue
    if (typeof signature !== "string" || !signature) continue
    if (typeof mapping !== "object" || mapping === null) continue
    const map: BankMapping = {}
    for (const field of BANK_FIELDS) {
      const header = (mapping as Record<string, unknown>)[field]
      if (typeof header === "string" && header.trim()) map[field] = header
    }
    if (!mappingComplete(map)) continue
    if (out.some((s) => s.signature === signature)) continue
    out.push({
      id,
      name: name.trim().slice(0, MAX_MAPPING_NAME),
      signature,
      mapping: map,
    })
  }
  return out
}
