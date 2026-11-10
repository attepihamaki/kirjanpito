import type { Cents } from "@/lib/domain/types"

/**
 * Losses carried forward (§6.15, TVL 119 §). A year's business loss (359) is
 * confirmed in the tax assessment and deducted from the business income of the
 * next ten years, oldest loss first, as far as each year's profit reaches.
 * Verohallinto makes the deduction itself; the app follows it so the user sees
 * what is left, what runs out and what the tax estimate should leave out.
 *
 * A year's loss is the book's own figure until the user types the confirmed
 * one from the tax decision, which then replaces it, and a loss from before the
 * book exists only as a confirmed figure.
 */

/** The years after its own in which a loss can be deducted. */
export const LOSS_YEARS = 10

export interface LossInput {
  /** The result of each year the book holds, signed: 358 positive, 359 negative. */
  results: ReadonlyMap<number, Cents>
  /** The loss confirmed in the assessment, by year (`"2024"`), in positive cents. */
  confirmed: Readonly<Record<string, Cents>>
  /** The part of a year's loss deducted from capital income instead (373), by year. */
  toCapital?: Readonly<Record<string, Cents>>
}

/** One year's loss and what has become of it. */
export interface LossOrigin {
  year: number
  /** The loss carried forward: confirmed, or else the book's own less 373. */
  amount: Cents
  /** Whether `amount` is the confirmed figure rather than the book's. */
  confirmed: boolean
  /** Deducted so far, through the year asked about. */
  used: Cents
  /** What can still be deducted after that year. */
  left: Cents
  /** The last year it can be deducted in. */
  lastYear: number
  /** Left undeducted when its last year passed. */
  expired: Cents
}

/** A deduction made in one year from an earlier year's loss. */
export interface LossDeduction {
  from: number
  amount: Cents
}

export interface LossYear {
  year: number
  /** The year's profit before the losses, 0 in a loss year. */
  profit: Cents
  deductions: LossDeduction[]
  /** The sum of `deductions`. */
  deducted: Cents
}

export interface LossLedger {
  origins: LossOrigin[]
  years: LossYear[]
}

function positive(value: Cents | undefined): Cents {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : 0
}

/**
 * The losses and their deductions through the end of `through`, oldest first.
 * A year without a result in the book deducts nothing, since its profit is not
 * known; a confirmed loss for it still counts.
 */
export function lossLedger(input: LossInput, through: number): LossLedger {
  const years = new Set<number>()
  for (const y of input.results.keys()) if (y <= through) years.add(y)
  for (const key of Object.keys(input.confirmed)) {
    const y = Number(key)
    if (/^\d{4}$/.test(key) && y <= through) years.add(y)
  }
  const sorted = [...years].sort((a, b) => a - b)

  const origins: LossOrigin[] = []
  const out: LossYear[] = []
  for (const year of sorted) {
    for (const o of origins) {
      if (o.lastYear < year && o.left > 0) {
        o.expired = o.left
        o.left = 0
      }
    }
    const result = input.results.get(year)
    const profit = result !== undefined && result > 0 ? result : 0
    let room = profit
    const deductions: LossDeduction[] = []
    for (const o of origins) {
      if (room === 0) break
      if (o.left === 0) continue
      const amount = Math.min(o.left, room)
      o.left -= amount
      o.used += amount
      room -= amount
      deductions.push({ from: o.year, amount })
    }
    if (result !== undefined || String(year) in input.confirmed) {
      out.push({
        year,
        profit,
        deductions,
        deducted: profit - room,
      })
    }

    const key = String(year)
    const confirmed = key in input.confirmed
    const own =
      result !== undefined && result < 0
        ? Math.max(0, -result - positive(input.toCapital?.[key]))
        : 0
    const amount = confirmed ? positive(input.confirmed[key]) : own
    if (amount > 0) {
      origins.push({
        year,
        amount,
        confirmed,
        used: 0,
        left: amount,
        lastYear: year + LOSS_YEARS,
        expired: 0,
      })
    }
  }
  return { origins, years: out }
}

/**
 * What a year's profit can absorb of the losses left after the year before:
 * the deduction the tax estimate takes for a year still running, whose
 * profit is only a pace.
 */
export function lossAvailable(
  input: LossInput,
  year: number,
  profit: Cents
): Cents {
  const before = lossLedger(input, year - 1)
  const left = before.origins
    .filter((o) => o.lastYear >= year)
    .reduce((sum, o) => sum + o.left, 0)
  return Math.min(left, Math.max(0, profit))
}
