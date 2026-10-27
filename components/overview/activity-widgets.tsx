"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  SaveIcon,
} from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatters } from "@/components/lang-provider"
import {
  periodLabel,
  useOverviewData,
} from "@/components/overview/overview-data"
import { useCanSaveToFile, useSaveBook } from "@/hooks/use-save-book"
import { calcEntry } from "@/lib/domain/calc"
import { monthOf } from "@/lib/domain/dates"
import { daysBetween } from "@/lib/domain/vat-deadline"
import { rateMismatch } from "@/lib/domain/vat-rates"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore, type CheckFilter } from "@/stores/book-store"
import { hasReceipt } from "@/stores/selectors"

/** The newest entries of the year. A row opens the entry dialog. */
export function RecentWidget() {
  const f = useFormatters()
  const { yearEntries, catMap, year } = useOverviewData()
  const openDialog = useBookStore((s) => s.openDialog)
  const setMonth = useBookStore((s) => s.setMonth)

  const rows = React.useMemo(
    () =>
      [...yearEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [yearEntries]
  )

  return (
    <Panel
      title={f.t("overview.widgetRecent")}
      actions={
        <ButtonLink
          variant="link"
          size="sm"
          className="ml-auto px-0"
          href={APP_ROUTES.ledger}
          onClick={() => setMonth(0)}
        >
          {f.t("overview.allEntries")}
          <ArrowRightIcon data-icon="inline-end" />
        </ButtonLink>
      }
      className="flex flex-1 flex-col"
    >
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {f.t("overview.noEntriesYear", { y: year })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("ledger.colDate")}</TableHead>
              <TableHead>{f.t("ledger.colDescription")}</TableHead>
              <TableHead className="hidden @lg:table-cell">
                {f.t("common.type")}
              </TableHead>
              <TableHead className="text-right">
                {f.t("ledger.colGross")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => {
              const income = e.type === "income"
              const cat = catMap.get(e.catId)
              const edit = () =>
                openDialog({ kind: "entry", mode: "edit", entryId: e.id })
              return (
                <TableRow
                  key={e.id}
                  tabIndex={0}
                  onClick={edit}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" && ev.currentTarget === ev.target) {
                      ev.preventDefault()
                      edit()
                    }
                  }}
                  className="focus-ring cursor-pointer"
                >
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(e.date)}
                  </TableCell>
                  <TableCell className="max-w-[20rem]">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "truncate font-medium",
                          !e.description && "text-muted-foreground"
                        )}
                      >
                        {e.description || f.t("ledger.noDescription")}
                      </span>
                      {hasReceipt(e) ? null : (
                        <span className="shrink-0 text-xs text-warning">
                          {f.t("overview.noReceipt")}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {f.catLabel(cat)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden @lg:table-cell">
                    <Pill
                      tone={income ? "income" : "expense"}
                      className="font-medium"
                    >
                      {income ? f.t("common.income") : f.t("common.expense")}
                    </Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={calcEntry(e).gross}
                      signed={!income}
                      tone={income ? undefined : "expense"}
                      className="font-semibold"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

type CheckTone = "warn" | "crit" | "ok" | "info"

interface CheckItem {
  key: string
  tone: CheckTone
  title: string
  sub: string
  action?: React.ReactNode
}

const TONE_CLASS: Record<CheckTone, string> = {
  warn: "bg-warning/15 text-warning",
  crit: "bg-expense-subtle text-expense",
  ok: "bg-income-subtle text-income",
  info: "bg-muted text-muted-foreground",
}

/**
 * Only what the user can act on (§8.12): unsaved work, a return overdue or
 * falling due, entries without a receipt, receipts missing from the file, and
 * months with no entries since the book began.
 */
export function ChecksWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const router = useRouter()
  const dirty = useBookStore((s) => s.dirty)
  const fileName = useBookStore((s) => s.fileName)
  const openDialog = useBookStore((s) => s.openDialog)
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const canSave = useCanSaveToFile()
  const save = useSaveBook()

  const showInLedger = (check: CheckFilter) => {
    const s = useBookStore.getState()
    s.clearLedgerFilters()
    s.setMonth(0)
    s.setLedgerCheck(check)
    router.push(APP_ROUTES.ledger)
  }

  const items: CheckItem[] = []
  const name = fileName ?? f.t("file.untitled")
  items.push(
    dirty
      ? {
          key: "save",
          tone: "warn",
          title: f.t("file.dirty"),
          sub: name,
          action: canSave ? (
            <Button variant="outline" size="sm" onClick={save}>
              <SaveIcon data-icon="inline-start" />
              {f.t("file.save")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog({ kind: "export" })}
            >
              {f.t("file.download")}
            </Button>
          ),
        }
      : { key: "save", tone: "ok", title: f.t("file.clean"), sub: name }
  )

  const fileButton = (key: string) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setVatFiled(key, data.today)}
    >
      {f.t("overview.filed")}
    </Button>
  )
  for (const p of data.timeline) {
    if (p.status === "overdue") {
      items.push({
        key: p.key,
        tone: "crit",
        title: f.t("overview.vatOverdue", { p: periodLabel(f, p) }),
        sub: f.t("overview.vatOverdueSub", { d: f.date(p.due) }),
        action: fileButton(p.key),
      })
    } else if (p.status === "due" && daysBetween(data.today, p.due) <= 30) {
      items.push({
        key: p.key,
        tone: "warn",
        title: f.t("overview.vatDue", {
          p: periodLabel(f, p),
          d: f.date(p.due),
        }),
        sub: f.t("overview.daysLeft", { n: daysBetween(data.today, p.due) }),
        action: fileButton(p.key),
      })
    }
  }

  const without = data.yearEntries.filter((e) => !hasReceipt(e)).length
  if (without) {
    items.push({
      key: "without",
      tone: "warn",
      title: f.t("overview.withoutReceipt", { n: without }),
      sub: f.t("overview.withoutReceiptSub"),
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => showInLedger("noReceipt")}
        >
          {f.t("overview.showThem")}
        </Button>
      ),
    })
  }

  const wrongRate = data.yearEntries.filter((e) =>
    rateMismatch(e.vatRate, e.date)
  ).length
  if (wrongRate) {
    items.push({
      key: "rate",
      tone: "warn",
      title: f.t("overview.rateMismatch", { n: wrongRate }),
      sub: f.t("overview.rateMismatchSub"),
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => showInLedger("rateMismatch")}
        >
          {f.t("overview.showThem")}
        </Button>
      ),
    })
  }

  const missing = data.yearEntries.reduce(
    (n, e) => n + (e.atts ?? []).filter((a) => a.missing).length,
    0
  )
  if (missing) {
    items.push({
      key: "missing",
      tone: "warn",
      title: f.t("overview.missingFiles", { n: missing }),
      sub: f.t("overview.missingFilesSub"),
    })
  }

  /*
   * Empty months, from the book's first month in this year up to the last
   * complete one. A month still running is not empty yet.
   */
  const used = new Set(data.yearEntries.map((e) => monthOf(e.date)))
  const lastComplete = data.elapsedMonths === 12 ? 12 : data.elapsedMonths - 1
  const emptyMonths: string[] = []
  for (let m = Math.min(...used); m <= lastComplete; m++) {
    if (!used.has(m)) emptyMonths.push(f.month(m - 1, true).toLowerCase())
  }
  if (emptyMonths.length) {
    items.push({
      key: "empty",
      tone: "info",
      title: f.t("overview.emptyMonths", { m: emptyMonths.join(", ") }),
      sub: f.t("overview.emptyMonthsSub"),
    })
  }

  const open = items.filter(
    (i) => i.tone === "warn" || i.tone === "crit"
  ).length

  return (
    <Panel
      title={f.t("overview.widgetChecks")}
      actions={
        <span className="tabular ml-auto text-sm text-muted-foreground">
          {open
            ? f.t("overview.openCount", { n: open })
            : f.t("overview.allClear")}
        </span>
      }
      className="flex flex-1 flex-col"
    >
      <ul className="divide-y">
        {items.map((i) => (
          <li
            key={i.key}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
          >
            <span
              className={cn(
                "mt-0.5 grid size-5 place-items-center rounded-full",
                TONE_CLASS[i.tone]
              )}
              aria-hidden
            >
              {i.tone === "ok" ? (
                <CheckIcon className="size-3" strokeWidth={3} />
              ) : i.tone === "info" ? (
                <InfoIcon className="size-3" strokeWidth={3} />
              ) : (
                <AlertCircleIcon className="size-3" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{i.title}</p>
              <p className="truncate text-xs text-muted-foreground">{i.sub}</p>
            </div>
            {i.action ?? <span />}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
