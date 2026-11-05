import type { BankRow } from "@/lib/domain/bank-csv"
import { calcEntry } from "@/lib/domain/calc"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { canBeUnpaid, paidDate } from "@/lib/domain/open-items"
import type { CategoryMap, Cents, Entry, EntryType } from "@/lib/domain/types"

/**
 * What to do with each row of a bank statement (§8.16). Pure: it reads the
 * book and proposes, and the review list lets the user change every proposal
 * before anything is written.
 */

export type BankProposal =
  /* The money for an open entry has arrived: set its payment date. */
  | {
      kind: "match"
      entryId: string
      /** `likely` when the text agrees too, `amount` when only the amount does. */
      confidence: "likely" | "amount"
    }
  /* Several open entries fit and nothing tells them apart. */
  | { kind: "ambiguous"; entryIds: string[] }
  /* An entry already records this payment. */
  | { kind: "booked"; entryId: string }
  /* No entry fits: book a new one. */
  | { kind: "new"; draft: NewEntryDraft }

export interface NewEntryDraft {
  type: EntryType
  description: string
  /** Gross cents, always positive. */
  amount: Cents
  /** From the book's history, or null when the counterparty is new. */
  catId: string | null
  vatRate: number | null
}

/* -------------------------------------------------------------------------
 * Text
 * ---------------------------------------------------------------------- */

const COMPANY_SUFFIX = /\b(oy|oyj|ab|ky|ay|tmi|ltd|gmbh|inc|as|a\/s)\b/g

/** A counterparty or description reduced to the words that identify it. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(COMPANY_SUFFIX, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Whether the description names the counterparty. */
function mentions(description: string, counterparty: string): boolean {
  const name = normalizeName(counterparty)
  if (name.length < 3) return false
  const text = normalizeName(description)
  return ` ${text} `.includes(` ${name} `)
}

/** Numbers of four digits or more: invoice numbers and references. */
function numberTokens(s: string): string[] {
  return s.match(/\d{4,}/g) ?? []
}

/* -------------------------------------------------------------------------
 * Open entries
 * ---------------------------------------------------------------------- */

function signedType(row: BankRow): EntryType {
  return row.amount >= 0 ? "income" : "expense"
}

function isOpen(e: Entry, cats: CategoryMap): boolean {
  if (paidDate(e) !== null) return false
  const cat = cats.get(e.catId)
  return canBeUnpaid(cat && LINE_BY_KEY.get(cat.line))
}

/**
 * Whether the text of the row and the entry agree: a number in the bank's
 * message or reference appears in the description, or the entry's description
 * names the counterparty.
 */
function textAgrees(row: BankRow, e: Entry): boolean {
  const desc = e.description
  const numbers = [...numberTokens(row.message), ...numberTokens(row.reference)]
  if (numbers.some((n) => desc.includes(n))) return true
  return mentions(desc, row.counterparty)
}

/* -------------------------------------------------------------------------
 * Propose
 * ---------------------------------------------------------------------- */

export interface BankContext {
  entries: readonly Entry[]
  cats: CategoryMap
}

/** An entry that already records this payment: same side, amount and payment day. */
function alreadyBooked(row: BankRow, ctx: BankContext): Entry | undefined {
  const type = signedType(row)
  const gross = Math.abs(row.amount)
  return ctx.entries.find(
    (e) =>
      e.type === type &&
      paidDate(e) === row.date &&
      Math.abs(calcEntry(e).gross) === gross
  )
}

/**
 * The category and rate of the book's earlier entries that name this
 * counterparty, the commonest category winning and the newest entry's rate.
 * Nothing is stored: the history is the rule.
 */
export function suggestFromHistory(
  counterparty: string,
  type: EntryType,
  ctx: BankContext
): { catId: string; vatRate: number } | null {
  if (!counterparty.trim()) return null
  const hits = ctx.entries.filter(
    (e) =>
      e.type === type &&
      ctx.cats.has(e.catId) &&
      mentions(e.description, counterparty)
  )
  if (hits.length === 0) return null

  const counts = new Map<string, number>()
  for (const e of hits) counts.set(e.catId, (counts.get(e.catId) ?? 0) + 1)
  let catId = hits[0].catId
  for (const [id, n] of counts) {
    if (n > (counts.get(catId) ?? 0)) catId = id
  }
  const newest = hits
    .filter((e) => e.catId === catId)
    .reduce((a, b) => (b.date > a.date ? b : a))
  return { catId, vatRate: newest.vatRate }
}

function draftFor(row: BankRow, ctx: BankContext): NewEntryDraft {
  const type = signedType(row)
  const parts = [row.counterparty, row.message].filter(Boolean)
  const suggestion = suggestFromHistory(row.counterparty, type, ctx)
  return {
    type,
    description: parts.join(" – "),
    amount: Math.abs(row.amount),
    catId: suggestion?.catId ?? null,
    vatRate: suggestion?.vatRate ?? null,
  }
}

/**
 * One proposal per row. Rows are decided in turn and an open entry is used at
 * most once, so two payments of the same amount do not claim the same invoice.
 */
export function proposeForRows(
  rows: readonly BankRow[],
  ctx: BankContext
): BankProposal[] {
  const claimed = new Set<string>()
  return rows.map((row): BankProposal => {
    const booked = alreadyBooked(row, ctx)
    if (booked) return { kind: "booked", entryId: booked.id }

    const type = signedType(row)
    const gross = Math.abs(row.amount)
    const candidates = ctx.entries.filter(
      (e) =>
        e.type === type &&
        !claimed.has(e.id) &&
        isOpen(e, ctx.cats) &&
        Math.abs(calcEntry(e).gross) === gross
    )

    if (candidates.length === 0)
      return { kind: "new", draft: draftFor(row, ctx) }

    const agreeing = candidates.filter((e) => textAgrees(row, e))
    if (agreeing.length === 1) {
      claimed.add(agreeing[0].id)
      return { kind: "match", entryId: agreeing[0].id, confidence: "likely" }
    }
    if (agreeing.length === 0 && candidates.length === 1) {
      claimed.add(candidates[0].id)
      return { kind: "match", entryId: candidates[0].id, confidence: "amount" }
    }
    const pool = agreeing.length > 1 ? agreeing : candidates
    return { kind: "ambiguous", entryIds: pool.map((e) => e.id) }
  })
}
