"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useToday } from "@/hooks/use-today"
import { saveBlob } from "@/lib/browser/download"
import { bookStartDate, daysBetween } from "@/lib/domain/vat-deadline"
import {
  taxCalendar,
  toIcs,
  type CalendarEvent,
} from "@/lib/domain/tax-calendar"
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
  const vatFiled = useBookStore((s) => s.vatFiled)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const payMonths = useBookStore((s) => s.payMonths)

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
        vatFiled,
        form5Filed,
        payMonths,
        entries,
        cats: indexCategories(cats),
      }),
    [year, today, vatPeriod, bookStart, vatFiled, form5Filed, payMonths, entries, cats]
  )

  const byMonth = React.useMemo(() => {
    const groups = new Map<number, CalendarEvent[]>()
    for (const e of events) {
      const m = Number(e.date.slice(5, 7))
      groups.set(m, [...(groups.get(m) ?? []), e])
    }
    return [...groups.entries()]
  }, [events])

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
        <Panel>
          {events.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {f.t("calendar.empty")}
            </p>
          ) : (
            <ol className="divide-y">
              {byMonth.map(([month, list]) => (
                <li key={month}>
                  <h2 className="bg-muted/50 px-5 py-2 text-sm font-medium">
                    {f.month(month - 1)}
                  </h2>
                  <ul className="divide-y">
                    {list.map((e) => (
                      <EventRow key={e.id} event={e} today={today} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <p className="text-sm text-muted-foreground">
          {f.t("calendar.note")}{" "}
          <Link
            href={SETTINGS_ROUTES.general}
            className="underline underline-offset-2"
          >
            {f.t("calendar.setMonths")}
          </Link>
        </p>
      </div>
    </>
  )
}

function EventRow({ event, today }: { event: CalendarEvent; today: string }) {
  const f = useFormatters()
  const days = daysBetween(today, event.date)
  const past = days < 0

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3",
        (past || event.done) && "text-muted-foreground"
      )}
    >
      <span className="tabular w-28 shrink-0 text-sm">
        {f.weekday(event.date)} {f.date(event.date)}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">
        {eventTitle(f, event)}
      </span>
      {event.done ? (
        <Pill tone="income">{f.t("calendar.done")}</Pill>
      ) : (
        <Pill>
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
