import {
  RULES,
  type IncomeTaxRow,
  type RuleTables,
} from "@/lib/domain/rule-tables"
import type { Cents } from "@/lib/domain/types"

/**
 * An estimate of the income tax and YEL contribution a sole trader's profit
 * brings (§6.14). It is an estimate, not the tax assessment:
 *
 * - All of the business income is taxed as earned income. A sole trader may
 *   ask for that; by default 20 % of the net assets is capital income, and the
 *   book holds no balance sheet to work that out from.
 * - YEL contributions are business expenses (line 336), so they are already
 *   out of the profit and are not deducted again.
 * - A loss gives no tax back: it is carried forward (§8.12).
 * - Only the deductions every sole trader gets are made: the entrepreneur
 *   deduction, the basic deduction, the earned income credit and, for wages,
 *   the income acquisition deduction. Travel, union fees, the household
 *   credit and the like are left out, so the estimate errs on the high side.
 */

/** What the user tells the estimate about themselves (§8.22). */
export interface TaxProfile {
  /** The municipality's income tax rate in percent, or null for no estimate. */
  municipalRate: number | null
  /** The parish's church tax rate in percent, or null for none. */
  churchRate: number | null
  /** The confirmed YEL work income for the year, or null for no YEL. */
  yelIncome: Cents | null
  /** The 22 % discount of the first four years as an entrepreneur. */
  yelStarter: boolean
  /** Wages, pension and other earned income for the year, outside the book. */
  otherIncome: Cents
}

export const NO_TAX_PROFILE: TaxProfile = {
  municipalRate: null,
  churchRate: null,
  yelIncome: null,
  yelStarter: false,
  otherIncome: 0,
}

/** The figures for `year`, or null when the rule tables do not have them. */
export function incomeTaxRow(
  year: number,
  tables: RuleTables = RULES
): IncomeTaxRow | null {
  return tables.incomeTax.find((r) => r.year === year) ?? null
}

const pct = (cents: number, rate: number) => (cents * rate) / 100

/** The state income tax on taxable earned income. */
export function stateTax(income: Cents, row: IncomeTaxRow): Cents {
  if (income <= 0) return 0
  let bracket = row.stateScale[0]
  for (const b of row.stateScale) if (b.from <= income) bracket = b
  return Math.round(bracket.base + pct(income - bracket.from, bracket.rate))
}

/** The basic deduction in municipal taxation, which shrinks as income grows. */
function basicDeduction(pure: Cents, row: IncomeTaxRow): Cents {
  const full = row.basicDeduction
  if (pure <= full) return Math.max(pure, 0)
  return Math.max(0, full - pct(pure - full, row.basicDeductionReduction))
}

/** The earned income credit, deducted from the taxes rather than the income. */
function workCredit(earned: Cents, pure: Cents, row: IncomeTaxRow): Cents {
  const gross = Math.min(pct(earned, row.workCreditRate), row.workCreditMax)
  const over = Math.min(pure, row.workCreditReduceTo) - row.workCreditReduceFrom
  return Math.max(0, gross - pct(Math.max(0, over), row.workCreditReduceRate))
}

/** Every tax and contribution on one year's earned income. */
export interface TaxParts {
  /** Net earned income: what the state scale applies to. */
  pure: Cents
  /** `pure` less the basic deduction: what the flat rates apply to. */
  municipalBase: Cents
  state: Cents
  municipal: Cents
  church: Cents
  healthCare: Cents
  dailyAllowance: Cents
  /** The earned income credit actually used, as a positive amount. */
  credit: Cents
  total: Cents
}

function taxParts(
  wages: Cents,
  business: Cents,
  yelIncome: Cents,
  profile: TaxProfile,
  row: IncomeTaxRow
): TaxParts {
  const pure =
    wages - Math.min(row.incomeAcquisition, wages) + Math.max(business, 0)
  const municipalBase = Math.max(0, pure - basicDeduction(pure, row))
  const state = stateTax(pure, row)
  const municipal = Math.round(pct(municipalBase, profile.municipalRate ?? 0))
  const church = Math.round(pct(municipalBase, profile.churchRate ?? 0))
  const healthCare = Math.round(pct(municipalBase, row.healthCare))
  const flat = state + municipal + church + healthCare
  const credit = Math.min(
    Math.round(workCredit(wages + Math.max(business, 0), pure, row)),
    flat
  )
  const dailyAllowance =
    wages + yelIncome >= row.dailyAllowanceFrom
      ? Math.round(
          pct(wages, row.dailyAllowance) + pct(yelIncome, row.dailyAllowanceYel)
        )
      : 0
  return {
    pure,
    municipalBase,
    state,
    municipal,
    church,
    healthCare,
    dailyAllowance,
    credit,
    total: flat - credit + dailyAllowance,
  }
}

export interface YelEstimate {
  /** The year's contribution on the confirmed work income. */
  yearly: Cents
  /** In twelve instalments. */
  monthly: Cents
  /** The rate used, after any starter discount, in percent. */
  rate: number
  /** The work income is under the limit where YEL becomes compulsory. */
  belowMinimum: boolean
}

/** The YEL contribution on the profile's work income, or null without one. */
export function estimateYel(
  profile: TaxProfile,
  row: IncomeTaxRow
): YelEstimate | null {
  if (profile.yelIncome === null || profile.yelIncome <= 0) return null
  const rate = profile.yelStarter
    ? row.yelRate * (1 - row.yelStarterDiscount / 100)
    : row.yelRate
  const yearly = Math.round(pct(profile.yelIncome, rate))
  return {
    yearly,
    monthly: Math.round(yearly / 12),
    rate: Math.round(rate * 100) / 100,
    belowMinimum: profile.yelIncome < row.yelMinIncome,
  }
}

export interface IncomeTaxEstimate {
  /** The profit the estimate is on, 0 for a loss. */
  profit: Cents
  entrepreneurDeduction: Cents
  /** The taxes with the business income and the other income together. */
  parts: TaxParts
  /** The taxes the other income alone would bring. */
  withoutBusiness: Cents
  /** What the business adds: `parts.total` less `withoutBusiness`. */
  businessTax: Cents
  /** `businessTax` as a share of `profit`, in percent; 0 without a profit. */
  rate: number
}

/**
 * The taxes on `profit` (line 358) together with the profile's other income,
 * and the part of them the business brings. Null without a municipal rate,
 * which every estimate needs.
 */
export function estimateIncomeTax(
  profit: Cents,
  profile: TaxProfile,
  row: IncomeTaxRow
): IncomeTaxEstimate | null {
  if (profile.municipalRate === null) return null
  const gross = Math.max(profit, 0)
  const entrepreneurDeduction = Math.round(
    pct(gross, row.entrepreneurDeduction)
  )
  const business = gross - entrepreneurDeduction
  const yel = profile.yelIncome ?? 0
  const wages = profile.otherIncome
  const parts = taxParts(wages, business, yel, profile, row)
  const withoutBusiness = taxParts(wages, 0, 0, profile, row).total
  const businessTax = parts.total - withoutBusiness
  return {
    profit: gross,
    entrepreneurDeduction,
    parts,
    withoutBusiness,
    businessTax,
    rate: gross > 0 ? Math.round((businessTax / gross) * 1000) / 10 : 0,
  }
}

/**
 * The profit to date carried on to the whole year at the same pace. A year
 * already over is returned as it is.
 */
export function yearPace(profit: Cents, elapsedMonths: number): Cents {
  if (elapsedMonths <= 0 || elapsedMonths >= 12) return profit
  return Math.round((profit / elapsedMonths) * 12)
}
