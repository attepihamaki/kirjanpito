import {
  ALL_LINES,
  LINE_BY_KEY,
  offStatement,
  type AccountLine,
} from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import { paidDate, type TraderType } from "@/lib/domain/open-items"
import type { Category, Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The two books the Accounting Act asks for (KPL 2:4): the entries "aika-
 * järjestyksessä ja asiajärjestyksessä". The journal (päiväkirja) is the
 * year in date order, the general ledger (pääkirja) the same entries by
 * account (§8.4). Both are views of the entries; nothing here is stored.
 */

export interface BookRow {
  entry: Entry
  /** The account (tili) the entry's category sits on, or null if unknown. */
  line: AccountLine | null
  net: Cents
  vat: Cents
  gross: Cents
}

export interface Totals {
  net: Cents
  vat: Cents
  gross: Cents
}

const zero = (): Totals => ({ net: 0, vat: 0, gross: 0 })

function add(t: Totals, r: BookRow): void {
  t.net += r.net
  t.vat += r.vat
  t.gross += r.gross
}

function rowsOf(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): BookRow[] {
  return entries
    .filter((e) => yearOf(e.date) === year)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.voucher ?? 0) - (b.voucher ?? 0)
    )
    .map((entry) => {
      const cat = cats.get(entry.catId)
      const line = (cat && LINE_BY_KEY.get(cat.line)) ?? null
      return { entry, line, ...calcEntry(entry) }
    })
}

export interface JournalMonth {
  /** 1 to 12. */
  month: number
  rows: BookRow[]
}

export interface Journal {
  months: JournalMonth[]
  /** Off-statement lines stay out of both totals, so they match the statement (§5). */
  income: Totals
  expense: Totals
}

/** The year's entries in date order, then voucher order, by month. */
export function journal(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): Journal {
  const months: JournalMonth[] = []
  const income = zero()
  const expense = zero()
  for (const row of rowsOf(entries, cats, year)) {
    const month = monthOf(row.entry.date)
    if (months.at(-1)?.month !== month) months.push({ month, rows: [] })
    months[months.length - 1].rows.push(row)
    if (!offStatement(row.line ?? undefined)) {
      add(row.entry.type === "income" ? income : expense, row)
    }
  }
  return { months, income, expense }
}

export interface LedgerAccount {
  line: AccountLine
  rows: BookRow[]
  totals: Totals
}

/**
 * The year's entries by account, in the order of the chart of accounts
 * (§5). An account with no entries is left out. The four 344 lines share an
 * account number but stay apart, as they do on the income statement.
 */
export function generalLedger(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): LedgerAccount[] {
  const byLine = new Map<string, LedgerAccount>()
  for (const row of rowsOf(entries, cats, year)) {
    if (!row.line) continue
    let account = byLine.get(row.line.key)
    if (!account) {
      account = { line: row.line, rows: [], totals: zero() }
      byLine.set(row.line.key, account)
    }
    account.rows.push(row)
    add(account.totals, row)
  }
  return ALL_LINES.flatMap((line) => byLine.get(line.key) ?? [])
}

export interface CrossingEntry {
  row: BookRow
  /** The payment date, or null while open. */
  paid: string | null
  /**
   * "out": dated this year but paid in another, or open, so it is in this
   * year's books and not on its statement. "in": dated in another year and
   * paid in this one, so the other way round.
   */
  direction: "out" | "in"
}

export interface ReconciliationLine {
  line: AccountLine
  /** The account's total in this year's general ledger, by date. */
  ledger: Cents
  /** The "out" entries' net. */
  out: Cents
  /** The "in" entries' net. */
  in: Cents
  /** ledger − out + in: the line on the income statement, in full (§6.3). */
  statement: Cents
}

export interface Reconciliation {
  /** Only the statement lines an entry crosses into or out of. */
  lines: ReconciliationLine[]
  /** Date order, then voucher order. */
  crossings: CrossingEntry[]
}

/**
 * How this year's general ledger becomes its income statement and Form 5
 * (KPL 2:6). The books go by the entry's date, as KPL 2:4 has them, and the
 * statement by the payment date (§6.3), so the two part on exactly the entries
 * paid in a year other than their own. Off-statement lines never reach the
 * statement and are left out. A liikkeenharjoittaja's statement goes by the
 * entry's date too, so nothing crosses.
 */
export function ledgerReconciliation(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  trader: TraderType = "professional"
): Reconciliation {
  if (trader === "business") return { lines: [], crossings: [] }
  const crossings: CrossingEntry[] = []
  for (const entry of entries) {
    const cat = cats.get(entry.catId)
    const line = (cat && LINE_BY_KEY.get(cat.line)) ?? null
    if (!line || offStatement(line)) continue
    const paid = paidDate(entry)
    const dated = yearOf(entry.date) === year
    const paidHere = paid !== null && yearOf(paid) === year
    if (dated === paidHere) continue
    crossings.push({
      row: { entry, line, ...calcEntry(entry) },
      paid,
      direction: dated ? "out" : "in",
    })
  }
  crossings.sort(
    (a, b) =>
      a.row.entry.date.localeCompare(b.row.entry.date) ||
      (a.row.entry.voucher ?? 0) - (b.row.entry.voucher ?? 0)
  )

  const ledger = new Map(
    generalLedger(entries, cats, year).map((a) => [a.line.key, a.totals.net])
  )
  const byLine = new Map<string, ReconciliationLine>()
  for (const { row, direction } of crossings) {
    const line = row.line as AccountLine
    let r = byLine.get(line.key)
    if (!r) {
      const total = ledger.get(line.key) ?? 0
      r = { line, ledger: total, out: 0, in: 0, statement: total }
      byLine.set(line.key, r)
    }
    r[direction] += row.net
    r.statement += direction === "in" ? row.net : -row.net
  }
  return {
    lines: ALL_LINES.flatMap((line) => byLine.get(line.key) ?? []),
    crossings,
  }
}

export interface AccountListRow {
  line: AccountLine
  /** The categories on it that are enabled or used in the year. */
  categories: Category[]
}

/**
 * The account list of KPL 2:2 for one financial year: every account with an
 * enabled category or an entry that year, in chart-of-accounts order.
 */
export function accountList(
  entries: readonly Entry[],
  cats: readonly Category[],
  year: number
): AccountListRow[] {
  const used = new Set(
    entries.filter((e) => yearOf(e.date) === year).map((e) => e.catId)
  )
  return ALL_LINES.flatMap((line) => {
    const categories = cats.filter(
      (c) => c.line === line.key && (c.enabled || used.has(c.id))
    )
    return categories.length ? [{ line, categories }] : []
  })
}
