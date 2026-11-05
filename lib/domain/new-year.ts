import {
  assetSchedule,
  depreciationMaximums,
  type AssetOpening,
} from "@/lib/domain/assets"
import {
  EMPTY_YEAR_END,
  loanBalance,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { incomeStatement } from "@/lib/domain/income-statement"
import {
  balancesAt,
  taxBasisEntries,
  type TraderType,
} from "@/lib/domain/open-items"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * Opening a year (§8.14). Most of what a new year starts from carries over by
 * itself: the asset pool and the loans roll forward, open items follow their
 * payment dates, templates have no end and voucher numbers restart at 1. This
 * module reads those figures for the dialog and owns the one thing that does
 * not carry, the year-end figures typed in on Varat ja velat.
 */

export interface NewYearInput {
  entries: readonly Entry[]
  cats: CategoryMap
  /** The year being opened. */
  year: number
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
  yearEnd: Readonly<Record<string, YearEnd>>
  form5Filed: Readonly<Record<string, string>>
  recurring: readonly RecurringEntry[]
  /** Absent means an ammatinharjoittaja. */
  traderType?: TraderType
}

export interface NewYearSummary {
  year: number
  /** The year before, which the figures below close. */
  previous: number
  /** Whether the previous year has any entries, as the book dates them. */
  previousHasEntries: boolean
  /** The previous year's result by the income statement's rules (§6.3). */
  previousResult: Cents
  /** Machinery and equipment left to depreciate: the pool's opening balance now. */
  assetPool: Cents
  /** Loans outstanding at the end of the previous year. */
  loans: Cents
  /** Open sales and purchases on 31.12., VAT included. */
  receivables: Cents
  payables: Cents
  openCount: number
  /** The date the previous year's Form 5 was marked filed, if it was. */
  previousFiledOn: string | null
  /** Whether the year being opened is locked, so its figures cannot change. */
  locked: boolean
  recurringCount: number
}

export function newYearSummary(input: NewYearInput): NewYearSummary {
  const { entries, cats, year } = input
  const previous = year - 1
  const basis = taxBasisEntries(entries, input.traderType)
  const assetPool =
    assetSchedule(entries, cats, input.assetOpening, previous).find(
      (y) => y.year === previous
    )?.closing ?? 0
  const open = balancesAt(entries, cats, `${previous}-12-31`)
  return {
    year,
    previous,
    previousHasEntries: entries.some((e) => e.date.startsWith(`${previous}-`)),
    previousResult: incomeStatement(basis, cats, previous, {
      depreciationMax: depreciationMaximums(
        entries,
        cats,
        input.assetOpening,
        previous
      ),
    }).result,
    assetPool,
    loans: loanBalance(entries, cats, input.loanOpening, previous),
    receivables: open.receivables,
    payables: open.payables,
    openCount: open.count,
    previousFiledOn: input.form5Filed[String(previous)] ?? null,
    locked: !!input.form5Filed[String(year)],
    recurringCount: input.recurring.length,
  }
}

/** Whether any year-end figure has been entered. */
export function hasYearEndFigures(values: YearEnd | undefined): boolean {
  if (!values) return false
  return (Object.keys(EMPTY_YEAR_END) as (keyof YearEnd)[]).some(
    (key) => values[key] !== 0
  )
}

export interface CarryOver {
  /** The previous year's figures, as the new year's starting values. */
  values: YearEnd
  /** Whether the new year already has figures that this would replace. */
  replaces: boolean
}

/**
 * The previous year's year-end figures as the new year's starting values, or
 * null when there is nothing to copy or the new year is locked.
 */
export function carryOverYearEnd(
  yearEnd: Readonly<Record<string, YearEnd>>,
  year: number,
  locked: boolean
): CarryOver | null {
  const previous = yearEnd[String(year - 1)]
  if (locked || !hasYearEndFigures(previous)) return null
  return {
    values: { ...EMPTY_YEAR_END, ...previous },
    replaces: hasYearEndFigures(yearEnd[String(year)]),
  }
}

/**
 * The year to open: next year from 1 November, when the year ahead is being
 * prepared, and the current one before that.
 */
export function newYearTarget(today: string): number {
  const year = Number(today.slice(0, 4))
  return Number(today.slice(5, 7)) >= 11 ? year + 1 : year
}

/**
 * Whether the overview should nudge about opening the year `newYearTarget`
 * names: today is between November and February, the year before has entries
 * and the year holds no year-end figures yet. Asetukset offers the dialog at
 * any time.
 */
export function newYearDue(
  yearEnd: Readonly<Record<string, YearEnd>>,
  today: string,
  previousHasEntries: boolean
): boolean {
  const month = Number(today.slice(5, 7))
  if (month > 2 && month < 11) return false
  const year = newYearTarget(today)
  return previousHasEntries && !hasYearEndFigures(yearEnd[String(year)])
}
