import { LINES, type AccountLine } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

export interface StatementLine {
  line: AccountLine
  net: Cents
}

export interface IncomeStatement {
  year: number
  /** All 29 lines, in display order, zeros included. */
  lines: readonly StatementLine[]
  /** Taxable revenue: every income line except 317 (§6.3). */
  revenueTotal: Cents
  /** Line 317, which is reported on Form 5 but not taxed. */
  taxExemptTotal: Cents
  /** Excludes 365–367, includes 353 and 354 (§6.3). */
  deductibleTotal: Cents
  nonDeductibleTotal: Cents
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
  year: number
): IncomeStatement {
  const byLine = netByLine(
    entries.filter((e) => yearOf(e.date) === year),
    cats
  )

  let revenueTotal = 0
  let taxExemptTotal = 0
  let deductibleTotal = 0
  let nonDeductibleTotal = 0

  const lines: StatementLine[] = LINES.map((line) => {
    const net = byLine.get(line.key) ?? 0
    if (line.side === "income") {
      if (line.taxExempt) taxExemptTotal += net
      else revenueTotal += net
    } else if (line.nondeductible) nonDeductibleTotal += net
    else deductibleTotal += net
    return { line, net }
  })

  const result = revenueTotal - deductibleTotal + 0
  return {
    year,
    lines,
    revenueTotal,
    taxExemptTotal,
    deductibleTotal,
    nonDeductibleTotal,
    result,
    resultLine: result >= 0 ? "358" : "359",
    resultMagnitude: Math.abs(result) + 0,
  }
}
