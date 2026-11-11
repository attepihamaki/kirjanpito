"use client"

import * as React from "react"
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { ChevronRightIcon, DownloadIcon } from "lucide-react"
import Link from "next/link"

import { ButtonLink } from "@/components/common/button-link"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
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
import { bookStartDate, daysBetween } from "@/lib/domain/vat-deadline"
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
  const missing = [
    payMonths.yel.length ? null : f.t("calendar.missingYel"),
    payMonths.advanceTax.length ? null : f.t("calendar.missingAdvanceTax"),
  ].filter((m): m is string => m !== null)

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
        actions={
          <Button
            variant="outline"
            onClick={exportIcs}
            disabled={events.length === 0}
          >
            <DownloadIcon />
            {f.t("calendar.export")}
          </Button>
        }
      />

      <div className="space-y-6">
        <AdvanceTaxSummary />

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
              {/* A date the app cannot work out is asked for where it would be listed. */}
              {missing.length ? (
                <ul className="divide-y border-b">
                  {missing.map((text) => (
                    <li
                      key={text}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                    >
                      <span className="min-w-0 flex-1 text-sm">{text}</span>
                      <ButtonLink
                        variant="outline"
                        size="sm"
                        href={SETTINGS_ROUTES.calendar}
                      >
                        {f.t("calendar.pickMonths")}
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              <MonthList events={ahead} today={today} />
              {behind.length ? (
                <div className="border-t">
                  <Button
                    variant="ghost"
                    className="print-hidden h-auto w-full justify-start rounded-none px-5 py-3 text-muted-foreground"
                    aria-expanded={showPast}
                    onClick={() => setShowPast((v) => !v)}
                  >
                    <ChevronRightIcon
                      data-icon="inline-start"
                      className={cn(
                        "transition-transform",
                        showPast && "rotate-90"
                      )}
                    />
                    {f.t("calendar.past", { n: behind.length })}
                  </Button>
                  <div className={cn(!showPast && "hidden print:block")}>
                    <MonthList events={behind} today={today} />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Panel>

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

/** The events under a heading per month, in the order given. */
function MonthList({
  events,
  today,
}: {
  events: readonly CalendarEvent[]
  today: string
}) {
  const f = useFormatters()
  const groups = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = e.date.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return (
    <ol className="divide-y">
      {[...groups.entries()].map(([key, list]) => (
        <li key={key}>
          <h2 className="bg-muted/50 px-5 py-2 text-sm font-medium">
            {f.month(Number(key.slice(5, 7)) - 1)}
          </h2>
          <ul className="divide-y">
            {list.map((e) => (
              <EventRow key={e.id} event={e} today={today} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

function EventRow({ event, today }: { event: CalendarEvent; today: string }) {
  const f = useFormatters()
  const days = daysBetween(today, event.date)
  const past = days < 0
  const book = useBookInstalment(event, today)
  const openDialog = useBookStore((s) => s.openDialog)

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3",
        ((past && !isOpenTask(event)) || event.done) && "text-muted-foreground"
      )}
    >
      <span className="tabular w-28 shrink-0 text-sm">
        {f.weekday(event.date)} {f.date(event.date)}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">
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
      {event.amount === undefined ? null : (
        <span className="tabular text-sm">{f.money(event.amount)}</span>
      )}
      {book}
      {event.done ? (
        <Pill tone="income">
          {f.t(
            event.kind === "advanceTax" || event.kind === "bill"
              ? "calendar.paid"
              : "calendar.done"
          )}
        </Pill>
      ) : (
        <Pill
          tone={
            past && isOpenTask(event)
              ? "expense"
              : days >= 0 && days <= 1
                ? "warning"
                : "neutral"
          }
        >
          {days === 0
            ? f.t("calendar.today")
            : past
              ? f.t("calendar.daysAgo", { n: -days })
              : f.t("calendar.inDays", { n: days })}
        </Pill>
      )}
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
