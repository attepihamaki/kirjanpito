import { LINES, LINE_BY_KEY, type AccountLine } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf, yearOf } from "@/lib/domain/dates"
import {
  canBeUnpaid,
  isOpenAt,
  paidDate,
  taxBasisEntries,
  type TraderType,
} from "@/lib/domain/open-items"
import type { Period } from "@/lib/domain/period"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"
import { countsOnVatReturn, vatReport, type VatReport } from "@/lib/domain/vat"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { vatReturnSections, vatReturnValues } from "@/lib/domain/vat-return"

/**
 * The vouchers behind a figure (§8.18). KPL 2:6 asks that a return can be
 * traced to its entries, so every figure on the VAT return, the income
 * statement and Form 5 can be taken apart into what each voucher added to it.
 *
 * A figure is described by a `Contribution`: what one entry adds to it, or null
 * when the entry is not part of it. The VAT figures reuse `vatReport` on one
 * entry, so the contributions add up to the period's figure exactly, rounding
 * included. The statement figures read the same lines and signs the statement
 * does.
 */

/** What one entry adds to a figure, or null when it takes no part in it. */
export type Contribution = (e: Entry) => Cents | null

export interface FigureRow {
  entryId: string
  /** What the voucher adds to the figure. */
  amount: Cents
}

/**
 * The entries that add to a figure, in date and voucher order. An entry that
 * adds nothing is left out, since a zero is no part of what the figure counts.
 */
export function figureRows(
  entries: readonly Entry[],
  contribution: Contribution
): FigureRow[] {
  const rows: { e: Entry; amount: Cents }[] = []
  for (const e of entries) {
    const amount = contribution(e)
    if (amount) rows.push({ e, amount })
  }
  rows.sort(
    (a, b) =>
      a.e.date.localeCompare(b.e.date) ||
      (a.e.voucher ?? 0) - (b.e.voucher ?? 0) ||
      a.e.id.localeCompare(b.e.id)
  )
  return rows.map(({ e, amount }) => ({ entryId: e.id, amount }))
}

/** The sum of the rows. */
export function rowsTotal(rows: readonly FigureRow[]): Cents {
  return rows.reduce((acc, r) => acc + r.amount, 0) + 0
}

/* -------------------------------------------------------------------------
 * VAT
 * ---------------------------------------------------------------------- */

/**
 * What an entry adds to a part of the VAT report. `select` reads the figure
 * from a report made of that entry alone.
 */
export function vatContribution(
  cats: CategoryMap,
  select: (report: VatReport) => Cents
): Contribution {
  return (e) =>
    countsOnVatReturn(e, cats) ? select(vatReport([e], cats)) : null
}

/**
 * The part of the report a VAT return field holds, by its code. 308 is the
 * signed tax due, so a refund's vouchers carry a minus.
 */
export function vatFieldSelector(code: string): (report: VatReport) => Cents {
  if (code === "308") return (r) => r.due
  return (r) => vatReturnValues(vatReturnSections(r)).get(code) ?? 0
}

/* -------------------------------------------------------------------------
 * Income statement and Form 5
 * ---------------------------------------------------------------------- */

/** Which lines a figure sums, and with which sign. */
export interface LineSelection {
  test: (line: AccountLine) => boolean
  sign: 1 | -1
}

const STATEMENT_KEYS: ReadonlySet<string> = new Set(LINES.map((l) => l.key))

/** The line an entry sits on, with the fallback the statement uses. */
function statementLine(e: Entry, cats: CategoryMap): AccountLine | undefined {
  const cat = cats.get(e.catId)
  const key = cat?.line ?? (e.type === "income" ? "301" : "344-other")
  return STATEMENT_KEYS.has(key) ? LINE_BY_KEY.get(key) : undefined
}

/**
 * What an entry adds to the statement lines in `selection`, in the year `year`.
 * Pass the entries as the statement reads them (§6.3), so an entry sits on its
 * payment date.
 */
export function statementContribution(
  cats: CategoryMap,
  year: number,
  selection: LineSelection
): Contribution {
  return (e) => {
    if (yearOf(e.date) !== year) return null
    const line = statementLine(e, cats)
    if (!line || !selection.test(line)) return null
    return calcEntry(e).net * selection.sign
  }
}

const income = (line: AccountLine) => line.side === "income"
const expense = (line: AccountLine) => line.side === "expense"

/** A single line of the statement. */
export const lineSelection = (key: string): LineSelection => ({
  test: (line) => line.key === key,
  sign: 1,
})

/** A whole section: every income line, or every expense line, in full. */
export const sideSelection = (side: "income" | "expense"): LineSelection => ({
  test: side === "income" ? income : expense,
  sign: 1,
})

/** Taxable revenue (316): the income lines except the tax-exempt one. */
export const REVENUE: LineSelection = {
  test: (l) => income(l) && !l.taxExempt,
  sign: 1,
}

/** Deductible expenses (355): the expense lines except 365 to 367. */
export const DEDUCTIBLE: LineSelection = {
  test: (l) => expense(l) && !l.nondeductible,
  sign: 1,
}

/**
 * Form 5's account codes that sum a statement line in full. A portion such as
 * 320 or 342 points at its parent's line: its vouchers are the parent's, and
 * the figure is the part of them that counts.
 */
const FORM5_ACCOUNT: ReadonlyMap<number, number> = new Map([
  [320, 319],
  [322, 321],
  [328, 327],
  [338, 337],
  [342, 341],
  [347, 346],
])

/** The lines behind a Form 5 field of the income and expense sections, or null. */
export function form5Selection(code: number): LineSelection | null {
  if (code === 316) return REVENUE
  if (code === 355) return DEDUCTIBLE
  if (code === 388) return lineSelection("364-travel")
  if (code === 392) return lineSelection("364-car")
  const account = FORM5_ACCOUNT.get(code) ?? code
  if (!LINES.some((l) => l.account === account)) return null
  return { test: (l) => l.account === account, sign: 1 }
}

/**
 * The result's contribution (358, 359): income adds and expenses subtract, and
 * a loss is turned over so that its vouchers add up to the positive figure the
 * form asks for. Kept apart from `statementContribution`, whose sign is the
 * same for every line.
 */
export function resultContribution(
  cats: CategoryMap,
  year: number,
  loss: boolean
): Contribution {
  return (e) => {
    if (yearOf(e.date) !== year) return null
    const line = statementLine(e, cats)
    if (!line) return null
    const net = calcEntry(e).net
    const flip = loss ? -1 : 1
    if (REVENUE.test(line)) return net * flip
    if (DEDUCTIBLE.test(line)) return -net * flip
    return null
  }
}

/* -------------------------------------------------------------------------
 * Form 5, assets and wages
 * ---------------------------------------------------------------------- */

/**
 * The Form 5 balance fields that have vouchers behind them, from the raw
 * entries: 711 receivables, 749 payables, 725 payables and the loan movements,
 * 394 wages and the machinery pool's 801, 802 and 804. 749 and 725 also hold
 * amounts typed in by hand and the loan balance carried in, which no voucher
 * stands behind, so their lists fall short of the figure. The other fields are
 * typed in or worked out from the pool, so they have none.
 */
export function balanceContribution(
  code: number,
  cats: CategoryMap,
  year: number
): Contribution | null {
  const lineKey = (e: Entry) => cats.get(e.catId)?.line
  switch (code) {
    case 711:
      return (e) => {
        const line = lineKey(e)
        if (
          e.type !== "income" ||
          !canBeUnpaid(line ? LINE_BY_KEY.get(line) : undefined)
        ) {
          return null
        }
        return isOpenAt(e, `${year}-12-31`) ? calcEntry(e).gross : null
      }
    case 394:
      return (e) => {
        if (lineKey(e) !== "335") return null
        const paid = paidDate(e)
        return paid && yearOf(paid) === year ? calcEntry(e).net : null
      }
    case 725:
    case 749: {
      const payable: Contribution = (e) => {
        const line = lineKey(e)
        if (
          e.type !== "expense" ||
          !canBeUnpaid(line ? LINE_BY_KEY.get(line) : undefined)
        ) {
          return null
        }
        return isOpenAt(e, `${year}-12-31`) ? calcEntry(e).gross : null
      }
      if (code === 749) return payable
      return (e) => {
        const line = lineKey(e)
        if (line && LINE_BY_KEY.get(line)?.loan) {
          if (yearOf(e.date) > year) return null
          const { gross } = calcEntry(e)
          return e.type === "income" ? gross : -gross
        }
        return payable(e)
      }
    }
    case 801:
    case 802: {
      const key = code === 801 ? "asset-purchase" : "asset-sale"
      return (e) =>
        lineKey(e) === key && yearOf(e.date) === year ? calcEntry(e).net : null
    }
    case 804:
      return (e) =>
        lineKey(e) === "337" && yearOf(e.date) === year
          ? calcEntry(e).net
          : null
    default:
      return null
  }
}

/* -------------------------------------------------------------------------
 * The way back: where a voucher counts
 * ---------------------------------------------------------------------- */

/**
 * A figure a voucher is part of. KPL 2:6 asks that the link between a voucher
 * and a return can be shown in both directions, so this is the counterpart of
 * `figureRows`: it is found with the same contributions, so a voucher is listed
 * under a figure exactly when the figure's list holds it.
 */
export type FigureRef =
  | { kind: "vat"; code: string; period: Period; amount: Cents }
  | { kind: "form5"; code: number; year: number; amount: Cents }

export interface FigureRefContext {
  /** The filing period the book uses, which decides the return a voucher is on. */
  vatPeriod: VatPeriodKind
  trader: TraderType
  /** The years whose year-end figures are asked about (711, 725, 749, 394). */
  years: readonly number[]
}

/** Form 5's income and expense fields a voucher can add to, besides the totals. */
const FORM5_FIELD_CODES: readonly number[] = [
  ...new Set([
    ...LINES.map((l) => l.account),
    ...FORM5_ACCOUNT.keys(),
    388,
    392,
  ]),
].sort((a, b) => a - b)

const BALANCE_CODES: readonly number[] = [394, 711, 725, 749, 801, 802, 804]

/** The VAT filing period of `kind` that holds a date, as a period to filter by. */
export function vatPeriodOf(kind: VatPeriodKind, iso: string): Period {
  const year = yearOf(iso)
  if (kind === "year") return { kind: "year", year }
  const month = monthOf(iso)
  if (kind === "month") return { kind: "month", year, month }
  return {
    kind: "quarter",
    year,
    quarter: Math.ceil(month / 3) as 1 | 2 | 3 | 4,
  }
}

/**
 * Every figure of the VAT return, Form 5's income statement fields and its
 * balance fields that the entry adds to, in the order of the forms. The totals
 * (316, 355, 358, 359, 308) are left out: they follow from the fields.
 */
export function entryFigureRefs(
  e: Entry,
  cats: CategoryMap,
  ctx: FigureRefContext
): FigureRef[] {
  const out: FigureRef[] = []

  if (countsOnVatReturn(e, cats)) {
    const values = vatReturnValues(vatReturnSections(vatReport([e], cats)))
    const period = vatPeriodOf(ctx.vatPeriod, e.date)
    for (const [code, amount] of values) {
      if (code !== "308" && amount !== 0) {
        out.push({ kind: "vat", code, period, amount })
      }
    }
  }

  // The statement reads the entry on its payment date, and not at all while open.
  const [onBasis] = taxBasisEntries([e], ctx.trader)
  if (onBasis) {
    const year = yearOf(onBasis.date)
    for (const code of FORM5_FIELD_CODES) {
      const selection = form5Selection(code)
      if (!selection) continue
      const amount = statementContribution(cats, year, selection)(onBasis)
      if (amount) out.push({ kind: "form5", code, year, amount })
    }
  }

  const years = new Set(ctx.years)
  years.add(yearOf(e.date))
  const paid = paidDate(e)
  if (paid) years.add(yearOf(paid))
  for (const year of [...years].sort((a, b) => a - b)) {
    for (const code of BALANCE_CODES) {
      const amount = balanceContribution(code, cats, year)?.(e)
      if (amount) out.push({ kind: "form5", code, year, amount })
    }
  }
  return out
}
