import { assetSchedule, type AssetOpening } from "@/lib/domain/assets"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
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
  const machinery =
    assetSchedule(entries, cats, assetOpening, year).find(
      (y) => y.year === year
    )?.closing ?? 0
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
    fi: string,
    en: string,
    value: Cents,
    opts: { total?: boolean; unused?: boolean } = {}
  ): TaxFormRow => ({
    kind: "field",
    code: String(code),
    label: { fi, en },
    value,
    portion: false,
    total: opts.total ?? false,
    unused: opts.unused ?? false,
  })
  const group = (fi: string, en: string): TaxFormRow => ({
    kind: "group",
    label: { fi, en },
  })
  const total = { total: true }

  return [
    {
      number: "",
      title: { fi: "Elinkeinotoiminnan varat", en: "Business assets" },
      rows: [
        group("Käyttöomaisuus", "Fixed assets"),
        field(704, "Koneet ja kalusto", "Machinery and equipment", b.machinery),
        field(
          706,
          "Muu käyttöomaisuus",
          "Other fixed assets",
          yearEnd.otherFixed
        ),
        group("Vaihto-omaisuus", "Current assets"),
        field(708, "Tavarat", "Goods", yearEnd.goods),
        field(
          709,
          "Muu vaihto-omaisuus",
          "Other current assets",
          yearEnd.otherCurrent
        ),
        group("Rahoitusomaisuus", "Financial assets"),
        field(711, "Myyntisaamiset", "Accounts receivable", b.receivables),
        field(
          714,
          "Käteisvarat, ei pankkitalletuksia",
          "Cash in hand, no bank deposits",
          yearEnd.cash
        ),
        field(
          716,
          "Muu rahoitusomaisuus, ei pankkitalletuksia",
          "Other financial assets, no bank deposits",
          yearEnd.otherFinancial
        ),
        field(718, "Varat yhteensä", "Total business assets", b.assets, total),
      ],
    },
    {
      number: "",
      title: { fi: "Elinkeinotoiminnan velat", en: "Business liabilities" },
      rows: [
        field(749, "Lyhytaikaiset velat", "Current liabilities", b.current),
        field(
          750,
          "Pitkäaikaiset velat",
          "Non-current liabilities",
          b.nonCurrent
        ),
        field(
          725,
          "Velat yhteensä",
          "Total business liabilities",
          b.liabilities,
          total
        ),
        field(
          733,
          "Positiivinen nettovarallisuus",
          "Positive net worth",
          Math.max(0, b.netWorth),
          { total: true, unused: b.netWorth < 0 }
        ),
        field(
          734,
          "Negatiivinen nettovarallisuus",
          "Negative net worth",
          Math.max(0, -b.netWorth),
          { total: true, unused: b.netWorth >= 0 }
        ),
      ],
    },
    {
      number: "",
      title: { fi: "Maksetut palkat", en: "Wages paid" },
      rows: [
        field(
          394,
          "Ennakonpidätyksen alaiset palkat verovuoden päättymistä edeltäneiltä 12 kuukaudelta",
          "Wages subject to withholding paid in the 12 months before the tax year’s end",
          b.wages
        ),
      ],
    },
  ]
}
