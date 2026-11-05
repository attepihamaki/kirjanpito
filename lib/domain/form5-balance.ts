import {
  assetSchedule,
  type AssetOpening,
  type AssetYear,
} from "@/lib/domain/assets"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { form5Label } from "@/lib/domain/form5-spec"
import { balancesAt, paidDate } from "@/lib/domain/open-items"
import type { TaxFormRow, TaxFormSection } from "@/lib/domain/tax-form"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * Form 5's net worth calculation and wages paid (§8.8), with the codes of
 * Verohallinto's 2026 data file specification. Vero divides the profit into
 * capital and earned income from these figures.
 *
 * Receivables, payables, machinery and loans come from the book. What the book
 * does not hold is typed in per year as a `YearEnd`. Bank deposits are in none
 * of the fields: 714 is cash in hand and 716 says "no bank deposits".
 */

/** What the user reads off at the end of a year. Every amount defaults to zero. */
export interface YearEnd {
  /** 708: goods bought for resale. */
  goods: Cents
  /** 709: materials, supplies and self-made products. */
  otherCurrent: Cents
  /** 706: other fixed assets, such as gravel pits or bridges. */
  otherFixed: Cents
  /** 714: cash in hand. */
  cash: Cents
  /** 716: other financial assets. */
  otherFinancial: Cents
  /** The part of the loans due within a year, moved from 750 to 749. */
  loanCurrent: Cents
  /** Current liabilities beyond purchases and loans. */
  otherCurrentDebt: Cents
  /** Non-current liabilities beyond loans. */
  otherLongDebt: Cents
}

export const EMPTY_YEAR_END: YearEnd = {
  goods: 0,
  otherCurrent: 0,
  otherFixed: 0,
  cash: 0,
  otherFinancial: 0,
  loanCurrent: 0,
  otherCurrentDebt: 0,
  otherLongDebt: 0,
}

/** The loans outstanding when the book starts. */
export interface LoanOpening {
  /** The balance is the one at the start of this year. */
  year: number
  amount: Cents
}

/**
 * Loans outstanding at the end of `year`: the opening balance plus drawdowns
 * minus repayments. Never below zero, since overpaying a loan is not a debt.
 */
export function loanBalance(
  entries: readonly Entry[],
  cats: CategoryMap,
  opening: LoanOpening | null,
  year: number
): Cents {
  let balance = opening && opening.year <= year ? opening.amount : 0
  for (const e of entries) {
    const cat = cats.get(e.catId)
    if (!cat || !LINE_BY_KEY.get(cat.line)?.loan) continue
    if (yearOf(e.date) > year) continue
    const { gross } = calcEntry(e)
    balance += e.type === "income" ? gross : -gross
  }
  return Math.max(0, balance)
}

/**
 * Wages paid in the year (394), by payment date. Vero adds 30 % of them to the
 * net worth, and wages booked but not paid do not count.
 */
export function wagesPaid(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): Cents {
  let total = 0
  for (const e of entries) {
    if (cats.get(e.catId)?.line !== "335") continue
    const paid = paidDate(e)
    if (paid && yearOf(paid) === year) total += calcEntry(e).net
  }
  return total
}

/** The stock's change as an entry on line 333: an increase lowers the cost. */
export function inventoryChange(opening: YearEnd, closing: YearEnd): Cents {
  return (
    opening.goods +
    opening.otherCurrent -
    (closing.goods + closing.otherCurrent)
  )
}

export interface Form5BalanceInput {
  entries: readonly Entry[]
  cats: CategoryMap
  year: number
  yearEnd: YearEnd
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
}

export interface Form5Balance {
  /** The machinery pool's year (800 to 806), or null before the register starts. */
  assetYear: AssetYear | null
  machinery: Cents
  receivables: Cents
  payables: Cents
  loans: Cents
  /** 718. */
  assets: Cents
  /** 749. */
  current: Cents
  /** 750. */
  nonCurrent: Cents
  /** 725. */
  liabilities: Cents
  /** 718 − 725: positive goes on 733, negative on 734. */
  netWorth: Cents
  wages: Cents
}

export function form5Balance(input: Form5BalanceInput): Form5Balance {
  const { entries, cats, year, yearEnd, assetOpening, loanOpening } = input
  const assetYear =
    assetSchedule(entries, cats, assetOpening, year).find(
      (y) => y.year === year
    ) ?? null
  const machinery = assetYear?.closing ?? 0
  const { receivables, payables } = balancesAt(entries, cats, `${year}-12-31`)
  const loans = loanBalance(entries, cats, loanOpening, year)
  const loanCurrent = Math.min(yearEnd.loanCurrent, loans)

  const assets =
    machinery +
    yearEnd.otherFixed +
    yearEnd.goods +
    yearEnd.otherCurrent +
    yearEnd.cash +
    receivables +
    yearEnd.otherFinancial
  const current = payables + loanCurrent + yearEnd.otherCurrentDebt
  const nonCurrent = loans - loanCurrent + yearEnd.otherLongDebt
  const liabilities = current + nonCurrent
  return {
    assetYear,
    machinery,
    receivables,
    payables,
    loans,
    assets,
    current,
    nonCurrent,
    liabilities,
    netWorth: assets - liabilities,
    wages: wagesPaid(entries, cats, year),
  }
}

export function form5BalanceSections(
  b: Form5Balance,
  yearEnd: YearEnd
): TaxFormSection[] {
  const field = (
    code: number,
    en: string,
    value: Cents,
    opts: { total?: boolean; unused?: boolean } = {}
  ): TaxFormRow => ({
    kind: "field",
    code: String(code),
    label: { fi: form5Label(code), en },
    value,
    portion: false,
    total: opts.total ?? false,
    unused: opts.unused ?? false,
  })
  const group = (fi: string, en: string): TaxFormRow => ({
    kind: "group",
    label: { fi, en },
  })
  // With no assets or liabilities, there is no total to check in OmaVero.
  const empty = b.assets === 0 && b.liabilities === 0
  const total = { total: true, unused: empty }

  const sections: TaxFormSection[] = []

  /*
   * The pool of machinery and equipment, as the form asks for it beside
   * depreciation: the balance at both ends of the year, what joined and left
   * it, and the depreciation taken. Only a year the register covers has one.
   */
  const pool = b.assetYear
  if (pool) {
    sections.push({
      number: "",
      title: {
        fi: "Irtaimen käyttöomaisuuden hankintamenoista tehdyt poistot",
        en: "Depreciation on the cost of movable fixed assets",
      },
      rows: [
        field(
          800,
          "Remaining expenditure at the start of the year",
          pool.opening
        ),
        field(801, "Additions during the year", pool.additions),
        field(802, "Selling prices and insurance compensation", pool.disposals),
        field(
          804,
          "Depreciation of the year",
          Math.min(pool.taken, pool.maximum)
        ),
        field(805, "Extra depreciation (EVL 32 §)", 0),
        field(
          806,
          "Remaining expenditure at the end of the year",
          pool.closing,
          { total: true }
        ),
      ],
    })
  }

  sections.push(
    {
      number: "",
      title: { fi: "Elinkeinotoiminnan varat", en: "Business assets" },
      rows: [
        group("Käyttöomaisuus", "Fixed assets"),
        field(704, "Machinery and equipment", b.machinery),
        field(706, "Other fixed assets", yearEnd.otherFixed),
        group("Vaihto-omaisuus", "Current assets"),
        field(708, "Goods", yearEnd.goods),
        field(709, "Other current assets", yearEnd.otherCurrent),
        group("Rahoitusomaisuus", "Financial assets"),
        field(711, "Accounts receivable", b.receivables),
        field(714, "Cash in hand, no bank deposits", yearEnd.cash),
        field(
          716,
          "Other financial assets, no bank deposits",
          yearEnd.otherFinancial
        ),
        field(718, "Total business assets", b.assets, total),
      ],
    },
    {
      number: "",
      title: { fi: "Elinkeinotoiminnan velat", en: "Business liabilities" },
      rows: [
        field(749, "Current liabilities", b.current),
        field(750, "Non-current liabilities", b.nonCurrent),
        field(725, "Total business liabilities", b.liabilities, total),
        field(733, "Positive net worth", Math.max(0, b.netWorth), {
          total: true,
          unused: empty || b.netWorth < 0,
        }),
        field(734, "Negative net worth", Math.max(0, -b.netWorth), {
          total: true,
          unused: b.netWorth >= 0,
        }),
      ],
    },
    {
      number: "",
      title: { fi: "Maksetut palkat", en: "Wages paid" },
      rows: [
        field(
          394,
          "Wages subject to withholding paid in the 12 months before the tax year’s end",
          b.wages
        ),
      ],
    }
  )
  return sections
}
