import Papa from "papaparse"

import { parseCsvDate } from "@/lib/domain/dates"
import { parseIban } from "@/lib/domain/iban"
import { parseAmount } from "@/lib/domain/money"
import type { Cents } from "@/lib/domain/types"

/**
 * Bank statement CSV (§8.16). Pure: it turns the text of an export into rows
 * and says nothing about entries. Matching and booking live elsewhere.
 */

/** One transaction of a statement. The amount is signed: money in is positive. */
export interface BankRow {
  /** Booking date, ISO. */
  date: string
  /** Value date, ISO, when the file has one. */
  valueDate?: string
  amount: Cents
  /** The other party: payee on money out, payer on money in. */
  counterparty: string
  message: string
  /** Creditor reference, digits and spaces removed. Empty when there is none. */
  reference: string
  /** The other party's account as a compact IBAN, when the file has a valid one. */
  iban?: string
  /** The bank's own transaction id, when the file has one. */
  bankId?: string
  /** The bank's name for the kind of transaction, such as "TILISIIRTO". */
  kind: string
}

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
 * Why a row was skipped. `not-booked` is a pending transaction and `currency`
 * one not in euros, which only an XML statement (§8.16) says.
 */
export type BankSkipCode = "bad-date" | "bad-amount" | "not-booked" | "currency"

export interface BankSkippedRow {
  /**
   * 1-based line number in a CSV, the header being line 1; in an XML
   * statement, the entry's position among its entries.
   */
  line: number
  code: BankSkipCode
}

export type BankParseResult =
  | {
      ok: true
      rows: BankRow[]
      skipped: BankSkippedRow[]
      headers: string[]
      mapping: BankMapping
      /** Set when the layout was recognised, not mapped by hand. */
      preset: BankPreset | null
      /** The saved layout the file was read with, when one fitted its headers. */
      saved?: SavedBankMapping
      /** What the statement says about itself, when it says anything. */
      statement?: StatementInfo
    }
  | {
      ok: false
      reason: "empty" | "needs-mapping"
      headers: string[]
      /** Best guess at a mapping from header names, for the mapping step to start from. */
      suggested: BankMapping
    }

export type BankPreset = "op" | "camt053"

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

/** A balance a statement states, in cents, on the day it is for. */
export interface StatementBalance {
  amount: Cents
  date: string
}

/** The account and balances of a statement. A CSV export carries none of this. */
export interface StatementInfo {
  iban?: string
  /** The balance at the start of the first day the statement covers. */
  opening?: StatementBalance
  /** The balance at the end of the last day it covers. */
  closing?: StatementBalance
}

/* -------------------------------------------------------------------------
 * Layouts
 * ---------------------------------------------------------------------- */

/**
 * OP's transaction export ("tapahtumat"): `;` delimited, UTF-8 with a BOM,
 * ISO dates, a decimal comma, and the reference written as `ref=` followed by
 * the number, which is empty when there is none.
 */
const OP_MAPPING: BankMapping = {
  date: "Kirjauspäivä",
  valueDate: "Arvopäivä",
  amount: "Määrä EUROA",
  kind: "Selitys",
  counterparty: "Saaja/Maksaja",
  reference: "Viite",
  message: "Viesti",
  bankId: "Arkistointitunnus",
}

const norm = (s: string) =>
  s.replace(/^﻿/, "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

function matchesPreset(headers: readonly string[], map: BankMapping): boolean {
  const have = new Set(headers.map(norm))
  return Object.values(map).every((h) => h && have.has(norm(h)))
}

/**
 * Words banks use for each field, normalised (lower case, no diacritics).
 * Used only to pre-fill the mapping step; the user confirms it.
 */
const GUESSES: Record<BankField, readonly string[]> = {
  date: ["kirjauspaiva", "kirjaus", "booking date", "date", "paivays", "paiva"],
  valueDate: ["arvopaiva", "value date"],
  amount: ["maara", "amount", "summa", "maara euroa", "maara eur"],
  debit: ["debet", "debit", "otto", "veloitus"],
  credit: ["kredit", "credit", "pano", "hyvitys"],
  counterparty: [
    "saaja/maksaja",
    "maksaja/saaja",
    "saaja",
    "maksaja",
    "vastapuoli",
    "counterparty",
    "nimi",
    "name",
  ],
  message: ["viesti", "message", "selite", "kuvaus", "description"],
  reference: ["viite", "viitenumero", "reference"],
  iban: [
    "saajan tilinumero",
    "maksajan tilinumero",
    "saajan/maksajan tilinumero",
    "vastapuolen tilinumero",
    "vastatili",
    "counterparty account",
    "counterparty iban",
  ],
  bankId: ["arkistointitunnus", "arkistotunnus", "tapahtumatunnus", "id"],
  kind: ["laji", "tapahtumalaji", "selitys", "type"],
}

/**
 * What identifies a layout: its header names, normalised and in order of
 * name, so a bank that reorders its columns or changes their case is still
 * the same layout. Empty headers are left out.
 */
export function headerSignature(headers: readonly string[]): string {
  return [...new Set(headers.map(norm).filter(Boolean))].sort().join("|")
}

/** The saved layout made for files with these headers, if any. */
function savedMappingFor(
  headers: readonly string[],
  saved: readonly SavedBankMapping[]
): SavedBankMapping | undefined {
  const signature = headerSignature(headers)
  if (!signature) return undefined
  return saved.find(
    (s) => s.signature === signature && mappingComplete(s.mapping)
  )
}

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

/** A mapping guessed from header names alone. */
export function guessMapping(headers: readonly string[]): BankMapping {
  const out: BankMapping = {}
  const taken = new Set<string>()
  for (const field of Object.keys(GUESSES) as BankField[]) {
    for (const word of GUESSES[field]) {
      const hit = headers.find((h) => !taken.has(h) && norm(h) === word)
      if (hit) {
        out[field] = hit
        taken.add(hit)
        break
      }
    }
  }
  return out
}

/* -------------------------------------------------------------------------
 * Parse
 * ---------------------------------------------------------------------- */

const DELIMITERS = [";", "\t", ","] as const

/** The delimiter that splits the first line into the most cells. */
function detectBankDelimiter(text: string): string {
  let best: string = ";"
  let bestCount = 0
  for (const d of DELIMITERS) {
    const row = Papa.parse<string[]>(text, {
      header: false,
      delimiter: d,
      preview: 1,
    }).data[0]
    const n = row?.length ?? 0
    if (n > bestCount) {
      best = d
      bestCount = n
    }
  }
  return best
}

/**
 * The IBAN in a statement's account cell, compact, or undefined. Banks write
 * the BIC in the same cell or the account in groups, so the first run that
 * passes the IBAN check is taken.
 */
export function ibanIn(raw: string): string | undefined {
  const compact = raw.toUpperCase().replace(/\s+/g, "")
  for (const m of compact.matchAll(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/g)) {
    /* A Finnish IBAN has a fixed length, so a BIC run after it is never read as part of it. */
    if (m[0].startsWith("FI")) {
      const iban = parseIban(m[0].slice(0, 18))
      if (iban) return iban
      continue
    }
    for (let end = m[0].length; end >= 15; end--) {
      const iban = parseIban(m[0].slice(0, end))
      if (iban) return iban
    }
  }
  return undefined
}

/** `ref=` is how OP writes an empty reference; a reference may follow it. */
export function cleanReference(raw: string): string {
  return raw.replace(/^ref=/i, "").replace(/\s+/g, "")
}

/**
 * Parse a statement. With no `mapping`, a layout the user saved for these
 * headers comes first, then a known bank's, and otherwise the result asks for
 * a mapping, carrying a guess. A row with no usable date or amount is skipped
 * and counted, never fatal.
 */
export function parseBankCsv(
  text: string,
  mapping?: BankMapping,
  saved: readonly SavedBankMapping[] = []
): BankParseResult {
  const body = text.replace(/^﻿/, "")
  const parsed = Papa.parse<string[]>(body, {
    header: false,
    delimiter: detectBankDelimiter(body),
    skipEmptyLines: "greedy",
  })
  const table = parsed.data
  if (table.length === 0) {
    return { ok: false, reason: "empty", headers: [], suggested: {} }
  }

  const headers = table[0].map((h) => h.replace(/^﻿/, "").trim())

  let preset: BankPreset | null = null
  let map = mapping
  const own = mapping ? undefined : savedMappingFor(headers, saved)
  if (own) map = own.mapping
  if (!map) {
    if (matchesPreset(headers, OP_MAPPING)) {
      preset = "op"
      /* The account column is optional, so the preset is recognised without it. */
      const iban = guessMapping(headers).iban
      map = iban ? { ...OP_MAPPING, iban } : OP_MAPPING
    } else {
      const suggested = guessMapping(headers)
      if (!mappingComplete(suggested)) {
        return { ok: false, reason: "needs-mapping", headers, suggested }
      }
      map = suggested
    }
  }
  if (!mappingComplete(map)) {
    return {
      ok: false,
      reason: "needs-mapping",
      headers,
      suggested: guessMapping(headers),
    }
  }

  const index = (field: BankField): number => {
    const name = map[field]
    if (!name) return -1
    const want = norm(name)
    return headers.findIndex((h) => norm(h) === want)
  }
  const col = {
    date: index("date"),
    valueDate: index("valueDate"),
    amount: index("amount"),
    debit: index("debit"),
    credit: index("credit"),
    counterparty: index("counterparty"),
    message: index("message"),
    reference: index("reference"),
    iban: index("iban"),
    bankId: index("bankId"),
    kind: index("kind"),
  }
  const cell = (row: string[], i: number) =>
    i < 0 ? "" : (row[i] ?? "").trim()

  const rows: BankRow[] = []
  const skipped: BankSkippedRow[] = []

  for (let r = 1; r < table.length; r++) {
    const row = table[r]
    const line = r + 1

    const date = parseCsvDate(cell(row, col.date))
    if (!date) {
      skipped.push({ line, code: "bad-date" })
      continue
    }

    let amount: Cents | null
    if (col.amount >= 0) {
      amount = parseAmount(cell(row, col.amount))
    } else {
      // Separate columns: a debit is money out, whichever sign the bank wrote.
      const debit = parseAmount(cell(row, col.debit))
      const credit = parseAmount(cell(row, col.credit))
      if (debit != null && debit !== 0) amount = -Math.abs(debit)
      else if (credit != null && credit !== 0) amount = Math.abs(credit)
      else amount = debit ?? credit
    }
    if (amount == null) {
      skipped.push({ line, code: "bad-amount" })
      continue
    }

    const valueDate = parseCsvDate(cell(row, col.valueDate)) ?? undefined
    const bankId = cell(row, col.bankId)
    const iban = ibanIn(cell(row, col.iban))
    rows.push({
      date,
      ...(valueDate ? { valueDate } : {}),
      amount,
      counterparty: cell(row, col.counterparty),
      message: cell(row, col.message),
      reference: cleanReference(cell(row, col.reference)),
      ...(iban ? { iban } : {}),
      ...(bankId ? { bankId } : {}),
      kind: cell(row, col.kind),
    })
  }

  return {
    ok: true,
    rows,
    skipped,
    headers,
    mapping: map,
    preset,
    ...(own ? { saved: own } : {}),
  }
}
