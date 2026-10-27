"use client"

import * as React from "react"
import { ArrowRightIcon, CalendarIcon, CheckIcon } from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import {
  periodLabel,
  periodVat,
  useOverviewData,
} from "@/components/overview/overview-data"
import { daysBetween, type TimelinePeriod } from "@/lib/domain/vat-deadline"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const TODO = new Set(["overdue", "due", "open", "future"])

/**
 * The next return still to file (§6.5): its amount, its due date and the
 * days left, then the one after it. A closed period can be marked as filed
 * here; the mark goes into settings.json and can be undone.
 */
export function VatWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const [justFiled, setJustFiled] = React.useState<TimelinePeriod | null>(null)

  const todo = data.timeline.filter((p) => TODO.has(p.status))
  const next = todo[0]
  const after = todo[1]
  if (!next) return null

  const { report, count } = periodVat(data, next)
  const afterVat = after ? periodVat(data, after) : null
  const word = (due: number, n: number) =>
    due > 0
      ? f.t("overview.payable")
      : due < 0
        ? f.t("overview.refundable")
        : n > 0
          ? f.t("overview.noVat")
          : f.t("overview.nilReturn")

  const days = daysBetween(data.today, next.due)
  const late = next.status === "overdue"
  const fileable = next.status === "due" || late
  const other = report.otherSales
  const note =
    next.status === "open" || next.status === "future"
      ? f.t("overview.periodOpen")
      : late
        ? f.t("overview.periodLate")
        : f.t("overview.periodClosed")

  const openInVatView = () => {
    const s = useBookStore.getState()
    s.setYear(next.year)
    s.setVatMode(next.kind)
    s.setVatIndex(next.index)
  }

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {f.t("overview.vatNext", { p: periodLabel(f, next) })}
        </p>
        <Money
          cents={Math.abs(report.due)}
          tone={
            report.due < 0 ? "income" : report.due > 0 ? "expense" : "muted"
          }
          className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {f.t("overview.vatFormula", {
            w: word(report.due, count),
            a: f.money(report.sales.total.vat),
            b: f.money(report.purchases.total.vat),
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-y py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="size-4 shrink-0" aria-hidden />
          <span>
            {f.t("overview.dueDate", {
              d: `${f.weekday(next.due)} ${f.date(next.due)}`,
            })}
          </span>
        </span>
        <Pill
          className={cn(
            "gap-1.5 font-medium",
            late && "bg-expense-subtle text-expense",
            !late && days <= 14 && "bg-warning/15 text-warning"
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          <span className="tabular">
            {late
              ? f.t("overview.daysLate", { n: -days })
              : days === 0
                ? f.t("overview.dueToday")
                : f.t("overview.daysLeft", { n: days })}
          </span>
        </Pill>
      </div>

      <p className="text-sm text-muted-foreground">
        {note}
        {other.eu || other.nonEu || other.reverse
          ? ` ${f.t("overview.otherSalesToo")}`
          : ""}
      </p>

      {after && afterVat ? (
        <div className="flex flex-wrap justify-between gap-2 rounded-md bg-muted px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            {f.t("overview.after", { p: periodLabel(f, after) })}
            {after.status === "open"
              ? ` (${f.t("overview.running")})`
              : after.status === "future"
                ? ` (${f.t("overview.upcoming")})`
                : ""}
          </span>
          <span className="font-medium">
            {word(afterVat.report.due, afterVat.count)}{" "}
            <Money
              cents={Math.abs(afterVat.report.due)}
              tone={
                afterVat.report.due < 0
                  ? "income"
                  : afterVat.report.due > 0
                    ? "expense"
                    : "muted"
              }
            />
            {" · "}
            <span className="tabular">{f.date(after.due)}</span>
          </span>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        {fileable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVatFiled(next.key, data.today)
              setJustFiled(next)
            }}
          >
            <CheckIcon data-icon="inline-start" />
            {f.t("overview.markFiled")}
          </Button>
        ) : justFiled ? (
          <span className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-income" aria-hidden />
            {f.t("overview.markedFiled", { p: periodLabel(f, justFiled) })}
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0"
              onClick={() => {
                setVatFiled(justFiled.key, null)
                setJustFiled(null)
              }}
            >
              {f.t("overview.undo")}
            </Button>
          </span>
        ) : data.timeline.some((p) => p.status === "filed") ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-income" aria-hidden />
            {f.t("overview.earlierFiled")}
          </span>
        ) : (
          <span />
        )}
        <ButtonLink
          variant="link"
          size="sm"
          className="px-0"
          href={APP_ROUTES.vat}
          onClick={openInVatView}
        >
          {f.t("nav.vat")}
          <ArrowRightIcon data-icon="inline-end" />
        </ButtonLink>
      </div>
    </Panel>
  )
}
