import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { limitOn } from "@/lib/domain/rule-tables"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The limits of KPL 1:1a that decide what kind of books a sole trader keeps.
 * Each counts as met only when it holds in both the closed year and the one
 * before it. Staff, more than 3, is the third limit, and the book does not
 * record it.
 */
function singleEntryLimits(year: number) {
  const on = `${year}-12-31`
  return {
    assets: limitOn("singleEntryAssets", on),
    turnover: limitOn("singleEntryTurnover", on),
  }
}

/**
 * The micro limits of KPL 1:4b, above which financial statements are required.
 * Staff, 10 or more, is the third limit.
 */
function microLimits(year: number) {
  const on = `${year}-12-31`
  return {
    assets: limitOn("microAssets", on),
    turnover: limitOn("microTurnover", on),
  }
}

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
    singleEntry: status(singleEntryLimits(year), years),
    statements: status(microLimits(year), years),
  }
}
