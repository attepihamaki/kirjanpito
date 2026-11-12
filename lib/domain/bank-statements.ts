import { bookPayments, type BookPayment } from "@/lib/domain/bank-reconcile"
import type { StatementInfo } from "@/lib/domain/bank-csv"
import { parseIban } from "@/lib/domain/iban"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The statements the book has been set against (§8.38). Each import keeps a
 * short record of its statement: the days it covers, its sum and what the
 * book moved through the bank on those days. The rows themselves are not
 * kept. The reconciliation page works out each statement against the book
 * as it stands now, so an entry changed after the import shows up there.
 */

export interface StatementRecord {
  id: string
  /** The first and last day the statement covers, ISO. */
  from: string
  to: string
  /** How many transactions it held. */
  rows: number
  /** The transactions' sum, money in positive. */
  movement: Cents
  /** What the book moved through the bank over those days when it was imported and booked. */
  bookMovement: Cents
  /** The balances the statement gives, when it gives them. */
  opening?: Cents
  closing?: Cents
  /** The statement's own account, compact, when it names one. */
  iban?: string
  /** The name of the file it came from. */
  fileName?: string
  /** ISO date of the import. */
  importedAt: string
}

/** How a statement and the book compare today. */
export type StatementStatus = "agrees" | "changed" | "differs"

export interface StatementCheck {
  record: StatementRecord
  /** What the book moves through the bank over the statement's days now. */
  bookMovement: Cents
  /** `record.movement - bookMovement`: zero when the two agree. */
  difference: Cents
  /**
   * `agrees` when the book moves what the statement does. `changed` when it
   * did at the import and no longer does, so an entry on those days was
   * changed since. `differs` when it never did.
   */
  status: StatementStatus
  /**
   * Opening balance plus transactions less closing balance, when the
   * statement gives both. Anything but zero means the file lacked rows.
   */
  gap: Cents | null
  /**
   * The previous statement's closing balance less this one's opening
   * balance, when both are known and the two statements follow each other.
   */
  chainBreak: Cents | null
}

export type MonthStatus = StatementStatus | "none"

export interface MonthCover {
  /** 1 to 12. */
  month: number
  /** The worst status of the statements that cover some day of the month, or `none`. */
  status: MonthStatus
  /** The statements that cover some day of the month. */
  checks: StatementCheck[]
  /** The book's payments through the bank that month on days no statement covers. */
  uncovered: BookPayment[]
}

/** Statements of one account and the same days are the same statement. */
function recordKey(r: Pick<StatementRecord, "iban" | "from" | "to">): string {
  return `${r.iban ?? ""}|${r.from}|${r.to}`
}

/** Sorted by first day, then last. */
function byDays(a: StatementRecord, b: StatementRecord): number {
  return a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
}

/** A statement's record before the book's side of it is taken. */
export type StatementDraft = Omit<StatementRecord, "bookMovement">

/** The record of a statement just set against the book, but for the book's side. */
export function statementDraft(input: {
  id: string
  from: string
  to: string
  rows: number
  movement: Cents
  statement?: StatementInfo
  fileName?: string
  today: string
}): StatementDraft {
  const { statement } = input
  return {
    id: input.id,
    from: input.from,
    to: input.to,
    rows: input.rows,
    movement: input.movement,
    ...(statement?.opening ? { opening: statement.opening.amount } : {}),
    ...(statement?.closing ? { closing: statement.closing.amount } : {}),
    ...(statement?.iban ? { iban: statement.iban } : {}),
    ...(input.fileName ? { fileName: input.fileName } : {}),
    importedAt: input.today,
  }
}

/**
 * Add a record, replacing one for the same account and days, so importing a
 * statement again keeps one record of it, the newest. Returns the list and
 * the record replaced, for an undo.
 */
export function withStatement(
  list: readonly StatementRecord[],
  record: StatementRecord
): { list: StatementRecord[]; replaced: StatementRecord | null } {
  const key = recordKey(record)
  const replaced = list.find((r) => recordKey(r) === key) ?? null
  const kept = list.filter((r) => r !== replaced)
  return { list: [...kept, record].sort(byDays), replaced }
}

/** What the book moves through the bank over the days. */
export function bookMovement(
  entries: readonly Entry[],
  cats: CategoryMap,
  from: string,
  to: string
): Cents {
  return bookPayments(entries, cats, from, to).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}

/** The day after an ISO date. */
function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Every record set against the book as it stands, in order of days. */
export function checkStatements(
  list: readonly StatementRecord[],
  entries: readonly Entry[],
  cats: CategoryMap
): StatementCheck[] {
  const sorted = [...list].sort(byDays)
  return sorted.map((record, i) => {
    const now = bookMovement(entries, cats, record.from, record.to)
    const difference = record.movement - now
    const status: StatementStatus =
      difference === 0
        ? "agrees"
        : record.movement === record.bookMovement
          ? "changed"
          : "differs"
    const gap =
      record.opening != null && record.closing != null
        ? record.opening + record.movement - record.closing
        : null
    const before = sorted
      .slice(0, i)
      .reverse()
      .find((r) => (r.iban ?? "") === (record.iban ?? ""))
    const follows =
      before &&
      before.closing != null &&
      record.opening != null &&
      (nextDay(before.to) === record.from || before.to === record.from)
    return {
      record,
      bookMovement: now,
      difference,
      status,
      gap,
      chainBreak:
        follows && before.closing !== record.opening
          ? (before.closing as Cents) - (record.opening as Cents)
          : null,
    }
  })
}

/** Whether a check needs the user to look at it. */
export function needsLook(check: StatementCheck): boolean {
  return check.status !== "agrees" || !!check.gap || check.chainBreak !== null
}

/**
 * How a check counts towards its month: a statement that disagrees with
 * itself, or with the one before it, differs however the book stands.
 */
function monthStatusOf(check: StatementCheck): StatementStatus {
  if (check.status !== "agrees") return check.status
  return check.gap || check.chainBreak !== null ? "differs" : "agrees"
}

/** Worst first. */
const WORST: readonly StatementStatus[] = ["changed", "differs", "agrees"]

/**
 * The year month by month: which statements cover it, how the worst of them
 * stands, and the book's bank payments on days no statement covers.
 */
export function monthCovers(
  checks: readonly StatementCheck[],
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): MonthCover[] {
  const payments = bookPayments(entries, cats, `${year}-01-01`, `${year}-12-31`)
  const covered = (day: string) =>
    checks.some((c) => c.record.from <= day && day <= c.record.to)
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const first = `${year}-${String(month).padStart(2, "0")}-01`
    const last = `${year}-${String(month).padStart(2, "0")}-31`
    const inMonth = checks.filter(
      (c) => c.record.from <= last && c.record.to >= first
    )
    const status: MonthStatus =
      inMonth.length === 0
        ? "none"
        : (WORST.find((s) => inMonth.some((c) => monthStatusOf(c) === s)) ??
          "agrees")
    return {
      month,
      status,
      checks: inMonth,
      uncovered: payments.filter(
        (p) => p.date >= first && p.date <= last && !covered(p.date)
      ),
    }
  })
}

/** The records whose days reach into the year. */
export function statementsInYear(
  checks: readonly StatementCheck[],
  year: number
): StatementCheck[] {
  return checks.filter(
    (c) => c.record.from <= `${year}-12-31` && c.record.to >= `${year}-01-01`
  )
}

/* -------------------------------------------------------------------------
 * File
 * ---------------------------------------------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isCents = (v: unknown): v is Cents =>
  typeof v === "number" && Number.isSafeInteger(v)

/** One record as `settings.json` holds it, or null when it cannot be read (§7.6). */
export function parseStatementRecord(value: unknown): StatementRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null
  const v = value as Record<string, unknown>
  if (typeof v.id !== "string" || !v.id) return null
  if (typeof v.from !== "string" || !ISO_DATE.test(v.from)) return null
  if (typeof v.to !== "string" || !ISO_DATE.test(v.to) || v.to < v.from)
    return null
  if (!Number.isInteger(v.rows) || (v.rows as number) < 0) return null
  if (!isCents(v.movement) || !isCents(v.bookMovement)) return null
  if (typeof v.importedAt !== "string" || !ISO_DATE.test(v.importedAt))
    return null
  const iban = typeof v.iban === "string" ? parseIban(v.iban) : null
  const fileName =
    typeof v.fileName === "string" ? v.fileName.trim().slice(0, 200) : ""
  return {
    id: v.id,
    from: v.from,
    to: v.to,
    rows: v.rows as number,
    movement: v.movement,
    bookMovement: v.bookMovement,
    ...(isCents(v.opening) ? { opening: v.opening } : {}),
    ...(isCents(v.closing) ? { closing: v.closing } : {}),
    ...(iban ? { iban } : {}),
    ...(fileName ? { fileName } : {}),
    importedAt: v.importedAt,
  }
}

/** The records a file holds, one per account and days, the later kept. */
export function parseStatementRecords(value: unknown): StatementRecord[] {
  if (!Array.isArray(value)) return []
  let list: StatementRecord[] = []
  for (const item of value) {
    const record = parseStatementRecord(item)
    if (record) list = withStatement(list, record).list
  }
  return list
}
