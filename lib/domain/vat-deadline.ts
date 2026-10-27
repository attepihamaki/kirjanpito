import { isoDate, monthOf, quarterMonths, yearOf } from "@/lib/domain/dates"
import type { Period } from "@/lib/domain/period"

/**
 * VAT reporting periods and their due dates (§6.5).
 *
 * A monthly or quarterly return is due on the 12th of the second month after
 * the period, a yearly one at the end of February. A due date on a weekend or
 * a Finnish bank holiday moves to the next working day.
 */

/** How often the user files a VAT return. A setting, kept in `settings.json`. */
export type VatPeriodKind = "month" | "quarter" | "year"

export interface VatPeriod {
  kind: VatPeriodKind
  year: number
  /** 1 to 12 for a month, 1 to 4 for a quarter, 1 for a year. */
  index: number
  /** `"2026-09"`, `"2026-Q3"` or `"2026"`: the key a filed mark is stored under. */
  key: string
  /** First and last day, ISO. */
  from: string
  to: string
  /** ISO, already moved past weekends and holidays. */
  due: string
}

/** Where a period stands on a given day. */
export type VatPeriodStatus =
  /** Has not started. */
  | "future"
  /** Today falls inside it. */
  | "open"
  /** Closed and marked as filed. */
  | "filed"
  /** Closed, not filed, due date still ahead (or today). */
  | "due"
  /** Closed, not filed, due date passed. */
  | "overdue"

const pad2 = (n: number) => String(n).padStart(2, "0")

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addDays(iso: string, days: number): string {
  const d = new Date(
    Date.UTC(yearOf(iso), monthOf(iso) - 1, Number(iso.slice(8, 10)))
  )
  d.setUTCDate(d.getUTCDate() + days)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function weekday(iso: string): number {
  return new Date(
    Date.UTC(yearOf(iso), monthOf(iso) - 1, Number(iso.slice(8, 10)))
  ).getUTCDay()
}

/** Easter Sunday, by the anonymous Gregorian algorithm. */
function easter(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * The weekdays Finnish banks are closed. Midsummer Eve and Christmas Eve are
 * not public holidays, but no payment goes through on them either.
 */
export function bankHolidays(year: number): ReadonlySet<string> {
  const e = easter(year)
  const midsummerEve = Array.from(
    { length: 7 },
    (_, i) => `${year}-06-${19 + i}`
  ).find((d) => weekday(d) === 5) as string
  return new Set([
    `${year}-01-01`,
    `${year}-01-06`,
    addDays(e, -2),
    addDays(e, 1),
    `${year}-05-01`,
    addDays(e, 39),
    midsummerEve,
    `${year}-12-06`,
    `${year}-12-24`,
    `${year}-12-25`,
    `${year}-12-26`,
  ])
}

/** The day itself if it is a working day, otherwise the next one that is. */
export function nextWorkingDay(iso: string): string {
  let d = iso
  for (;;) {
    const w = weekday(d)
    if (w !== 0 && w !== 6 && !bankHolidays(yearOf(d)).has(d)) return d
    d = addDays(d, 1)
  }
}

function makePeriod(
  kind: VatPeriodKind,
  year: number,
  index: number
): VatPeriod {
  if (kind === "year") {
    return {
      kind,
      year,
      index: 1,
      key: String(year),
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      due: nextWorkingDay(`${year + 1}-02-${lastDay(year + 1, 2)}`),
    }
  }
  const [first, last] =
    kind === "quarter"
      ? quarterMonths(index as 1 | 2 | 3 | 4)
      : ([index, index] as const)
  // The 12th of the second month after the period's last month.
  const dueMonth = last + 2
  const dueYear = year + Math.floor((dueMonth - 1) / 12)
  const due = isoDate(dueYear, ((dueMonth - 1) % 12) + 1, 12) as string
  return {
    kind,
    year,
    index,
    key: kind === "quarter" ? `${year}-Q${index}` : `${year}-${pad2(index)}`,
    from: `${year}-${pad2(first)}-01`,
    to: `${year}-${pad2(last)}-${pad2(lastDay(year, last))}`,
    due: nextWorkingDay(due),
  }
}

/** Every period of one year, in order. */
export function vatPeriods(kind: VatPeriodKind, year: number): VatPeriod[] {
  const count = kind === "month" ? 12 : kind === "quarter" ? 4 : 1
  return Array.from({ length: count }, (_, i) => makePeriod(kind, year, i + 1))
}

/** The period of `kind` that contains `iso`. */
export function periodContaining(kind: VatPeriodKind, iso: string): VatPeriod {
  const m = monthOf(iso)
  const index = kind === "month" ? m : kind === "quarter" ? Math.ceil(m / 3) : 1
  return makePeriod(kind, yearOf(iso), index)
}

/** The same span as a `Period`, for filtering entries. */
export function asPeriod(p: VatPeriod): Period {
  if (p.kind === "year") return { kind: "year", year: p.year }
  if (p.kind === "quarter") {
    return { kind: "quarter", year: p.year, quarter: p.index as 1 | 2 | 3 | 4 }
  }
  return { kind: "month", year: p.year, month: p.index }
}

export function periodStatus(
  p: VatPeriod,
  today: string,
  filed: Readonly<Record<string, string>>
): VatPeriodStatus {
  if (today < p.from) return "future"
  if (today <= p.to) return "open"
  if (filed[p.key]) return "filed"
  return today > p.due ? "overdue" : "due"
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = (iso: string) =>
    Date.UTC(yearOf(iso), monthOf(iso) - 1, Number(iso.slice(8, 10)))
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

export interface TimelinePeriod extends VatPeriod {
  status: VatPeriodStatus
}

/**
 * The periods the user has to answer for, oldest first: from the period of
 * the book's first entry up to the one after today's. A return is owed for a
 * closed period even when it had no entries, a nil return, but not for a
 * period before the bookkeeping began, so a book started in October does not
 * report January to September as overdue.
 *
 * Empty when the book has no entries.
 */
export function vatTimeline(
  kind: VatPeriodKind,
  firstEntryDate: string | null,
  today: string,
  filed: Readonly<Record<string, string>>
): TimelinePeriod[] {
  if (!firstEntryDate) return []
  const out: TimelinePeriod[] = []
  const start = periodContaining(kind, firstEntryDate)
  const current = periodContaining(kind, today)
  const lastYear = Math.max(current.year, start.year) + 1
  for (let y = start.year; y <= lastYear; y++) {
    for (const p of vatPeriods(kind, y)) {
      if (p.from < start.from) continue
      out.push({ ...p, status: periodStatus(p, today, filed) })
      // One period past today's, so "and after that" always has an answer.
      if (p.from > current.from) return out
    }
  }
  return out
}
