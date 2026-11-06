import { depreciationMaximums, type AssetOpening } from "@/lib/domain/assets"
import {
  BOOK_LIMIT_RULES,
  type BookLimitBreach,
} from "@/lib/domain/book-limits"
import type { ChangeRecord } from "@/lib/domain/change-log"
import { yearOf } from "@/lib/domain/dates"
import { form5Sections, form5Values } from "@/lib/domain/form5"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { incomeStatement } from "@/lib/domain/income-statement"
import { taxBasisEntries, type TraderType } from "@/lib/domain/open-items"
import {
  evaluate,
  sortBySeverity,
  type Finding,
} from "@/lib/domain/rules/engine"
import {
  FORM5_RULES,
  type Form5Breach,
} from "@/lib/domain/rules/form5-rules"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import {
  VAT_LIMIT_RULES,
  type VatPeriodOverLimit,
  type VatThreshold,
} from "@/lib/domain/vat-threshold"
import {
  YEAR_END_RULES,
  type YearEndFinding,
  type YearEndInput,
} from "@/lib/domain/year-end"

/**
 * "Check my book" (§8.23): every rule set over the whole book, not one year or
 * one period. It builds each set's context and calls `evaluate`; it holds no
 * rule of its own (§6.10).
 *
 * Not run here: the VAT return's checklist (`VAT_CHECK_RULES`), whose entry
 * checks, missing files and unfiled earlier periods are the year-end rules'
 * again for one period, and the period locks (`LOCK_RULES`), which describe a
 * voucher's state rather than a problem with the book.
 */
export interface BookCheckInput {
  entries: readonly Entry[]
  cats: CategoryMap
  today: string
  dirty: boolean
  traderType: TraderType
  vatPeriod: VatPeriodKind
  bookStart: string | null
  vatFiled: Readonly<Record<string, string>>
  changeLog: readonly ChangeRecord[]
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
  /** The figures typed in on Varat ja velat, by year. */
  yearEnd: Readonly<Record<string, YearEnd>>
}

/**
 * One breach and where it came from. `year` is the year it is about, and null
 * for a finding about the book as a whole.
 */
export type BookFinding =
  | { set: "yearEnd"; year: number | null; finding: YearEndFinding }
  | { set: "bookLimits"; year: null; finding: Finding<BookLimitBreach> }
  | {
      set: "vatLimits"
      year: null
      finding: Finding<VatThreshold | VatPeriodOverLimit>
    }
  | { set: "form5"; year: number; finding: Finding<Form5Breach> }

/*
 * Year-end rules that decide whether a year may be locked. The year-end dialog
 * asks them of the year it is closing; a check of the whole book does not
 * lock anything.
 */
const ABOUT_LOCKING = ["yearOngoing", "noEntries"]

/*
 * Year-end rules about what a year leaves behind. They say nothing until the
 * year has ended: its depreciation is not unused yet, and its figures are not
 * due.
 */
const AFTER_YEAR_END = ["yearEndFigures", "depreciation", "openItems"]

/** Unsaved changes belong to the book, so they are reported once. */
const ABOUT_THE_BOOK = ["unsaved"]

/**
 * Every breach in the book. The book's own findings come first, then each year
 * with entries, newest first; blockers lead within each.
 */
export function bookCheck(input: BookCheckInput): BookFinding[] {
  const { entries, cats, today } = input
  const thisYear = yearOf(today)

  const yearEndInput = (year: number): YearEndInput => ({
    entries,
    cats,
    year,
    today,
    dirty: input.dirty,
    vatPeriod: input.vatPeriod,
    bookStart: input.bookStart,
    vatFiled: input.vatFiled,
    changeLog: input.changeLog,
    assetOpening: input.assetOpening,
    yearEnd: input.yearEnd[year],
  })

  const assetsOf = (year: number) =>
    form5Balance({
      entries,
      cats,
      year,
      yearEnd: input.yearEnd[year] ?? EMPTY_YEAR_END,
      assetOpening: input.assetOpening,
      loanOpening: input.loanOpening,
    }).assets

  const book: BookFinding[] = [
    ...(evaluate(
      YEAR_END_RULES,
      yearEndInput(thisYear),
      ABOUT_THE_BOOK
    ) as YearEndFinding[]).map(
      (finding): BookFinding => ({ set: "yearEnd", year: null, finding })
    ),
    ...evaluate(BOOK_LIMIT_RULES, { entries, cats, assetsOf, today }).map(
      (finding): BookFinding => ({ set: "bookLimits", year: null, finding })
    ),
    ...evaluate(VAT_LIMIT_RULES, {
      entries,
      cats,
      vatPeriod: input.vatPeriod,
      today,
    }).map(
      (finding): BookFinding => ({ set: "vatLimits", year: null, finding })
    ),
  ]

  const basis = taxBasisEntries(entries, input.traderType)
  const latest = Math.max(thisYear, ...entries.map((e) => yearOf(e.date)))
  const depreciationMax = depreciationMaximums(
    entries,
    cats,
    input.assetOpening,
    latest
  )

  const bookYears = new Set(entries.map((e) => yearOf(e.date)))
  const formYears = new Set(basis.map((e) => yearOf(e.date)))
  const years = [...new Set([...bookYears, ...formYears])].sort((a, b) => b - a)

  const yearRuleIds = YEAR_END_RULES.rules
    .map((r) => r.id)
    .filter(
      (id) => !ABOUT_LOCKING.includes(id) && !ABOUT_THE_BOOK.includes(id)
    )

  const perYear = years.flatMap((year): BookFinding[] => {
    const out: BookFinding[] = []

    if (bookYears.has(year)) {
      const only = yearRuleIds.filter(
        (id) => year < thisYear || !AFTER_YEAR_END.includes(id)
      )
      for (const finding of evaluate(
        YEAR_END_RULES,
        yearEndInput(year),
        only
      ) as YearEndFinding[]) {
        out.push({ set: "yearEnd", year, finding })
      }
    }

    const yearEnd = input.yearEnd[year] ?? EMPTY_YEAR_END
    const values = form5Values([
      ...form5Sections(incomeStatement(basis, cats, year, { depreciationMax })),
      ...form5BalanceSections(
        form5Balance({
          entries,
          cats,
          year,
          yearEnd,
          assetOpening: input.assetOpening,
          loanOpening: input.loanOpening,
        }),
        yearEnd
      ),
    ])
    for (const finding of evaluate(
      FORM5_RULES,
      (code) => values.get(code) ?? 0
    )) {
      out.push({ set: "form5", year, finding })
    }

    return bySeverity(out)
  })

  return [...bySeverity(book), ...perYear]
}

/** Blockers first, then warnings, then info; each keeps its rule order. */
function bySeverity(list: readonly BookFinding[]): BookFinding[] {
  return sortBySeverity(
    list.map((item) => ({ item, severity: item.finding.severity }))
  ).map((ranked) => ranked.item)
}
