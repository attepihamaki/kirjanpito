import { lastCompleteMonth, monthOf } from "@/lib/domain/dates"
import type { YearEnd } from "@/lib/domain/form5-balance"
import type { Invoice } from "@/lib/domain/invoice"
import { newYearDue, newYearTarget } from "@/lib/domain/new-year"
import { balancesAt, type OpenBalances } from "@/lib/domain/open-items"
import { missingBills, type MissingBill } from "@/lib/domain/missing-bills"
import { dueRecurring, type RecurringEntry } from "@/lib/domain/recurring"
import {
  heldYears,
  retentionDates,
  retentionEnded,
  yearsToArchive,
  type RetentionStage,
} from "@/lib/domain/retention"
import { ruleGaps, type RuleGap } from "@/lib/domain/rule-tables"
import {
  defineRules,
  evaluate,
  type Finding,
  type Rule,
} from "@/lib/domain/rules/engine"
import {
  form5Reminder,
  type Form5Reminder,
} from "@/lib/domain/tax-return-deadline"
import { payablesReport } from "@/lib/domain/payables"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"
import { daysBetween, type TimelinePeriod } from "@/lib/domain/vat-deadline"

/**
 * The overview's reminders (§8.12) that are neither entry checks nor limits:
 * deadlines, open items, empty months, missing receipts, the year to open,
 * recurring entries due, monthly bills not booked yet, drafts made by
 * recurring invoices, closed years to put away, years whose retention has
 * ended and gaps in the rule tables. Each is a rule, so the checklist only turns findings into rows.
 */

/** A VAT return falling due within this many days is shown. */
const VAT_DUE_SOON_DAYS = 30

/** What the overview rules look at. */
export interface OverviewContext {
  /** Every entry in the book. */
  entries: readonly Entry[]
  /** The selected year's entries. */
  yearEntries: readonly Entry[]
  cats: CategoryMap
  /** The selected year. */
  year: number
  today: string
  /** `"2026-03"`, the month the bookkeeping began, or null. */
  bookStart: string | null
  timeline: readonly TimelinePeriod[]
  form5Filed: Readonly<Record<string, string>>
  yearEnd: Readonly<Record<string, YearEnd>>
  recurring: readonly RecurringEntry[]
  /** The invoices, drafts and issued (§8.27). */
  invoices: readonly Invoice[]
  /** Closed years the user has marked as stored, with the day. */
  yearsArchived: Readonly<Record<string, string>>
  /** Years archived out of the book (§8.19). */
  archives?: Readonly<Record<string, unknown>>
  /** The retention stages the user has noted, by year. */
  retentionNoted?: Readonly<Record<string, RetentionStage>>
  /** The bills the missing-bill reminder leaves alone. */
  billsIgnored?: readonly string[]
}

/** What each overview rule reports, by rule id. */
export interface OverviewData {
  vatOverdue: { period: TimelinePeriod }
  vatDueSoon: { period: TimelinePeriod; days: number }
  openItems: OpenBalances
  billsOverdue: BillsDue
  billsDueSoon: BillsDue
  form5Due: Form5Reminder
  rulesStale: { gaps: RuleGap[] }
  missingReceipts: { count: number }
  emptyMonths: { months: number[] }
  newYear: { year: number }
  recurringDue: { month: string; items: RecurringEntry[] }
  billMissing: MissingBill
  recurringDrafts: { count: number }
  yearToArchive: { year: number; books: string; vouchers: string }
  retentionEnded: {
    year: number
    stage: RetentionStage
    books: string
    vouchers: string
  }
}

/** Bills received in one group of the payables list (§8.30). */
export interface BillsDue {
  count: number
  /** Gross still to pay. */
  total: Cents
  /** The earliest due date among them. */
  first: string
}

/** The bills of one payables group, or nothing when it has none. */
function billsIn(ctx: OverviewContext, group: "overdue" | "soon"): BillsDue[] {
  const bills = payablesReport(ctx.entries, ctx.cats, ctx.today).items.filter(
    (b) => b.group === group && b.due
  )
  if (bills.length === 0) return []
  return [
    {
      count: bills.length,
      total: bills.reduce((sum, b) => sum + b.open, 0),
      first: bills[0].due!,
    },
  ]
}

export type OverviewRuleId = keyof OverviewData

/** A finding whose `data` has the shape its `ruleId` says. */
export type OverviewFinding = {
  [K in OverviewRuleId]: Finding<OverviewData[K]> & { ruleId: K }
}[OverviewRuleId]

type AnyData = OverviewData[OverviewRuleId]

function rule<K extends OverviewRuleId>(
  id: K,
  severity: Rule<OverviewContext>["severity"],
  source: string,
  check: (ctx: OverviewContext) => readonly OverviewData[K][]
): Rule<OverviewContext, AnyData> {
  return { id, severity, source, check }
}

/**
 * Months of the selected year with no entries, from its first month with one
 * up to the last complete month. A month still running is not empty yet, and
 * a month before the book's start was never meant to have entries.
 */
function emptyMonths(ctx: OverviewContext): number[] {
  const used = new Set(ctx.yearEntries.map((e) => monthOf(e.date)))
  if (used.size === 0) return []
  const out: number[] = []
  const last = lastCompleteMonth(ctx.year, ctx.today)
  for (let m = Math.min(...used); m <= last; m++) {
    const key = `${ctx.year}-${String(m).padStart(2, "0")}`
    if (ctx.bookStart && key < ctx.bookStart) continue
    if (!used.has(m)) out.push(m)
  }
  return out
}

/**
 * In the order the checklist shows them. The year to open and the recurring
 * entries are about today, whichever year is selected.
 */
export const OVERVIEW_RULES = defineRules<OverviewContext, AnyData>([
  rule("vatOverdue", "blocker", "vero.fi, VAT return due dates", (ctx) =>
    ctx.timeline
      .filter((p) => p.status === "overdue")
      .map((period) => ({ period }))
  ),
  rule("vatDueSoon", "warn", "vero.fi, VAT return due dates", (ctx) =>
    ctx.timeline
      .filter((p) => p.status === "due")
      .map((period) => ({ period, days: daysBetween(ctx.today, period.due) }))
      .filter((d) => d.days <= VAT_DUE_SOON_DAYS)
  ),
  rule("billsOverdue", "warn", "app", (ctx) => billsIn(ctx, "overdue")),
  rule("billsDueSoon", "info", "app", (ctx) => billsIn(ctx, "soon")),
  rule("openItems", "info", "KPL 1:1a", (ctx) => {
    const open = balancesAt(ctx.entries, ctx.cats, ctx.today)
    return open.count ? [open] : []
  }),
  rule("form5Due", "info", "vero.fi, Form 5 due dates", (ctx) => {
    const due = form5Reminder(ctx.entries, ctx.today, ctx.form5Filed)
    return due ? [due] : []
  }),
  rule("rulesStale", "info", "app", (ctx) => {
    const gaps = ruleGaps(ctx.today)
    return gaps.length ? [{ gaps }] : []
  }),
  rule("missingReceipts", "warn", "KPL 2:10", (ctx) => {
    const count = ctx.yearEntries.reduce(
      (n, e) => n + (e.atts ?? []).filter((a) => a.missing).length,
      0
    )
    return count ? [{ count }] : []
  }),
  rule("emptyMonths", "info", "KPL 2:4", (ctx) => {
    const months = emptyMonths(ctx)
    return months.length ? [{ months }] : []
  }),
  rule("newYear", "info", "app", (ctx) => {
    const year = newYearTarget(ctx.today)
    const previousHasEntries = ctx.entries.some((e) =>
      e.date.startsWith(`${year - 1}-`)
    )
    return newYearDue(ctx.yearEnd, ctx.today, previousHasEntries)
      ? [{ year }]
      : []
  }),
  rule("recurringDue", "info", "app", (ctx) => {
    const month = ctx.today.slice(0, 7)
    const items = dueRecurring(ctx.recurring, month, ctx.entries)
    return items.length ? [{ month, items }] : []
  }),
  rule("billMissing", "info", "KPL 2:4", (ctx) =>
    missingBills(ctx.entries, ctx.today, ctx.recurring, ctx.billsIgnored)
  ),
  rule("recurringDrafts", "info", "app", (ctx) => {
    const count = ctx.invoices.filter(
      (i) => i.number === null && i.recurring !== undefined
    ).length
    return count ? [{ count }] : []
  }),
  rule("yearToArchive", "info", "KPL 2:10", (ctx) =>
    yearsToArchive(ctx.entries, ctx.today, ctx.yearsArchived).map((year) => ({
      year,
      ...retentionDates(year),
    }))
  ),
  rule("retentionEnded", "info", "KPL 2:10", (ctx) =>
    retentionEnded(
      heldYears(ctx.entries, ctx.yearsArchived, ctx.archives),
      ctx.today,
      ctx.retentionNoted ?? {}
    ).map((r) => ({ ...r, ...retentionDates(r.year) }))
  ),
])

/** Every overview finding, in rule order, typed by its rule id. */
export function overviewFindings(ctx: OverviewContext): OverviewFinding[] {
  return evaluate(OVERVIEW_RULES, ctx) as OverviewFinding[]
}
