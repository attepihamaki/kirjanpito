import type { DateRange } from "@/lib/domain/books"
import { monthOf, yearOf } from "@/lib/domain/dates"

/**
 * The ranges the audit package's dialog offers as quick picks (§8.25). All of
 * them are whole calendar spans, so every VAT return of a month, quarter or
 * year that falls in one is wholly inside it.
 */
export interface AuditQuickRanges {
  thisYear: DateRange
  lastYear: DateRange
  /** The quarter before the one `today` is in; in Q1 it is last year's Q4. */
  lastQuarter: DateRange
}

const pad2 = (n: number) => String(n).padStart(2, "0")

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function auditQuickRanges(today: string): AuditQuickRanges {
  const year = yearOf(today)
  const quarter = Math.ceil(monthOf(today) / 3)
  const [qYear, q] = quarter === 1 ? [year - 1, 4] : [year, quarter - 1]
  const first = q * 3 - 2
  const last = q * 3
  return {
    thisYear: { from: `${year}-01-01`, to: `${year}-12-31` },
    lastYear: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` },
    lastQuarter: {
      from: `${qYear}-${pad2(first)}-01`,
      to: `${qYear}-${pad2(last)}-${pad2(lastDay(qYear, last))}`,
    },
  }
}

/** Whether `range` is two dates in order. */
export function validAuditRange(range: DateRange): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(range.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(range.to) &&
    range.from <= range.to
  )
}
