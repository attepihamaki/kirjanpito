"use client"

import * as React from "react"
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { ChevronDownIcon, DownloadIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

import { ButtonLink } from "@/components/common/button-link"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useCommandCtx } from "@/hooks/use-commands"
import { useToday } from "@/hooks/use-today"
import { saveBlob } from "@/lib/browser/download"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
import {
  ADVANCE_TAX_CAT,
  advanceTaxPaid,
  estimateTax,
} from "@/lib/domain/advance-tax"
import { uid } from "@/lib/domain/id"
import { incomeStatement } from "@/lib/domain/income-statement"
import { estimateIncomeTax, incomeTaxRow } from "@/lib/domain/income-tax"
import {
  asPeriod,
  bookStartDate,
  daysBetween,
  periodFromKey,
} from "@/lib/domain/vat-deadline"
import { filterPeriod } from "@/lib/domain/period"
import { vatReport } from "@/lib/domain/vat"
import { useVatBasisEntries } from "@/hooks/use-tax-basis"
import {
  taxCalendar,
  toIcs,
  type CalendarEvent,
} from "@/lib/domain/tax-calendar"
import { heldYears } from "@/lib/domain/retention"
import { lossAvailable } from "@/lib/domain/tax-loss"
import { useLossInput } from "@/hooks/use-loss-input"
import { indexCategories } from "@/lib/domain/types"
import { eventTitle } from "@/lib/i18n/calendar-label"
import { SETTINGS_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** The tax calendar (§8.22): the year's due dates, and an `.ics` file of them. */
export function CalendarView() {
  const f = useFormatters()
  const today = useToday()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const bookEnd = useBookStore((s) => s.bookEnd)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const payMonths = useBookStore((s) => s.payMonths)
  const yearsArchived = useBookStore((s) => s.yearsArchived)
  const archives = useBookStore((s) => s.archives)

  const events = React.useMemo(
    () =>
      taxCalendar({
        year,
        today,
        vatPeriod,
        startDate: bookStartDate(
          bookStart,
          entries.reduce<string | null>(
            (min, e) => (min === null || e.date < min ? e.date : min),
            null
          )
        ),
        endMonth: bookEnd,
        vatFiled,
        form5Filed,
        payMonths,
        entries,
        cats: indexCategories(cats),
        heldYears: heldYears(entries, yearsArchived, archives),
      }),
    [
      year,
      today,
      vatPeriod,
      bookStart,
      bookEnd,
      vatFiled,
      form5Filed,
      payMonths,
      entries,
      cats,
      yearsArchived,
      archives,
    ]
  )

  /*
   * What is still ahead leads the list: every date from today on, and an
   * earlier one the user can still act on. The rest of the past folds away
   * under it. A year with nothing ahead lists everything, since there is
   * nothing to lead with.
   */
  const { ahead, behind } = React.useMemo(() => {
    const waiting = events.filter((e) => e.date >= today || isOpenTask(e))
    return waiting.length
      ? { ahead: waiting, behind: events.filter((e) => !waiting.includes(e)) }
      : { ahead: events, behind: [] }
  }, [events, today])
  const [showPast, setShowPast] = React.useState(false)
  const missing = (
    [
      payMonths.yel.length ? null : "calendar.addYel",
      payMonths.advanceTax.length ? null : "calendar.addAdvanceTax",
    ] as const
  ).filter((m) => m !== null)

  /* What is ahead, by how soon the user has to act (§8.22). */
  const groups = React.useMemo(() => {
    const late: CalendarEvent[] = []
    const week: CalendarEvent[] = []
    const later: CalendarEvent[] = []
    for (const e of ahead) {
      const days = daysBetween(today, e.date)
      if (days < 0) late.push(e)
      else if (days < 7) week.push(e)
      else later.push(e)
    }
    return [
      { key: "late", label: "calendar.groupLate", events: late },
      { key: "week", label: "calendar.groupWeek", events: week },
      { key: "later", label: "calendar.groupLater", events: later },
    ] as const
  }, [ahead, today])

  /*
   * A VAT return's amount, from the book as it stands, once its period has
   * ended. Null while the period runs, since the figure is not final; other
   * kinds keep their own amount.
   */
  const vatEntries = useVatBasisEntries()
  const vatAmount = React.useCallback(
    (e: CalendarEvent): number | null | undefined => {
      if (e.kind !== "vat") return undefined
      const p = periodFromKey(e.ref)
      if (!p || today <= p.to) return null
      return vatReport(
        filterPeriod(vatEntries, asPeriod(p)),
        indexCategories(cats)
      ).due
    },
    [vatEntries, cats, today]
  )

  const exportIcs = () => {
    const ics = toIcs(
      events.map((e) => ({
        id: e.id,
        date: e.date,
        title: eventTitle(f, e),
        description:
          e.kind === "yel" || e.kind === "advanceTax"
            ? f.t("calendar.note")
            : undefined,
      })),
      f.t("calendar.icsName", { y: year }),
      new Date()
    )
    saveBlob(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
      f.t("calendar.icsFile", { y: year })
    )
  }

  return (
    <>
      <PageHeader
        title={f.t("nav.calendar")}
        subtitle={f.t("calendar.subtitle", { y: year })}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          {events.length === 0 ? (
            <Empty>
              <EmptyDescription>{f.t("calendar.empty")}</EmptyDescription>
              <EmptyContent>
                <NewEntryButton />
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {groups.map((group) =>
                group.events.length ? (
                  <section key={group.key}>
                    <h2
                      className={cn(
                        "px-5 pt-4 pb-1 text-xs font-semibold tracking-wide uppercase",
                        group.key === "late"
                          ? "text-expense"
                          : "text-muted-foreground"
                      )}
                    >
                      {f.t(group.label)}
                    </h2>
                    <ul className="divide-y">
                      {group.events.map((e) => (
                        <EventRow
                          key={e.id}
                          event={e}
                          today={today}
                          amount={vatAmount(e)}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null
              )}
              {behind.length ? (
                <div className="mt-2 border-t">
                  <Button
                    variant="ghost"
                    className="print-hidden h-auto w-full justify-between rounded-none px-5 py-3 text-muted-foreground"
                    aria-expanded={showPast}
                    onClick={() => setShowPast((v) => !v)}
                  >
                    <span>{f.t("calendar.handled", { n: behind.length })}</span>
                    <span className="inline-flex items-center gap-1">
                      {f.t(showPast ? "calendar.hide" : "calendar.show")}
                      <ChevronDownIcon
                        data-icon="inline-end"
                        className={cn(
                          "transition-transform",
                          showPast && "rotate-180"
                        )}
                      />
                    </span>
                  </Button>
                  <ul
                    className={cn(
                      "divide-y border-t",
                      !showPast && "hidden print:block"
                    )}
                  >
                    {behind.map((e) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        today={today}
                        amount={vatAmount(e)}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </Panel>

        <aside className="flex flex-col gap-4">
          {/* A date the app cannot work out is asked for beside the list (§8.22). */}
          {missing.length ? (
            <Panel
              title={f.t("calendar.missingTitle")}
              bodyClassName="flex flex-col gap-3 p-4"
            >
              <p className="text-sm text-muted-foreground">
                {f.t("calendar.missingBody")}
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.map((m) => (
                  <ButtonLink
                    key={m}
                    variant="outline"
                    size="sm"
                    href={SETTINGS_ROUTES.calendar}
                  >
                    <PlusIcon data-icon="inline-start" />
                    {f.t(m)}
                  </ButtonLink>
                ))}
              </div>
            </Panel>
          ) : null}
          <AdvanceTaxSummary />
          <Button
            variant="outline"
            className="print-hidden"
            onClick={exportIcs}
            disabled={events.length === 0}
          >
            <DownloadIcon data-icon="inline-start" />
            {f.t("calendar.exportIcs")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {f.t("calendar.note")}
            {missing.length ? null : (
              <>
                {" "}
                <Link
                  href={SETTINGS_ROUTES.calendar}
                  className="underline underline-offset-2"
                >
                  {f.t("calendar.setMonths")}
                </Link>
              </>
            )}
          </p>
        </aside>
      </div>
    </>
  )
}

/**
 * Whether a date already passed still waits for the user: a return not filed,
 * an instalment with an amount not booked, a bill not paid. The other kinds
 * have nothing to mark, so their past dates are history.
 */
function isOpenTask(event: CalendarEvent): boolean {
  if (event.done) return false
  return (
    event.kind === "vat" ||
    event.kind === "form5" ||
    event.kind === "bill" ||
    (event.kind === "advanceTax" && event.amount !== undefined)
  )
}

/**
 * Where a date stands, under its title: late by how many days, today,
 * tomorrow or in how many days, or done. A bill says it is one first.
 */
function statusText(
  f: ReturnType<typeof useFormatters>,
  event: CalendarEvent,
  days: number
): string {
  const when = event.done
    ? f.t(
        event.kind === "advanceTax" || event.kind === "bill"
          ? "calendar.paid"
          : "calendar.done"
      )
    : days < 0
      ? isOpenTask(event)
        ? f.t("payables.daysLate", { n: -days })
        : f.t("calendar.daysAgo", { n: -days })
      : days === 0
        ? f.t("calendar.today")
        : days === 1
          ? f.t("overview.tomorrow")
          : f.t("calendar.inDays", { n: days })
  return event.kind === "bill" ? `${f.t("overview.todoBill")} · ${when}` : when
}

function EventRow({
  event,
  today,
  amount,
}: {
  event: CalendarEvent
  today: string
  /** What a VAT return comes to, or null while its period is still running. */
  amount: number | null | undefined
}) {
  const f = useFormatters()
  const days = daysBetween(today, event.date)
  const late = days < 0 && isOpenTask(event)
  const thisWeek = days >= 0 && days < 7
  const book = useBookInstalment(event, today)
  const openDialog = useBookStore((s) => s.openDialog)
  const shown = amount === undefined ? event.amount : amount
  const tile =
    days === 0
      ? f.t("calendar.today")
      : thisWeek
        ? f.weekday(event.date)
        : f.month(Number(event.date.slice(5, 7)) - 1, true)

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3",
        event.done && "text-muted-foreground"
      )}
    >
      {/* The date as a tile: the month (or the weekday this week) over the day. */}
      <span
        className={cn(
          "flex w-14 shrink-0 flex-col items-center rounded-lg border py-1",
          late && "border-expense/40 bg-expense-subtle text-expense",
          !late && thisWeek && !event.done && "border-warning/40 bg-warning/10"
        )}
        title={f.date(event.date)}
      >
        <span className="text-[0.65rem] font-semibold tracking-wide uppercase">
          {tile}
        </span>
        <span className="tabular text-lg leading-tight font-semibold">
          {Number(event.date.slice(8, 10))}
        </span>
      </span>
      <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
        <span className="text-sm font-medium">
          {event.kind === "bill" ? (
            <button
              type="button"
              className="text-left underline-offset-2 hover:underline"
              onClick={() =>
                openDialog({ kind: "entry", mode: "edit", entryId: event.ref })
              }
            >
              {eventTitle(f, event)}
            </button>
          ) : (
            eventTitle(f, event)
          )}
        </span>
        <span
          className={cn(
            "text-xs",
            late ? "text-expense" : "text-muted-foreground"
          )}
        >
          {statusText(f, event, days)}
          {amount === null && event.kind === "vat"
            ? ` · ${f.t("calendar.amountLater")}`
            : null}
        </span>
      </span>
      {book}
      <span className="tabular w-24 shrink-0 text-right text-sm font-semibold">
        {shown === undefined || shown === null ? "–" : f.money(shown)}
      </span>
    </li>
  )
}

/**
 * The button that books an advance tax instalment as a line 365 expense. It
 * appears once the instalment is due and has no payment in its month yet; the
 * ledger then counts it as paid. Null on every other row.
 */
function useBookInstalment(event: CalendarEvent, today: string) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  if (
    event.kind !== "advanceTax" ||
    event.done ||
    event.amount === undefined ||
    event.date > today
  ) {
    return null
  }
  const amount = event.amount
  const book = () =>
    void addEntriesWithUndo(
      ctx,
      [
        {
          id: `e-${uid()}`,
          date: event.date,
          description: f.t("calendar.bookDescription", {
            m: `${f.month(Number(event.ref.slice(5, 7)) - 1)} ${event.ref.slice(0, 4)}`,
          }),
          type: "expense",
          catId: ADVANCE_TAX_CAT,
          amount,
          vatRate: 0,
          amountMode: "gross",
        },
      ],
      f.t("calendar.booked")
    )
  return (
    <Button size="sm" variant="outline" onClick={book}>
      {f.t("calendar.book")}
    </Button>
  )
}

/**
 * The year's advance tax at a glance: the decision, what is booked so far and,
 * when the user gave a rate, a rough estimate of the year's tax. Absent until
 * there is a decision or a rate to show.
 */
function AdvanceTaxSummary() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const payMonths = useBookStore((s) => s.payMonths)
  const losses = useLossInput()
  const decision = payMonths.advanceTaxYearly[String(year)] ?? 0
  const paid = advanceTaxPaid(entries, year)
  const profile = payMonths.taxProfile
  /*
   * On the year's scale when the user has given the details for it (§6.14),
   * else at the user's own flat rate.
   */
  const estimate = React.useMemo(() => {
    const catMap = indexCategories(cats)
    const row = incomeTaxRow(year)
    const result = incomeStatement(entries, catMap, year).result
    const scaled = row
      ? estimateIncomeTax(
          result - lossAvailable(losses, year, result),
          profile,
          row
        )
      : null
    if (scaled) {
      return {
        scale: true,
        tax: scaled.businessTax,
        gap: scaled.businessTax - decision,
      }
    }
    const flat = estimateTax(entries, catMap, year, payMonths.taxRate, decision)
    return flat ? { scale: false, ...flat } : null
  }, [entries, cats, year, payMonths.taxRate, profile, decision, losses])
  if (!decision && !estimate && paid === 0) return null

  const rows: [string, string][] = [
    [
      f.t("calendar.sumDecision"),
      decision ? f.money(decision) : f.t("calendar.noMonths"),
    ],
    [f.t("calendar.sumPaid"), f.money(paid)],
  ]
  if (decision) rows.push([f.t("calendar.sumLeft"), f.money(decision - paid)])
  if (estimate) {
    rows.push([
      estimate.scale
        ? f.t("calendar.sumScale")
        : f.t("calendar.sumEstimate", {
            r: String(payMonths.taxRate).replace(".", ","),
          }),
      f.money(estimate.tax),
    ])
    if (decision && estimate.gap !== 0) {
      rows.push([
        f.t(estimate.gap > 0 ? "calendar.sumShort" : "calendar.sumOver"),
        f.money(Math.abs(estimate.gap)),
      ])
    }
  }

  return (
    <Panel title={f.t("calendar.sumTitle", { y: year })}>
      <dl className="grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {estimate ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          {estimate.scale
            ? f.t("calendar.sumScaleNote", { y: year })
            : f.t("calendar.sumNote")}
        </p>
      ) : null}
    </Panel>
  )
}
