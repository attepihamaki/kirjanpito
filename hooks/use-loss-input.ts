import * as React from "react"

import { yearOf } from "@/lib/domain/dates"
import { incomeStatement } from "@/lib/domain/income-statement"
import type { LossInput } from "@/lib/domain/tax-loss"
import { indexCategories, type Cents } from "@/lib/domain/types"
import { useStatementOptions, useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

/**
 * What the loss ledger reads (§6.15): every year's result as the income
 * statement gives it, the confirmed losses typed in and the parts of a loss
 * deducted from capital income (373).
 */
export function useLossInput(): LossInput {
  const basis = useTaxBasisEntries()
  const options = useStatementOptions()
  const cats = useBookStore((s) => s.cats)
  const confirmed = useBookStore((s) => s.taxLosses)
  const yearEnd = useBookStore((s) => s.yearEnd)

  return React.useMemo(() => {
    const catMap = indexCategories(cats)
    const years = [...new Set(basis.map((e) => yearOf(e.date)))]
    const results = new Map<number, Cents>(
      years.map((y) => [y, incomeStatement(basis, catMap, y, options).result])
    )
    const toCapital = Object.fromEntries(
      Object.entries(yearEnd).map(([y, end]) => [y, end.lossToCapital])
    )
    return { results, confirmed, toCapital }
  }, [basis, options, cats, confirmed, yearEnd])
}
