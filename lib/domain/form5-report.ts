import type { AssetOpening } from "@/lib/domain/assets"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
  type Form5Balance,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { form5Sections } from "@/lib/domain/form5"
import type { IncomeStatement } from "@/lib/domain/income-statement"
import type { TaxFormSection } from "@/lib/domain/tax-form"
import type { CategoryMap, Cents, Entry } from "@/lib/domain/types"

export interface Form5ReportInput {
  statement: IncomeStatement
  entries: readonly Entry[]
  cats: CategoryMap
  year: number
  yearEnd: YearEnd | undefined
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
}

export interface Form5Report {
  balance: Form5Balance
  /** Every field of the year's return, in the form's order. */
  sections: TaxFormSection[]
}

/**
 * Form 5 for a year (§8.8), whole: the income statement's fields, the net
 * worth, and the details typed in. Every view and report builds it here, so
 * they all agree on the figures that depend on each other: interest that is
 * not deductible changes 347, 355 and the result, and it depends on the net
 * worth.
 */
export function form5Report(input: Form5ReportInput): Form5Report {
  const { statement } = input
  const yearEnd = input.yearEnd ?? EMPTY_YEAR_END
  const net = (account: number): Cents =>
    statement.lines
      .filter((l) => l.line.account === account)
      .reduce((acc, l) => acc + l.net, 0)
  const balance = form5Balance({
    entries: input.entries,
    cats: input.cats,
    year: input.year,
    yearEnd,
    assetOpening: input.assetOpening,
    loanOpening: input.loanOpening,
    interestExpense: net(346),
    carBooked: net(313),
  })
  return {
    balance,
    sections: [
      ...form5Sections(statement, balance.interest.disallowed),
      ...form5BalanceSections(balance, yearEnd),
    ],
  }
}
