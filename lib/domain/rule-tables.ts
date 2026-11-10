import rulesJson from "@/data/rules.json"
import type { Cents } from "@/lib/domain/types"

/**
 * The figures that come from a law or from Verohallinto and change over time
 * (§6.11). They live in `data/rules.json`, bundled at build time, so a new year
 * is a data change with a source beside every value. Nothing here is fetched
 * or read from the user's file.
 */

/** A value in force from a date; `from` is null for one that has always held. */
export interface DatedValue {
  from: string | null
  value: number
  source: string
}

export const LIMIT_KEYS = [
  "vatThreshold",
  "vatThresholdNear",
  "vatPeriodLimitQuarter",
  "vatPeriodLimitYear",
  "privateUseFree",
  "singleEntryAssets",
  "singleEntryTurnover",
  "microAssets",
  "microTurnover",
  "depreciationPercent",
  "depreciationSmallBalance",
  "smallPurchaseItem",
  "smallPurchaseYear",
  /* The general late-payment rate, in percent, from the reference rate set half-yearly. */
  "lateInterestRate",
] as const

export type LimitKey = (typeof LIMIT_KEYS)[number]

export interface RateChangeRow {
  from: string
  before: number
  after: number
  source: string
}

export interface Form5DueRow {
  taxYear: number
  due: string
  source: string
}

export interface TravelRow {
  year: number
  /** Tax-free kilometre allowance, in cents per km. */
  km: Cents
  fullPerDiem: Cents
  partialPerDiem: Cents
  source: string
}

export interface HomeOfficeRow {
  year: number
  full: Cents
  part: Cents
  occasional: Cents
  source: string
}

/** One bracket of the state income tax scale (§6.14). */
export interface TaxBracket {
  /** Taxable earned income where the bracket starts, in cents. */
  from: Cents
  /** The tax at `from`, in cents. */
  base: Cents
  /** Percent of the income above `from`. */
  rate: number
}

/**
 * The year's earned income tax figures (§6.14): the state scale, the
 * deductions and credits that apply to a sole trader, the health insurance
 * contributions and the YEL rate. Amounts are cents, rates percent.
 */
export interface IncomeTaxRow {
  year: number
  stateScale: readonly TaxBracket[]
  basicDeduction: Cents
  basicDeductionReduction: number
  workCreditRate: number
  workCreditMax: Cents
  workCreditReduceFrom: Cents
  workCreditReduceTo: Cents
  workCreditReduceRate: number
  incomeAcquisition: Cents
  entrepreneurDeduction: number
  healthCare: number
  dailyAllowance: number
  dailyAllowanceYel: number
  dailyAllowanceFrom: Cents
  yelRate: number
  yelStarterDiscount: number
  yelMinIncome: Cents
  source: string
}

export interface RuleTables {
  /** The day the figures were last compared with their sources. */
  checkedOn: string
  vatRateChanges: readonly RateChangeRow[]
  form5Due: readonly Form5DueRow[]
  travel: readonly TravelRow[]
  homeOffice: readonly HomeOfficeRow[]
  incomeTax: readonly IncomeTaxRow[]
  limits: Readonly<Record<LimitKey, readonly DatedValue[]>>
}

/* -------------------------------------------------------------------------
 * Validation
 * ---------------------------------------------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function fail(path: string, want: string): never {
  throw new Error(`rules.json: ${path} must be ${want}`)
}

function record(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    fail(path, "an object")
  }
  return v as Record<string, unknown>
}

function list(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, "a list")
  return v as unknown[]
}

function text(v: unknown, path: string): string {
  if (typeof v !== "string" || v.trim() === "") fail(path, "a non-empty string")
  return v as string
}

function date(v: unknown, path: string): string {
  const s = text(v, path)
  if (!ISO_DATE.test(s) || Number.isNaN(Date.parse(s))) {
    fail(path, "an ISO date")
  }
  return s
}

function number(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    fail(path, "a number of at least 0")
  }
  return v as number
}

function cents(v: unknown, path: string): Cents {
  const n = number(v, path)
  if (!Number.isInteger(n)) fail(path, "a whole number of cents")
  return n
}

function year(v: unknown, path: string): number {
  const n = number(v, path)
  if (!Number.isInteger(n) || n < 2000 || n > 2100) fail(path, "a year")
  return n
}

/** Rows keyed by year: ascending, with no year twice. */
function byYear<T>(
  v: unknown,
  path: string,
  keyOf: (row: Record<string, unknown>, at: string) => number,
  build: (row: Record<string, unknown>, at: string) => T
): T[] {
  let previous = -Infinity
  return list(v, path).map((raw, i) => {
    const at = `${path}[${i}]`
    const row = record(raw, at)
    const key = keyOf(row, at)
    if (key <= previous) fail(at, "in ascending order with no year twice")
    previous = key
    return build(row, at)
  })
}

function datedValues(v: unknown, path: string): DatedValue[] {
  const rows = list(v, path)
  if (rows.length === 0) fail(path, "a list with at least one value")
  let previous: string | null = null
  return rows.map((raw, i) => {
    const at = `${path}[${i}]`
    const row = record(raw, at)
    const from = row.from === null ? null : date(row.from, `${at}.from`)
    if (from === null && i > 0)
      fail(`${at}.from`, "a date after the first value")
    if (from !== null && previous !== null && from <= previous) {
      fail(`${at}.from`, "later than the value before it")
    }
    previous = from ?? previous
    return {
      from,
      value: number(row.value, `${at}.value`),
      source: text(row.source, `${at}.source`),
    }
  })
}

/** A percentage between 0 and 100. */
function percent(v: unknown, path: string): number {
  const n = number(v, path)
  if (n > 100) fail(path, "a percentage")
  return n
}

/** The state scale: starting at 0, rising, each base the tax up to its start. */
function stateScale(v: unknown, path: string): TaxBracket[] {
  const rows = list(v, path)
  if (rows.length === 0) fail(path, "a list with at least one bracket")
  const out: TaxBracket[] = []
  rows.forEach((raw, i) => {
    const at = `${path}[${i}]`
    const row = record(raw, at)
    const bracket = {
      from: cents(row.from, `${at}.from`),
      base: cents(row.base, `${at}.base`),
      rate: percent(row.rate, `${at}.rate`),
    }
    const before = out.at(-1)
    if (!before && (bracket.from !== 0 || bracket.base !== 0)) {
      fail(at, "a first bracket from 0 with no tax")
    }
    if (before) {
      if (bracket.from <= before.from)
        fail(`${at}.from`, "above the bracket before it")
      const expected = Math.round(
        before.base + ((bracket.from - before.from) * before.rate) / 100
      )
      if (Math.abs(bracket.base - expected) > 1) {
        fail(`${at}.base`, `the tax at its start (${expected})`)
      }
    }
    out.push(bracket)
  })
  return out
}

function incomeTaxRow(row: Record<string, unknown>, at: string): IncomeTaxRow {
  const c = (key: string) => cents(row[key], `${at}.${key}`)
  const p = (key: string) => percent(row[key], `${at}.${key}`)
  return {
    year: year(row.year, `${at}.year`),
    stateScale: stateScale(row.stateScale, `${at}.stateScale`),
    basicDeduction: c("basicDeduction"),
    basicDeductionReduction: p("basicDeductionReduction"),
    workCreditRate: p("workCreditRate"),
    workCreditMax: c("workCreditMax"),
    workCreditReduceFrom: c("workCreditReduceFrom"),
    workCreditReduceTo: c("workCreditReduceTo"),
    workCreditReduceRate: p("workCreditReduceRate"),
    incomeAcquisition: c("incomeAcquisition"),
    entrepreneurDeduction: p("entrepreneurDeduction"),
    healthCare: p("healthCare"),
    dailyAllowance: p("dailyAllowance"),
    dailyAllowanceYel: p("dailyAllowanceYel"),
    dailyAllowanceFrom: c("dailyAllowanceFrom"),
    yelRate: p("yelRate"),
    yelStarterDiscount: p("yelStarterDiscount"),
    yelMinIncome: c("yelMinIncome"),
    source: text(row.source, `${at}.source`),
  }
}

/** Reads the file's shape and throws on the first value that does not fit. */
export function parseRuleTables(raw: unknown): RuleTables {
  const root = record(raw, "the file")
  const limits = record(root.limits, "limits")
  return {
    checkedOn: date(root.checkedOn, "checkedOn"),
    vatRateChanges: list(root.vatRateChanges, "vatRateChanges").map((r, i) => {
      const at = `vatRateChanges[${i}]`
      const row = record(r, at)
      return {
        from: date(row.from, `${at}.from`),
        before: number(row.before, `${at}.before`),
        after: number(row.after, `${at}.after`),
        source: text(row.source, `${at}.source`),
      }
    }),
    form5Due: byYear(
      root.form5Due,
      "form5Due",
      (row, at) => year(row.taxYear, `${at}.taxYear`),
      (row, at) => ({
        taxYear: year(row.taxYear, `${at}.taxYear`),
        due: date(row.due, `${at}.due`),
        source: text(row.source, `${at}.source`),
      })
    ),
    travel: byYear(
      root.travel,
      "travel",
      (row, at) => year(row.year, `${at}.year`),
      (row, at) => ({
        year: year(row.year, `${at}.year`),
        km: cents(row.km, `${at}.km`),
        fullPerDiem: cents(row.fullPerDiem, `${at}.fullPerDiem`),
        partialPerDiem: cents(row.partialPerDiem, `${at}.partialPerDiem`),
        source: text(row.source, `${at}.source`),
      })
    ),
    homeOffice: byYear(
      root.homeOffice,
      "homeOffice",
      (row, at) => year(row.year, `${at}.year`),
      (row, at) => ({
        year: year(row.year, `${at}.year`),
        full: cents(row.full, `${at}.full`),
        part: cents(row.part, `${at}.part`),
        occasional: cents(row.occasional, `${at}.occasional`),
        source: text(row.source, `${at}.source`),
      })
    ),
    incomeTax: byYear(
      root.incomeTax,
      "incomeTax",
      (row, at) => year(row.year, `${at}.year`),
      incomeTaxRow
    ),
    limits: Object.fromEntries(
      LIMIT_KEYS.map((key) => [key, datedValues(limits[key], `limits.${key}`)])
    ) as Record<LimitKey, DatedValue[]>,
  }
}

/** A mistake in the file fails the first import, so a build or test run shows it. */
export const RULES: RuleTables = parseRuleTables(rulesJson)

/* -------------------------------------------------------------------------
 * Lookup
 * ---------------------------------------------------------------------- */

/**
 * The value of a limit in force on an ISO date. A date before the first dated
 * value gets that first value, since the table holds nothing earlier.
 */
export function limitOn(
  key: LimitKey,
  on: string,
  tables: RuleTables = RULES
): number {
  const values = tables.limits[key]
  let found = values[0]
  for (const v of values) {
    if (v.from === null || v.from <= on) found = v
  }
  return found.value
}

/** The first day of a year, for a limit that applies to the whole year. */
export function startOf(year: number): string {
  return `${year}-01-01`
}

/* -------------------------------------------------------------------------
 * Coverage
 * ---------------------------------------------------------------------- */

export type RuleGap = "travel" | "homeOffice" | "incomeTax" | "form5Due"

/**
 * What the tables lack for the calendar year `today` falls in: travel, home
 * office and income tax figures for this year, and the due date of last year's Form 5.
 * The app hides a calculator or says "in the spring" for each, so a gap
 * costs nothing until someone notices it, which is what the overview row is for.
 */
export function ruleGaps(today: string, tables: RuleTables = RULES): RuleGap[] {
  const y = Number(today.slice(0, 4))
  const gaps: RuleGap[] = []
  if (!tables.travel.some((r) => r.year === y)) gaps.push("travel")
  if (!tables.homeOffice.some((r) => r.year === y)) gaps.push("homeOffice")
  if (!tables.incomeTax.some((r) => r.year === y)) gaps.push("incomeTax")
  if (!tables.form5Due.some((r) => r.taxYear === y - 1)) gaps.push("form5Due")
  return gaps
}
