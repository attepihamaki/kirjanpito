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
import { CHECK_TEXT, INFO_CHECKS } from "@/components/common/check-text"
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
import { ENTRY_CHECKS, flaggedEntryIds } from "@/lib/domain/entry-checks"
import { APP_ROUTES, INVOICE_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import { archiveClosedYear } from "@/lib/commands/io-commands"
import { exportRetentionPackage } from "@/lib/commands/retention-commands"
import { useCommandCtx } from "@/hooks/use-commands"
import { BOOK_LIMIT_RULES } from "@/lib/domain/book-limits"
import { evaluate, type RuleSeverity } from "@/lib/domain/rules/engine"
import { EMPTY_YEAR_END, form5Balance } from "@/lib/domain/form5-balance"
import { RULES } from "@/lib/domain/rule-tables"
import {
  overviewFindings,
  type OverviewFinding,
  type OverviewRuleId,
} from "@/lib/domain/overview-rules"
import {
  VAT_LIMIT_RULES,
  type VatPeriodOverLimit,
  type VatThreshold,
} from "@/lib/domain/vat-threshold"
import {
  BOOK_LIMIT_TEXT,
  vatPeriodLimitText,
  vatThresholdText,
  type BookLimitRuleId,
} from "@/components/common/limit-text"
import { useBookStore, type CheckFilter } from "@/stores/book-store"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"
import { hasReceipt } from "@/stores/selectors"

const RULE_GAP_TEXT = {
  travel: "overview.rulesTravel",
  homeOffice: "overview.rulesHomeOffice",
  incomeTax: "overview.rulesIncomeTax",
  form5Due: "overview.rulesForm5Due",
} as const

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
  const changeLog = useBookStore((s) => s.changeLog)
  const receiptHashes = useReceiptHashStore((s) => s.hashes)
  const openDialog = useBookStore((s) => s.openDialog)
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const yearsArchived = useBookStore((s) => s.yearsArchived)
  const recurring = useBookStore((s) => s.recurring)
  const invoices = useBookStore((s) => s.invoices)
  const setYearArchived = useBookStore((s) => s.setYearArchived)
  const archives = useBookStore((s) => s.archives)
  const retentionNoted = useBookStore((s) => s.retentionNoted)
  const noteRetention = useBookStore((s) => s.noteRetention)
  const ctx = useCommandCtx()
  const canSave = useCanSaveToFile()
  const save = useSaveBook()

  const archiveYear = (y: number) => {
    setYearArchived(y, data.today)
    const id = toast.add({
      title: f.t("overview.yearStoredDone", { y }),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          setYearArchived(y, null)
        },
      },
    })
  }

  const showInLedger = (check: CheckFilter) => {
    const s = useBookStore.getState()
    s.clearLedgerFilters()
    s.setMonth(0)
    s.setLedgerCheck(check)
    router.push(APP_ROUTES.ledger)
  }

  const checkCounts = React.useMemo(
    () =>
      ENTRY_CHECKS.map((check) => ({
        check,
        n: flaggedEntryIds(
          check,
          data.yearEntries,
          data.catMap,
          data.today,
          changeLog,
          receiptHashes
        ).size,
      })),
    [data.yearEntries, data.catMap, data.today, changeLog, receiptHashes]
  )

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

  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const yearEnds = useBookStore((s) => s.yearEnd)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const tone = (severity: RuleSeverity): CheckTone =>
    severity === "blocker" ? "crit" : severity

  const found = overviewFindings({
    entries: data.entries,
    yearEntries: data.yearEntries,
    cats: data.catMap,
    year: data.year,
    today: data.today,
    bookStart: data.bookStart,
    timeline: data.timeline,
    form5Filed,
    yearEnd: yearEnds,
    recurring,
    invoices,
    yearsArchived,
    archives,
    retentionNoted,
  })
  const overview = <K extends OverviewRuleId>(id: K) =>
    found.filter(
      (x): x is Extract<OverviewFinding, { ruleId: K }> => x.ruleId === id
    )

  for (const { severity, data: d } of overview("vatOverdue")) {
    items.push({
      key: d.period.key,
      tone: tone(severity),
      title: f.t("overview.vatOverdue", { p: periodLabel(f, d.period) }),
      sub: f.t("overview.vatOverdueSub", { d: f.date(d.period.due) }),
      action: fileButton(d.period.key),
    })
  }
  for (const { severity, data: d } of overview("vatDueSoon")) {
    items.push({
      key: d.period.key,
      tone: tone(severity),
      title: f.t("overview.vatDue", {
        p: periodLabel(f, d.period),
        d: f.date(d.period.due),
      }),
      sub: f.t("overview.daysLeft", { n: d.days }),
      action: fileButton(d.period.key),
    })
  }

  for (const { check, n } of checkCounts) {
    if (!n) continue
    const text = CHECK_TEXT[check]
    items.push({
      key: check,
      tone: INFO_CHECKS.has(check) ? "info" : "warn",
      title: f.t(text.title, { n }),
      sub: f.t(text.sub),
      action: (
        <Button variant="ghost" size="sm" onClick={() => showInLedger(check)}>
          {f.t("overview.showThem")}
        </Button>
      ),
    })
  }

  const limitCtx = {
    entries: data.entries,
    cats: data.catMap,
    vatPeriod,
    today: data.today,
  }
  for (const limit of evaluate(VAT_LIMIT_RULES, limitCtx, [
    "vatThresholdOver",
    "vatThresholdNear",
    "vatThresholdBelow",
  ])) {
    items.push({
      key: "vatThreshold",
      tone: tone(limit.severity),
      ...vatThresholdText(f, limit.data as VatThreshold),
    })
  }

  for (const id of ["billsOverdue", "billsDueSoon"] as const) {
    for (const { severity, data: d } of overview(id)) {
      items.push({
        key: id,
        tone: tone(severity),
        title: f.t(
          id === "billsOverdue"
            ? "overview.billsOverdue"
            : "overview.billsDueSoon",
          { n: d.count }
        ),
        sub: f.t(
          id === "billsOverdue"
            ? "overview.billsOverdueSub"
            : "overview.billsDueSoonSub",
          { s: f.money(d.total), d: f.date(d.first) }
        ),
        action: (
          <ButtonLink variant="ghost" size="sm" href={INVOICE_ROUTES.payables}>
            {f.t("overview.showThem")}
          </ButtonLink>
        ),
      })
    }
  }

  for (const { severity, data: d } of overview("openItems")) {
    items.push({
      key: "openItems",
      tone: tone(severity),
      title: f.t("overview.openItems", { n: d.count }),
      sub: f.t("overview.openItemsSub", {
        r: f.money(d.receivables),
        p: f.money(d.payables),
      }),
      action: (
        <Button variant="ghost" size="sm" onClick={() => showInLedger("open")}>
          {f.t("overview.showThem")}
        </Button>
      ),
    })
  }

  for (const limit of evaluate(VAT_LIMIT_RULES, limitCtx, ["vatPeriodLimit"])) {
    items.push({
      key: "vatPeriodLimit",
      tone: tone(limit.severity),
      ...vatPeriodLimitText(f, limit.data as VatPeriodOverLimit),
    })
  }

  const bookLimitCtx = {
    entries: data.entries,
    cats: data.catMap,
    assetsOf: (y: number) =>
      form5Balance({
        entries: data.entries,
        cats: data.catMap,
        year: y,
        yearEnd: yearEnds[y] ?? EMPTY_YEAR_END,
        assetOpening,
        loanOpening,
      }).assets,
    today: data.today,
  }
  for (const limit of evaluate(BOOK_LIMIT_RULES, bookLimitCtx)) {
    const text = BOOK_LIMIT_TEXT[limit.ruleId as BookLimitRuleId]
    items.push({
      key: text.key,
      tone: tone(limit.severity),
      title: f.t(text.title, { y: limit.data.year }),
      sub: f.t(text.sub),
    })
  }

  for (const { severity, data: d } of overview("form5Due")) {
    items.push({
      key: "form5Due",
      tone: tone(severity),
      title: f.t("overview.form5Due", { y: d.taxYear }),
      sub: d.due
        ? f.t("overview.form5DueOn", { d: f.date(d.due) })
        : f.t("overview.form5DueUnknown"),
    })
  }

  for (const { severity, data: d } of overview("rulesStale")) {
    items.push({
      key: "rulesStale",
      tone: tone(severity),
      title: f.t("overview.rulesStale", { y: data.today.slice(0, 4) }),
      sub: f.t("overview.rulesStaleSub", {
        what: d.gaps.map((g) => f.t(RULE_GAP_TEXT[g])).join(", "),
        d: f.date(RULES.checkedOn),
      }),
    })
  }

  for (const { severity, data: d } of overview("missingReceipts")) {
    items.push({
      key: "missing",
      tone: tone(severity),
      title: f.t("overview.missingFiles", { n: d.count }),
      sub: f.t("overview.missingFilesSub"),
    })
  }

  for (const { severity, data: d } of overview("emptyMonths")) {
    items.push({
      key: "empty",
      tone: tone(severity),
      title: f.t("overview.emptyMonths", {
        m: d.months.map((m) => f.month(m - 1, true).toLowerCase()).join(", "),
      }),
      sub: f.t("overview.emptyMonthsSub"),
    })
  }

  for (const { severity, data: d } of overview("newYear")) {
    items.push({
      key: "newYear",
      tone: tone(severity),
      title: f.t("newYear.dueTitle", { y: d.year }),
      sub: f.t("newYear.dueSub"),
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDialog({ kind: "new-year", year: d.year })}
        >
          {f.t("newYear.start")}
        </Button>
      ),
    })
  }

  for (const { severity, data: d } of overview("recurringDue")) {
    items.push({
      key: "recurring",
      tone: tone(severity),
      title: f.t("recurring.dueTitle", { n: d.items.length }),
      sub: d.items.map((r) => r.description).join(", "),
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDialog({ kind: "recurring", month: d.month })}
        >
          {f.t("common.add")}
        </Button>
      ),
    })
  }

  for (const { severity, data: d } of overview("recurringDrafts")) {
    items.push({
      key: "recurring-drafts",
      tone: tone(severity),
      title: f.t("invoice.recurringDraftsTitle", { n: d.count }),
      sub: f.t("invoice.recurringDraftsSub"),
      action: (
        <ButtonLink variant="ghost" size="sm" href={APP_ROUTES.invoices}>
          {f.t("invoice.open")}
        </ButtonLink>
      ),
    })
  }

  /*
   * A reminder rather than a problem, so it stays out of the open count. The
   * file is the only real copy (§1), and it stays mutable after the year ends.
   */
  for (const { severity, data: d } of overview("yearToArchive")) {
    const y = d.year
    items.push({
      key: `archive-${y}`,
      tone: tone(severity),
      title: f.t("overview.yearClosed", { y }),
      sub: f.t("overview.yearClosedSub", {
        b: f.date(d.books),
        v: f.date(d.vouchers),
      }),
      action: (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void archiveClosedYear(ctx, y, data.today)}
          >
            {f.t("overview.yearArchive")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void exportRetentionPackage(ctx, y)}
          >
            {f.t("overview.yearPackage")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => archiveYear(y)}>
            {f.t("overview.yearStored")}
          </Button>
        </div>
      ),
    })
  }

  /*
   * Once per stage: the vouchers may go after 6 years, the books after 10
   * (KPL 2:10). Nothing is deleted from the book; the user decides what to
   * destroy of the copies they hold.
   */
  for (const { severity, data: d } of overview("retentionEnded")) {
    const y = d.year
    items.push({
      key: `retention-${y}-${d.stage}`,
      tone: tone(severity),
      title: f.t(
        d.stage === "books"
          ? "overview.retentionBooks"
          : "overview.retentionVouchers",
        { y }
      ),
      sub: f.t(
        d.stage === "books"
          ? "overview.retentionBooksSub"
          : "overview.retentionVouchersSub",
        { v: f.date(d.vouchers), b: f.date(d.books) }
      ),
      action: (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => noteRetention(y, d.stage)}
        >
          {f.t("overview.retentionNoted")}
        </Button>
      ),
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
