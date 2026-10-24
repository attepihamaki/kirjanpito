import { monthOf, quarterMonths, yearOf } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"

/** The reporting period: a whole year, one month, or one quarter of it. */
export type Period =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number }
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }

export function inPeriod(e: Pick<Entry, "pvm">, p: Period): boolean {
  if (yearOf(e.pvm) !== p.year) return false
  if (p.kind === "year") return true
  const m = monthOf(e.pvm)
  if (p.kind === "month") return m === p.month
  const [from, to] = quarterMonths(p.quarter)
  return m >= from && m <= to
}

export function filterPeriod(entries: readonly Entry[], p: Period): Entry[] {
  return entries.filter((e) => inPeriod(e, p))
}

/** Human-readable range, for the income statement header. */
export function periodRange(p: Period): { from: string; to: string } {
  if (p.kind === "month") {
    const last = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate()
    const mm = String(p.month).padStart(2, "0")
    return { from: `${p.year}-${mm}-01`, to: `${p.year}-${mm}-${last}` }
  }
  if (p.kind === "quarter") {
    const [a, b] = quarterMonths(p.quarter)
    const last = new Date(Date.UTC(p.year, b, 0)).getUTCDate()
    return {
      from: `${p.year}-${String(a).padStart(2, "0")}-01`,
      to: `${p.year}-${String(b).padStart(2, "0")}-${last}`,
    }
  }
  return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
}
