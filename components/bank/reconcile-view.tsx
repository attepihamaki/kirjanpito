"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  LandmarkIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import { BankImportButton } from "@/components/bank/bank-import-button"
import { Money } from "@/components/common/money"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { useSectionHeading } from "@/components/common/sub-page-tabs"
import { useFormatters } from "@/components/lang-provider"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  checkStatements,
  monthCovers,
  statementsInYear,
  type MonthCover,
  type MonthStatus,
  type StatementCheck,
} from "@/lib/domain/bank-statements"
import { formatIban } from "@/lib/domain/iban"
import { indexCategories } from "@/lib/domain/types"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const TONE: Record<MonthStatus, "income" | "warning" | "expense" | "neutral"> =
  {
    agrees: "income",
    changed: "warning",
    differs: "expense",
    none: "neutral",
  }

const ICON: Record<MonthStatus, typeof CircleCheckIcon> = {
  agrees: CircleCheckIcon,
  changed: TriangleAlertIcon,
  differs: CircleAlertIcon,
  none: CircleDashedIcon,
}

const STATUS_LABEL = {
  agrees: "reconcile.agrees",
  changed: "reconcile.changed",
  differs: "reconcile.differs",
  none: "reconcile.none",
} as const

/**
 * The statements the book was set against, month by month (§8.38). Each is
 * worked out against the book as it stands, so a voucher changed after its
 * statement was imported shows here as a month that no longer agrees.
 */
export function ReconcileView() {
  const f = useFormatters()
  const heading = useSectionHeading("ledger")
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const records = useBookStore((s) => s.bankStatements)
  const readOnly = useBookStore((s) => s.archiveYear !== null)

  const { checks, months } = React.useMemo(() => {
    const catMap = indexCategories(cats)
    const all = checkStatements(records, entries, catMap)
    return {
      checks: statementsInYear(all, year),
      months: monthCovers(all, entries, catMap, year),
    }
  }, [records, entries, cats, year])

  const changed = checks.filter((c) => c.status === "changed").length

  return (
    <>
      <PageHeader
        {...heading}
        subtitle={
          checks.length === 0
            ? f.t("reconcile.subtitle", { y: year })
            : changed > 0
              ? f.t("reconcile.subtitleChanged", { n: changed })
              : f.t("reconcile.subtitleCount", { n: checks.length, y: year })
        }
        actions={readOnly ? null : <BankImportButton />}
      />
      <LedgerTabs />

      {checks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LandmarkIcon />
            </EmptyMedia>
            <EmptyTitle>{f.t("reconcile.emptyTitle", { y: year })}</EmptyTitle>
            <EmptyDescription>{f.t("reconcile.emptyHint")}</EmptyDescription>
          </EmptyHeader>
          {readOnly ? null : (
            <EmptyContent>
              <BankImportButton />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <MonthGrid months={months} year={year} />
          <StatementTable checks={checks} readOnly={readOnly} />
        </div>
      )}
    </>
  )
}

function MonthGrid({
  months,
  year,
}: {
  months: readonly MonthCover[]
  year: number
}) {
  const f = useFormatters()
  const router = useRouter()
  const setYear = useBookStore((s) => s.setYear)
  const setMonth = useBookStore((s) => s.setMonth)
  const clearFilters = useBookStore((s) => s.clearLedgerFilters)

  /* Old filters left in place could hide the month's rows. */
  const openMonth = (month: number) => {
    clearFilters()
    setYear(year)
    setMonth(month)
    router.push(APP_ROUTES.ledger)
  }

  return (
    <Panel
      title={f.t("reconcile.monthsTitle", { y: year })}
      description={f.t("reconcile.monthsHint")}
      bodyClassName="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6"
    >
      {months.map((m) => {
        const Icon = ICON[m.status]
        const status = f.t(STATUS_LABEL[m.status])
        const uncovered = m.uncovered.length
        return (
          <button
            key={m.month}
            type="button"
            onClick={() => openMonth(m.month)}
            aria-label={f.t("reconcile.monthLabel", {
              m: f.month(m.month - 1),
              s: status,
            })}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              m.status === "none" && "border-dashed"
            )}
          >
            <span className="font-medium">{f.month(m.month - 1)}</span>
            <Pill tone={TONE[m.status]} className="gap-1 whitespace-nowrap">
              <Icon aria-hidden className="size-3.5" />
              {status}
            </Pill>
            {uncovered > 0 ? (
              <span className="text-xs text-muted-foreground">
                {f.t("reconcile.uncovered", { n: uncovered })}
              </span>
            ) : null}
          </button>
        )
      })}
    </Panel>
  )
}

function StatementTable({
  checks,
  readOnly,
}: {
  checks: readonly StatementCheck[]
  readOnly: boolean
}) {
  const f = useFormatters()
  const remove = useBookStore((s) => s.removeBankStatement)
  const add = useBookStore((s) => s.addBankStatement)

  const removeCheck = (check: StatementCheck) => {
    remove(check.record.id)
    const id = toast.add({
      title: f.t("reconcile.deleted"),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          add(check.record)
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("reconcile.statementsTitle")}
      description={f.t("reconcile.statementsHint")}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("reconcile.colDays")}</TableHead>
              <TableHead className="text-right">
                {f.t("reconcile.colStatement")}
              </TableHead>
              <TableHead className="text-right">
                {f.t("reconcile.colBook")}
              </TableHead>
              <TableHead className="text-right">
                {f.t("reconcile.colDifference")}
              </TableHead>
              <TableHead>{f.t("reconcile.colStatus")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <StatementRow
                key={check.record.id}
                check={check}
                readOnly={readOnly}
                onRemove={() => removeCheck(check)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
}

function StatementRow({
  check,
  readOnly,
  onRemove,
}: {
  check: StatementCheck
  readOnly: boolean
  onRemove: () => void
}) {
  const f = useFormatters()
  const { record } = check
  const Icon = ICON[check.status]
  const source = [
    f.t("reconcile.rows", { n: record.rows }),
    record.fileName,
    record.iban ? formatIban(record.iban) : null,
    f.t("reconcile.imported", { d: f.date(record.importedAt) }),
  ]
    .filter(Boolean)
    .join(" · ")
  const notes = [
    check.status === "changed"
      ? f.t("reconcile.changedNote", {
          n: f.money(check.bookMovement - record.bookMovement),
        })
      : null,
    check.gap ? f.t("reconcile.gapNote", { n: f.money(check.gap) }) : null,
    check.chainBreak !== null
      ? f.t("reconcile.chainNote", { n: f.money(check.chainBreak) })
      : null,
  ].filter((n): n is string => n !== null)

  return (
    <TableRow>
      <TableCell className="align-top">
        <span className="tabular block font-medium whitespace-nowrap">
          {f.date(record.from)}–{f.date(record.to)}
        </span>
        <span className="block max-w-64 truncate text-xs text-muted-foreground">
          {source}
        </span>
        {notes.map((note) => (
          <span key={note} className="mt-1 block max-w-xs text-xs text-warning">
            {note}
          </span>
        ))}
      </TableCell>
      <TableCell className="text-right align-top">
        <Money cents={record.movement} />
      </TableCell>
      <TableCell className="text-right align-top">
        <Money cents={check.bookMovement} />
      </TableCell>
      <TableCell className="text-right align-top">
        <Money cents={check.difference} />
      </TableCell>
      <TableCell className="align-top">
        <Pill tone={TONE[check.status]} className="gap-1 whitespace-nowrap">
          <Icon aria-hidden className="size-3.5" />
          {f.t(STATUS_LABEL[check.status])}
        </Pill>
      </TableCell>
      <TableCell className="w-0 text-right align-top">
        {readOnly ? null : (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={f.t("reconcile.delete", {
              a: f.date(record.from),
              b: f.date(record.to),
            })}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
