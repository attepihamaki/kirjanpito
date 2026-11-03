import {
  ALL_LINES,
  LINE_BY_KEY,
  offStatement,
  type AccountLine,
} from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

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
  /** Fixed assets stay out of both totals, so they match the statement (§5). */
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
