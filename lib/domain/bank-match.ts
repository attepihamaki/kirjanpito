import type { BankRow } from "@/lib/domain/bank-csv"
import { calcEntry } from "@/lib/domain/calc"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import {
  findCategoryRule,
  type CategoryRule,
} from "@/lib/domain/category-rules"
import { canBeUnpaid, paidDate } from "@/lib/domain/open-items"
import type { Invoice } from "@/lib/domain/invoice"
import { compactReference } from "@/lib/domain/invoice-reference"
import { openEntries } from "@/lib/domain/invoice-status"
import { hintCategory } from "@/lib/domain/invoice-text"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import type { UnsettledDue } from "@/lib/domain/vat-settlement"
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
      /**
       * `reference` when the row's reference number is an invoice's and the
       * amount is what it still owes (§8.27), `likely` when the text agrees
       * too, `amount` when only the amount does.
       */
      confidence: "likely" | "amount" | "reference"
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
  /** The VAT period this payment or refund settles (§6.6), when it equals one. */
  settles?: string
  /** True when `catId` is a guess from the words alone, not a rule or history. */
  guessed?: boolean
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
  /** The user's own category rules (§8.17). Tried before the book's history. */
  rules?: readonly CategoryRule[]
  /** Closed periods with a payment or refund still to book (§6.6). */
  dues?: readonly UnsettledDue[]
  /** The sales invoices, matched to a row by their reference number (§8.27). */
  invoices?: readonly Invoice[]
}

/** Whether the row carries the invoice's reference number, in its reference field or its message. */
function carriesReference(row: BankRow, invoice: Invoice): boolean {
  if (!invoice.reference) return false
  const reference = compactReference(invoice.reference)
  return (
    compactReference(row.reference) === reference ||
    numberTokens(row.message).includes(reference)
  )
}

/**
 * The issued invoice this row pays: money in that carries the invoice's
 * reference and equals what the invoice still owes (§8.27). A part payment or
 * an overpayment is not matched here and goes through the ordinary rules.
 */
function payingInvoice(
  row: BankRow,
  ctx: BankContext,
  claimed: ReadonlySet<string>
): { invoice: Invoice; open: Entry[] } | undefined {
  if (row.amount <= 0) return undefined
  const byId = new Map(ctx.entries.map((e) => [e.id, e]))
  for (const invoice of ctx.invoices ?? []) {
    if (!carriesReference(row, invoice)) continue
    const open = openEntries(invoice, byId).filter((e) => !claimed.has(e.id))
    const owed = open.reduce((sum, e) => sum + calcEntry(e).gross, 0)
    if (open.length > 0 && owed === row.amount) return { invoice, open }
  }
  return undefined
}

/**
 * An invoice of several entries that this row already paid: its reference, its
 * entries all paid on the row's day and together the row's amount. A one-entry
 * invoice is found by `alreadyBooked`.
 */
function alreadyPaidInvoice(row: BankRow, ctx: BankContext): Entry | undefined {
  if (row.amount <= 0) return undefined
  const byId = new Map(ctx.entries.map((e) => [e.id, e]))
  for (const invoice of ctx.invoices ?? []) {
    if (!carriesReference(row, invoice)) continue
    const entries = invoice.entryIds.flatMap((id) => byId.get(id) ?? [])
    if (entries.length < 2 || entries.length !== invoice.entryIds.length)
      continue
    const settled = entries.every((e) => paidDate(e) === row.date)
    const total = entries.reduce((sum, e) => sum + calcEntry(e).gross, 0)
    if (settled && total === row.amount) return entries[0]
  }
  return undefined
}

/**
 * The payments a booking makes, with every other open entry of an invoice
 * added when one of its entries is paid: an invoice is paid whole, on the day
 * the money arrived (§8.27).
 */
export function withInvoiceEntries(
  paid: readonly { entryId: string; on: string }[],
  invoices: readonly Invoice[],
  entries: readonly Entry[]
): { entryId: string; on: string }[] {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const out = [...paid]
  const seen = new Set(paid.map((p) => p.entryId))
  for (const { entryId, on } of paid) {
    const invoice = invoices.find((i) => i.entryIds.includes(entryId))
    if (!invoice) continue
    for (const e of openEntries(invoice, byId)) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      out.push({ entryId: e.id, on })
    }
  }
  return out
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

/**
 * The VAT period a row pays or refunds: money out equal to a period's tax, or
 * money in equal to its refund, arriving after that period closed. Each
 * period is used once, oldest first.
 */
function settlementFor(
  row: BankRow,
  ctx: BankContext,
  claimed: Set<string>
): UnsettledDue | undefined {
  const due = (ctx.dues ?? []).find(
    (d) =>
      !claimed.has(d.key) &&
      d.due === -row.amount &&
      (periodFromKey(d.key)?.to ?? "9999") < row.date
  )
  if (due) claimed.add(due.key)
  return due
}

function draftFor(
  row: BankRow,
  ctx: BankContext,
  claimedDues: Set<string>
): NewEntryDraft {
  const type = signedType(row)
  const parts = [row.counterparty, row.message].filter(Boolean)
  const settlement = settlementFor(row, ctx, claimedDues)
  if (settlement) {
    return {
      type,
      description: parts.join(" – "),
      amount: Math.abs(row.amount),
      catId: settlement.due > 0 ? "vat-payment" : "vat-refund",
      vatRate: 0,
      settles: settlement.key,
    }
  }
  const hit = findCategoryRule(ctx.rules ?? [], parts.join(" "), ctx.cats, type)
  const known = hit
    ? { catId: hit.catId, vatRate: hit.vatRate }
    : suggestFromHistory(row.counterparty, type, ctx)
  const guessed = known
    ? null
    : suggestFromWords(parts.join(" "), type, ctx.cats)
  return {
    type,
    description: parts.join(" – "),
    amount: Math.abs(row.amount),
    catId: known?.catId ?? guessed,
    vatRate: known?.vatRate ?? null,
    ...(guessed ? { guessed: true } : {}),
  }
}

/**
 * A category guessed from the words of a counterparty with no rule and no
 * history (§8.16). Expenses only, and only an enabled category on the
 * expense side that is not an EU purchase: money in has no hints, and the
 * review list must not offer a category the user cannot pick there.
 */
export function suggestFromWords(
  text: string,
  type: EntryType,
  cats: CategoryMap
): string | null {
  if (type !== "expense") return null
  const catId = hintCategory(text)
  const cat = catId ? cats.get(catId) : undefined
  return cat && cat.enabled && !cat.euPurchase ? cat.id : null
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
  const claimedDues = new Set<string>()
  return rows.map((row): BankProposal => {
    const booked = alreadyBooked(row, ctx) ?? alreadyPaidInvoice(row, ctx)
    if (booked) return { kind: "booked", entryId: booked.id }

    const paying = payingInvoice(row, ctx, claimed)
    if (paying) {
      for (const e of paying.open) claimed.add(e.id)
      return {
        kind: "match",
        entryId: paying.open[0].id,
        confidence: "reference",
      }
    }

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
      return { kind: "new", draft: draftFor(row, ctx, claimedDues) }

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
