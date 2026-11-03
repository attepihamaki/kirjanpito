import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The limits of KPL 1:1a that decide what kind of books a sole trader keeps.
 * Each counts as met only when it holds in both the closed year and the one
 * before it. Staff is the third limit of each, and the book does not record it.
 */
export const SINGLE_ENTRY_LIMITS = {
  assets: 10_000_000,
  turnover: 20_000_000,
  staff: 3,
} as const

/** The micro limits of KPL 1:4b, above which financial statements are required. */
export const MICRO_LIMITS = {
  assets: 45_000_000,
  turnover: 90_000_000,
  staff: 10,
} as const

/** "over": two limits are exceeded in both years. "staff": staff decides it. */
export type LimitStatus = "over" | "staff" | null

export interface BookLimits {
  year: number
  singleEntry: LimitStatus
  statements: LimitStatus
}

/** Turnover for the limits: all of line 300, net. */
export function yearTurnover(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): Cents {
  return entries
    .filter(
      (e) =>
        yearOf(e.date) === year &&
        e.type === "income" &&
        cats.get(e.catId)?.line === "300"
    )
    .reduce((sum, e) => sum + calcEntry(e).net, 0)
}

function status(
  limits: { assets: Cents; turnover: Cents },
  years: readonly { assets: Cents; turnover: Cents }[]
): LimitStatus {
  const counts = years.map(
    (y) =>
      Number(y.assets > limits.assets) + Number(y.turnover > limits.turnover)
  )
  if (counts.every((n) => n >= 2)) return "over"
  return counts.every((n) => n >= 1) ? "staff" : null
}

/**
 * Where the last two closed years stand. `assetsOf` gives a year's balance
 * sheet total as far as the book knows it. Bank deposits are not in the book,
 * so a business near the limit has to count them in itself.
 */
export function bookLimits(
  entries: readonly Entry[],
  cats: CategoryMap,
  assetsOf: (year: number) => Cents,
  today: string
): BookLimits {
  const year = yearOf(today) - 1
  const years = [year, year - 1].map((y) => ({
    assets: assetsOf(y),
    turnover: yearTurnover(entries, cats, y),
  }))
  return {
    year,
    singleEntry: status(SINGLE_ENTRY_LIMITS, years),
    statements: status(MICRO_LIMITS, years),
  }
}
