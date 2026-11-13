"use client"

import * as React from "react"
import { EllipsisIcon, PlusIcon } from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { SETTINGS_ROUTES } from "@/lib/site"

import { DateInput } from "@/components/common/date-input"
import { EuroInput } from "@/components/common/euro-input"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { RecurringInvoiceDialog } from "@/components/invoices/recurring-invoice-list"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  copyInvoice,
  deleteIssuedInvoice,
  downloadInvoicePdf,
  makeReminder,
  waiveReminderCharges,
  recordInvoicePayment,
  reopenIssuedInvoice,
  sendInvoice,
  startCreditNote,
} from "@/lib/commands/invoice-commands"
import { evalAmount } from "@/lib/domain/amount-expr"
import { calcEntry } from "@/lib/domain/calc"
import { daysBetween, todayIso, yearOf } from "@/lib/domain/dates"
import type { Invoice } from "@/lib/domain/invoice"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import { canCopy } from "@/lib/domain/invoice-draft"
import {
  interestBasis,
  openCharges,
  reminderFigures,
  reminderRate,
} from "@/lib/domain/invoice-reminder"
import { owedOn, partlyPaid } from "@/lib/domain/invoice-payment"
import {
  invoiceStatus,
  openEntries,
  type InvoiceStatus,
} from "@/lib/domain/invoice-status"
import { formatMoneyPlain } from "@/lib/domain/money"
import { ownClick } from "@/lib/ui/row-click"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const STATUS_TONE = {
  draft: "neutral",
  open: "neutral",
  overdue: "expense",
  paid: "income",
  credit: "neutral",
  credited: "neutral",
  creditLoss: "expense",
} as const satisfies Record<InvoiceStatus, "neutral" | "income" | "expense">

/** Newest first: drafts at the top, then issued invoices by number. */
function byNewest(a: Invoice, b: Invoice): number {
  if (a.number === null && b.number === null)
    return b.date.localeCompare(a.date)
  if (a.number === null) return -1
  if (b.number === null) return 1
  return b.number - a.number
}

/** Ask on which day an invoice was paid, then mark all its entries (§8.27). */
function MarkPaidDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice
  onClose: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const [on, setOn] = React.useState(() => {
    const today = todayIso()
    return today < invoice.date ? invoice.date : today
  })
  const entries = useBookStore((s) => s.entries)
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const owed = owedOn(invoice, byId)
  const [amount, setAmount] = React.useState(formatMoneyPlain(owed))
  const [bad, setBad] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const cents = evalAmount(amount)
  const amountBad = cents == null || cents <= 0 || cents > owed

  const confirm = async () => {
    if (cents == null || amountBad) return
    setBusy(true)
    try {
      const done = await recordInvoicePayment(ctx, invoice.id, cents, on)
      if (done) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t("invoice.viewTitle", { n: invoice.number ?? 0 })}
          </DialogTitle>
          <DialogDescription>{f.t("invoice.markPaid")}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("invoice.paidAmount")}
          <EuroInput
            value={amount}
            aria-invalid={amountBad}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="text-xs font-normal text-muted-foreground">
            {f.t("invoice.paidAmountHint", { n: f.money(owed) })}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("invoice.paidOn")}
          <DateInput
            value={on}
            onValueChange={setOn}
            onBadChange={setBad}
            min={invoice.date}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button
            disabled={bad || on === "" || amountBad || busy}
            onClick={confirm}
          >
            {f.t("invoice.markPaid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Ask for the day, fee and rate of a payment reminder, then make it (§8.27). */
function ReminderDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice
  onClose: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const settings = useBookStore((s) => s.invoiceSettings)
  const entries = useBookStore((s) => s.entries)
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const owed = owedOn(invoice, byId)
  const basis = interestBasis(invoice, byId)
  const [on, setOn] = React.useState(todayIso())
  const [bad, setBad] = React.useState(false)
  const [fee, setFee] = React.useState(formatMoneyPlain(settings.reminderFee))
  const stored = reminderRate(settings, on)
  const [rate, setRate] = React.useState<string | null>(null)
  const rateText =
    rate ?? (stored === null ? "" : String(stored).replace(".", ","))
  const rateValue = Number(rateText.replace(",", "."))
  const rateBad =
    rateText.trim() === "" || !(rateValue >= 0 && rateValue <= 100)
  const feeCents = evalAmount(fee)
  const figures =
    !rateBad && feeCents != null && feeCents >= 0 && !bad && on !== ""
      ? reminderFigures(invoice, owed, on, rateValue, feeCents, basis)
      : null
  const [busy, setBusy] = React.useState(false)

  const make = async () => {
    if (!figures) return
    setBusy(true)
    try {
      if (await makeReminder(ctx, invoice.id, figures, on)) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t("invoice.viewTitle", { n: invoice.number ?? 0 })}
          </DialogTitle>
          <DialogDescription>{f.t("invoice.reminder")}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("invoice.reminderDate")}
          <DateInput
            value={on}
            onValueChange={setOn}
            onBadChange={setBad}
            min={invoice.dueDate}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("invoice.reminderRate")}
          <Input
            inputMode="decimal"
            value={rateText}
            aria-invalid={rateBad}
            onChange={(e) => setRate(e.target.value)}
          />
          {stored === null && rate === null ? (
            <span className="text-xs font-normal text-warning">
              {f.t("invoice.reminderNoRate")}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("invoice.reminderFee")}
          <EuroInput
            value={fee}
            aria-invalid={feeCents == null}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        {figures ? (
          <p className="text-sm text-muted-foreground">
            {f.t("invoice.reminderSummary", {
              open: f.money(figures.open),
              interest: f.money(figures.interest),
              days: figures.days,
              fee: f.money(figures.fee),
              total: f.money(figures.total),
              due: f.date(figures.newDueDate),
            })}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {f.t("invoice.reminderBooked")}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={!figures || busy} onClick={make}>
            {f.t("invoice.reminderCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Filter = "all" | "open" | "paid" | "draft"

/** Which filter tab an invoice of a status falls under, besides "all". */
const FILTER_OF: Record<InvoiceStatus, Filter | null> = {
  draft: "draft",
  open: "open",
  overdue: "open",
  paid: "paid",
  credit: null,
  credited: null,
  creditLoss: "paid",
}

/** The invoices, newest first, with what can be done to each (§8.27). */
export function InvoiceList() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const invoices = useBookStore((s) => s.invoices)
  const entries = useBookStore((s) => s.entries)
  const year = useBookStore((s) => s.year)
  const setInvoices = useBookStore((s) => s.setInvoices)
  const openDialog = useBookStore((s) => s.openDialog)
  /* An invoice cannot be issued without the seller's address and account (§8.27). */
  const sellerReady = useBookStore(
    (s) => s.invoiceSettings.street !== "" && s.invoiceSettings.iban !== ""
  )
  const [paying, setPaying] = React.useState<Invoice | null>(null)
  const [reminding, setReminding] = React.useState<Invoice | null>(null)
  const [repeating, setRepeating] = React.useState<Invoice | null>(null)
  const [picked, setFilter] = React.useState<Filter>("all")

  const today = todayIso()
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const rows = React.useMemo(
    () =>
      [...invoices].sort(byNewest).map((invoice) => ({
        invoice,
        status: invoiceStatus(invoice, byId, today, invoices),
      })),
    [invoices, byId, today]
  )
  const counts = { all: rows.length, open: 0, paid: 0, draft: 0 }
  for (const { status } of rows) {
    const kind = FILTER_OF[status]
    if (kind) counts[kind] += 1
  }
  /* The drafts tab shows only while there are drafts, so its filter falls back to all. */
  const filter = picked === "draft" && counts.draft === 0 ? "all" : picked
  const shown =
    filter === "all" ? rows : rows.filter((r) => FILTER_OF[r.status] === filter)

  let owed = 0
  let late = false
  let paidInYear = 0
  for (const { invoice, status } of rows) {
    if (status === "open" || status === "overdue") {
      owed += owedOn(invoice, byId)
      late ||= status === "overdue"
    }
    if (invoice.number === null) continue
    for (const id of invoice.entryIds) {
      const e = byId.get(id)
      if (!e || e.paidOn === null) continue
      if (yearOf(e.paidOn ?? e.date) === year) paidInYear += calcEntry(e).gross
    }
  }

  const deleteDraft = (draft: Invoice) => {
    setInvoices(invoices.filter((i) => i.id !== draft.id))
    const id = toast.add({
      title: f.t("invoice.draftDeleted"),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState()
          now.setInvoices([...now.invoices, draft])
        },
      },
    })
  }

  const label: Record<InvoiceStatus, string> = {
    draft: f.t("invoice.statusDraft"),
    open: f.t("invoice.statusOpen"),
    overdue: f.t("invoice.statusOverdue"),
    paid: f.t("invoice.statusPaid"),
    credit: f.t("invoice.statusCredit"),
    credited: f.t("invoice.statusCredited"),
    creditLoss: f.t("invoice.statusCreditLoss"),
  }

  const open = (invoice: Invoice) =>
    openDialog({ kind: "invoice", invoiceId: invoice.id })

  if (rows.length === 0)
    return (
      <Panel>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{f.t("invoice.empty")}</EmptyTitle>
            <EmptyDescription>
              {f.t(
                sellerReady ? "invoice.emptyHint" : "invoice.emptyNeedsSeller"
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {sellerReady ? null : (
              <ol className="flex flex-col gap-2 text-left text-sm">
                {(
                  [
                    "invoice.emptyStepSeller",
                    "invoice.emptyStepInvoice",
                  ] as const
                ).map((step, i) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="tabular grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {f.t(step)}
                  </li>
                ))}
              </ol>
            )}
            {sellerReady ? (
              <Button
                onClick={() => openDialog({ kind: "invoice", invoiceId: null })}
              >
                <PlusIcon data-icon="inline-start" />
                {f.t("invoice.new")}
              </Button>
            ) : (
              <ButtonLink href={SETTINGS_ROUTES.invoicing}>
                {f.t("invoice.emptyAddSeller")}
              </ButtonLink>
            )}
          </EmptyContent>
        </Empty>
      </Panel>
    )

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: f.t("invoice.filterAll") },
    { id: "open", label: f.t("invoice.filterOpen") },
    { id: "paid", label: f.t("invoice.filterPaid") },
    ...(counts.draft > 0
      ? [{ id: "draft" as const, label: f.t("invoice.filterDraft") }]
      : []),
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label={f.t("invoice.colStatus")}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
                <span className="tabular text-xs font-normal text-muted-foreground">
                  {counts[tab.id]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">
          {f.t("invoice.sumOpen")}{" "}
          <Money
            cents={owed}
            className={cn(
              "font-semibold",
              late ? "text-expense" : "text-foreground"
            )}
          />
          <span aria-hidden="true"> · </span>
          {f.t("invoice.sumPaid", { y: year })}{" "}
          <Money cents={paidInYear} className="font-semibold text-foreground" />
        </p>
      </div>
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.colNumber")}</TableHead>
              <TableHead>{f.t("invoice.colCustomer")}</TableHead>
              <TableHead>{f.t("invoice.colDate")}</TableHead>
              <TableHead>{f.t("invoice.colDue")}</TableHead>
              <TableHead className="text-right">
                {f.t("invoice.colAmount")}
              </TableHead>
              <TableHead>{f.t("invoice.colStatus")}</TableHead>
              <TableHead>
                <span className="sr-only">{f.t("invoice.colActions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(({ invoice, status }) => {
              const draft = status === "draft"
              const overdue = status === "overdue"
              const name = String(invoice.number ?? invoice.customer.name)
              const unpaid = !draft && openEntries(invoice, byId).length > 0
              const live = invoice.credits === null && status !== "credited"
              const remind = overdue && invoice.credits === null
              const charges = openCharges(invoice, byId).length > 0
              return (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    "cursor-pointer",
                    overdue && "bg-muted/50 hover:bg-muted"
                  )}
                  onClick={(e) => {
                    if (!ownClick(e)) open(invoice)
                  }}
                >
                  <TableCell className="tabular font-medium">
                    <button
                      type="button"
                      className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`${f.t("invoice.openInvoice")}: ${name}`}
                      onClick={() => open(invoice)}
                    >
                      {invoice.number ?? invoice.reservedNumber ?? "–"}
                    </button>
                  </TableCell>
                  <TableCell>
                    {invoice.customerId ? (
                      <button
                        type="button"
                        className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() =>
                          openDialog({
                            kind: "party",
                            partyId: invoice.customerId!,
                          })
                        }
                      >
                        {invoice.customer.name || "–"}
                      </button>
                    ) : (
                      invoice.customer.name || "–"
                    )}
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(invoice.date)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular whitespace-nowrap",
                      status === "paid" && "text-muted-foreground"
                    )}
                  >
                    {f.date(invoice.dueDate)}
                    {overdue ? (
                      <span className="text-xs text-expense">
                        {" · "}
                        {f.t("payables.daysLate", {
                          n: daysBetween(invoice.dueDate, today),
                        })}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={
                        invoiceTotals(invoice.rows, invoice.discount).gross
                      }
                      className={overdue ? "font-semibold" : undefined}
                    />
                    {partlyPaid(invoice, byId) ? (
                      <div className="text-xs text-muted-foreground">
                        {f.t("invoice.stillOwed", {
                          n: f.money(owedOn(invoice, byId)),
                        })}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Pill tone={STATUS_TONE[status]}>{label[status]}</Pill>
                    {draft && invoice.recurring ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {f.t("invoice.fromRecurring")}
                      </div>
                    ) : null}
                    {invoice.kind === "advance" ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {f.t("invoice.advanceBadge")}
                      </div>
                    ) : null}
                    {invoice.reminders?.length ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {f.t("invoice.remindersSent", {
                          n: invoice.reminders.length,
                          d: f.date(invoice.reminders.at(-1)!.date),
                        })}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {draft ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => open(invoice)}
                        >
                          {f.t("invoice.continueDraft")}
                        </Button>
                      ) : unpaid ? (
                        <>
                          {remind ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`${f.t("invoice.reminder")}: ${name}`}
                              onClick={() => setReminding(invoice)}
                            >
                              {f.t("invoice.reminder")}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            aria-label={`${f.t("invoice.markPaid")}: ${name}`}
                            onClick={() => setPaying(invoice)}
                          >
                            {f.t("invoice.markPaid")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${f.t("invoice.download")}: ${name}`}
                          onClick={() => void downloadInvoicePdf(ctx, invoice)}
                        >
                          {f.t("invoice.download")}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${f.t("invoice.moreActions")}: ${name}`}
                            />
                          }
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => open(invoice)}>
                              {f.t("invoice.openInvoice")}
                            </DropdownMenuItem>
                            {draft ? null : (
                              <DropdownMenuItem
                                onClick={() => void sendInvoice(ctx, invoice)}
                              >
                                {f.t("invoice.send")}
                              </DropdownMenuItem>
                            )}
                            {!draft && unpaid ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  void downloadInvoicePdf(ctx, invoice)
                                }
                              >
                                {f.t("invoice.download")}
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuGroup>
                          {canCopy(invoice) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const id = copyInvoice(invoice.id)
                                    if (id)
                                      openDialog({
                                        kind: "invoice",
                                        invoiceId: id,
                                      })
                                  }}
                                >
                                  {f.t("invoice.copy")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setRepeating(invoice)}
                                >
                                  {f.t("invoice.repeat")}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </>
                          ) : null}
                          {!draft && (live || charges) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                {live ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const id = startCreditNote(
                                        ctx,
                                        invoice.id
                                      )
                                      if (id)
                                        openDialog({
                                          kind: "invoice",
                                          invoiceId: id,
                                        })
                                    }}
                                  >
                                    {f.t("invoice.credit")}
                                  </DropdownMenuItem>
                                ) : null}
                                {live ? (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const id = await reopenIssuedInvoice(
                                        ctx,
                                        invoice.id
                                      )
                                      if (id)
                                        openDialog({
                                          kind: "invoice",
                                          invoiceId: id,
                                        })
                                    }}
                                  >
                                    {f.t("invoice.reopenIssued")}
                                  </DropdownMenuItem>
                                ) : null}
                                {charges ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void waiveReminderCharges(ctx, invoice.id)
                                    }
                                  >
                                    {f.t("invoice.waive")}
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuGroup>
                            </>
                          ) : null}
                          {unpaid && invoice.credits === null ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  openDialog({
                                    kind: "credit-loss",
                                    entryId: openEntries(invoice, byId)[0].id,
                                  })
                                }
                              >
                                {f.t("entry.creditLossAction")}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {draft || live ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  draft
                                    ? deleteDraft(invoice)
                                    : void deleteIssuedInvoice(ctx, invoice.id)
                                }
                              >
                                {f.t(
                                  draft
                                    ? "invoice.deleteDraft"
                                    : "invoice.deleteIssued"
                                )}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {f.t("invoice.filterEmpty")}
          </p>
        ) : null}
      </Panel>
      {paying ? (
        <MarkPaidDialog invoice={paying} onClose={() => setPaying(null)} />
      ) : null}
      {repeating ? (
        <RecurringInvoiceDialog
          source={repeating}
          onClose={() => setRepeating(null)}
        />
      ) : null}
      {reminding ? (
        <ReminderDialog
          invoice={reminding}
          onClose={() => setReminding(null)}
        />
      ) : null}
    </div>
  )
}
