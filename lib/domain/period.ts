import { monthOf, quarterMonths, yearOf } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"

/** The reporting period: a whole year, one month, or one quarter of it. */
export type Period =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number }
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }

export function inPeriod(e: Pick<Entry, "date">, p: Period): boolean {
  if (yearOf(e.date) !== p.year) return false
  if (p.kind === "year") return true
  const m = monthOf(e.date)
  if (p.kind === "month") return m === p.month
  const [from, to] = quarterMonths(p.quarter)
  return m >= from && m <= to
}

export function filterPeriod(entries: readonly Entry[], p: Period): Entry[] {
  return entries.filter((e) => inPeriod(e, p))
}
