import * as React from "react"

import { form5Sections } from "@/lib/domain/form5"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
} from "@/lib/domain/form5-balance"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"
import { useStatementOptions, useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

/**
 * The selected year's Form 5 as a checklist (§8.8): the income and expense
 * fields in the form's order, then the assets, liabilities and wages. The
 * balance is returned too, since the year-end step quotes its figures.
 */
export function useForm5() {
  const basis = useTaxBasisEntries()
  const options = useStatementOptions()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const yearEnd = useBookStore((s) => s.yearEnd[year]) ?? EMPTY_YEAR_END
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)

  const balance = React.useMemo(
    () =>
      form5Balance({
        entries,
        cats: indexCategories(cats),
        year,
        yearEnd,
        assetOpening,
        loanOpening,
      }),
    [entries, cats, year, yearEnd, assetOpening, loanOpening]
  )
  const sections = React.useMemo(
    () => [
      ...form5Sections(
        incomeStatement(basis, indexCategories(cats), year, options)
      ),
      ...form5BalanceSections(balance, yearEnd),
    ],
    [basis, cats, year, balance, yearEnd, options]
  )

  return { year, sections, balance }
}
