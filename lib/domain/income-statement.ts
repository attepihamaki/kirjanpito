import { LINES, type AccountLine } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { roundCents } from "@/lib/domain/money"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

export interface StatementLine {
  line: AccountLine
  /** The line in full, as the books have it. */
  net: Cents
  /**
   * The part that enters the result (§6.3): the taxable part of an income
   * line, the deductible part of an expense line. Zero on 317 and 365–367,
   * half of 341, and the taxable share of the dividends on 319 and 321.
   */
  counted: Cents
}

/** The relief on a co-operative's surplus: the first 5 000 € is taxed at the lower share. */
export const COOP_RELIEF: Cents = 500_000
/** The taxable percentage of surplus within the relief, and above it. */
export const COOP_SHARE_BELOW = 25
export const COOP_SHARE_ABOVE = 75

export interface StatementOptions {
  /**
   * The most depreciation the asset register allows, by year (§8.8). A year
   * with no register is not capped, since line 337 then has no pool to measure
   * against.
   */
  depreciationMax?: ReadonlyMap<number, Cents>
}

export interface IncomeStatement {
  year: number
  /** All 33 lines, in display order, zeros included. */
  lines: readonly StatementLine[]
  /** Every income line in full: the income section's heading. */
  incomeTotal: Cents
  /** Every expense line in full: the expense section's heading. */
  expenseTotal: Cents
  /** Taxable revenue, Form 5's 316: the counted part of the income lines. */
  revenueTotal: Cents
  /** Line 317, which is reported on Form 5 but not taxed. */
  taxExemptTotal: Cents
  /** Form 5's 355: the counted part of the expense lines. */
  deductibleTotal: Cents
  /** Lines 365–367. */
  nonDeductibleTotal: Cents
  /** Line 341 in full, as Form 5 asks for it. */
  entertainmentTotal: Cents
  /** The half of 341 that is deducted: Form 5's field 342, at most 50 % of 341. */
  entertainmentDeductible: Cents
  /** Lines 319 and 321 in full. */
  dividendTotal: Cents
  /** Their taxable part, Form 5's 320 plus 322. */
  dividendTaxable: Cents
  /** Line 327 in full. */
  surplusTotal: Cents
  /** Its taxable part, Form 5's 328. */
  surplusTaxable: Cents
  /** Depreciation booked above the register's maximum: the part of 337 not deducted. */
  depreciationExcess: Cents
  /** Signed: revenue − deductible. */
  result: Cents
  resultLine: "358" | "359"
  /** The absolute value: form 5 wants a positive figure on both 358 and 359. */
  resultMagnitude: Cents
}

/**
 * Net amount per income-statement line. Entries whose category is unknown fall
 * back to 301 (income) or 344-other (expense), matching CSV import.
 */
export function netByLine(
  entries: readonly Entry[],
  cats: CategoryMap
): ReadonlyMap<string, Cents> {
  const out = new Map<string, Cents>()
  for (const e of entries) {
    const cat = cats.get(e.catId)
    const key = cat?.line ?? (e.type === "income" ? "301" : "344-other")
    out.set(key, (out.get(key) ?? 0) + calcEntry(e).net)
  }
  return out
}

/** The income statement for 1.1.–31.12. of `year`. All amounts exclude VAT. */
export function incomeStatement(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number,
  options: StatementOptions = {}
): IncomeStatement {
  const depreciationMax = options.depreciationMax?.get(year)
  const byLine = netByLine(
    entries.filter((e) => yearOf(e.date) === year),
    cats
  )

  const lines: StatementLine[] = LINES.map((line) => {
    const net = byLine.get(line.key) ?? 0
    return { line, net, counted: countedPart(line, net, depreciationMax) }
  })

  const sum = (
    pick: (l: StatementLine) => boolean,
    value: (l: StatementLine) => Cents
  ) => lines.filter(pick).reduce((acc, l) => acc + value(l), 0) + 0
  const income = (l: StatementLine) => l.line.side === "income"
  const expense = (l: StatementLine) => l.line.side === "expense"
  const net = (l: StatementLine) => l.net
  const counted = (l: StatementLine) => l.counted

  const revenueTotal = sum(income, counted)
  const deductibleTotal = sum(expense, counted)
  const result = revenueTotal - deductibleTotal + 0
  return {
    year,
    lines,
    incomeTotal: sum(income, net),
    expenseTotal: sum(expense, net),
    revenueTotal,
    taxExemptTotal: sum((l) => l.line.taxExempt, net),
    deductibleTotal,
    nonDeductibleTotal: sum((l) => l.line.nondeductible, net),
    entertainmentTotal: sum((l) => l.line.halfDeductible, net),
    entertainmentDeductible: sum((l) => l.line.halfDeductible, counted),
    dividendTotal: sum((l) => l.line.taxableShare != null, net),
    dividendTaxable: sum((l) => l.line.taxableShare != null, counted),
    surplusTotal: sum((l) => l.line.surplus, net),
    surplusTaxable: sum((l) => l.line.surplus, counted),
    depreciationExcess: sum(
      (l) => l.line.key === "337",
      (l) => l.net - l.counted
    ),
    result,
    resultLine: result >= 0 ? "358" : "359",
    resultMagnitude: Math.abs(result) + 0,
  }
}

function countedPart(
  line: AccountLine,
  net: Cents,
  depreciationMax: Cents | undefined
): Cents {
  if (line.taxExempt || line.nondeductible) return 0
  if (line.key === "337" && depreciationMax !== undefined) {
    return Math.min(net, depreciationMax) + 0
  }
  /*
   * Rounded up, so 328 is never under a quarter of 327 by a fraction of a
   * cent, which the form's own check refuses.
   */
  if (line.surplus) {
    const within = Math.min(net, COOP_RELIEF)
    const above = Math.max(0, net - COOP_RELIEF)
    const share = (within * COOP_SHARE_BELOW + above * COOP_SHARE_ABOVE) / 100
    return (net >= 0 ? Math.ceil(share) : Math.trunc(share)) + 0
  }
  // Truncated, so 342 never exceeds half of 341 by a rounded cent.
  if (line.halfDeductible) return Math.trunc(net / 2) + 0
  // Rounded: Form 5 only requires 320 ≤ 319 and 322 ≤ 321.
  if (line.taxableShare != null) {
    return roundCents((net * line.taxableShare) / 100)
  }
  return net
}
