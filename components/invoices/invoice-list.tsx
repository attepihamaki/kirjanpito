"use client"

import * as React from "react"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  BellIcon,
  BellOffIcon,
  FilePenLineIcon,
  PencilIcon,
  Repeat2Icon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

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
import { Empty, EmptyDescription } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { todayIso } from "@/lib/domain/dates"
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
import { useBookStore } from "@/stores/book-store"

const STATUS_TONE = {
  draft: "neutral",
  open: "neutral",
  overdue: "expense",
  paid: "income",
  credit: "neutral",
  credited: "neutral",
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

/** The invoices, newest first, with what can be done to each (§8.27). */
export function InvoiceList() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const invoices = useBookStore((s) => s.invoices)
  const entries = useBookStore((s) => s.entries)
  const setInvoices = useBookStore((s) => s.setInvoices)
  const openDialog = useBookStore((s) => s.openDialog)
  const [paying, setPaying] = React.useState<Invoice | null>(null)
  const [reminding, setReminding] = React.useState<Invoice | null>(null)
  const [repeating, setRepeating] = React.useState<Invoice | null>(null)

  const today = todayIso()
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const sorted = React.useMemo(() => [...invoices].sort(byNewest), [invoices])

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
  }

  return (
    <Panel>
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("invoice.empty")}</EmptyDescription>
          <EmptyDescription>{f.t("invoice.emptyHint")}</EmptyDescription>
        </Empty>
      ) : (
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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((invoice) => {
              const status = invoiceStatus(invoice, byId, today, invoices)
              const draft = status === "draft"
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="tabular font-medium">
                    {invoice.number ?? invoice.reservedNumber ?? "–"}
                  </TableCell>
                  <TableCell>{invoice.customer.name || "–"}</TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(invoice.date)}
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={
                        invoiceTotals(invoice.rows, invoice.discount).gross
                      }
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
                    {invoice.reminders?.length ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {f.t("invoice.remindersSent", {
                          n: invoice.reminders.length,
                          d: f.date(invoice.reminders.at(-1)!.date),
                        })}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${draft ? f.t("invoice.open") : f.t("invoice.view")}: ${invoice.number ?? invoice.customer.name}`}
                      onClick={() =>
                        openDialog({ kind: "invoice", invoiceId: invoice.id })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    {canCopy(invoice) ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("invoice.copy")}: ${invoice.number ?? invoice.customer.name}`}
                          onClick={() => {
                            const id = copyInvoice(invoice.id)
                            if (id)
                              openDialog({ kind: "invoice", invoiceId: id })
                          }}
                        >
                          <CopyIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("invoice.repeat")}: ${invoice.number ?? invoice.customer.name}`}
                          onClick={() => setRepeating(invoice)}
                        >
                          <Repeat2Icon />
                        </Button>
                      </>
                    ) : null}
                    {draft ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("invoice.deleteDraft")}
                        onClick={() => deleteDraft(invoice)}
                      >
                        <Trash2Icon />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("invoice.send")}: ${invoice.number}`}
                          onClick={() => void sendInvoice(ctx, invoice)}
                        >
                          <SendIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("invoice.download")}: ${invoice.number}`}
                          onClick={() => void downloadInvoicePdf(ctx, invoice)}
                        >
                          <DownloadIcon />
                        </Button>
                        {invoice.credits === null && status !== "credited" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.credit")}: ${invoice.number}`}
                            onClick={() => {
                              const id = startCreditNote(ctx, invoice.id)
                              if (id)
                                openDialog({ kind: "invoice", invoiceId: id })
                            }}
                          >
                            <Undo2Icon />
                          </Button>
                        ) : null}
                        {invoice.credits === null && status !== "credited" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.reopenIssued")}: ${invoice.number}`}
                            onClick={async () => {
                              const id = await reopenIssuedInvoice(
                                ctx,
                                invoice.id
                              )
                              if (id)
                                openDialog({ kind: "invoice", invoiceId: id })
                            }}
                          >
                            <FilePenLineIcon />
                          </Button>
                        ) : null}
                        {invoice.credits === null && status !== "credited" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.deleteIssued")}: ${invoice.number}`}
                            onClick={() =>
                              void deleteIssuedInvoice(ctx, invoice.id)
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        ) : null}
                        {status === "overdue" && invoice.credits === null ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.reminder")}: ${invoice.number}`}
                            onClick={() => setReminding(invoice)}
                          >
                            <BellIcon />
                          </Button>
                        ) : null}
                        {openCharges(invoice, byId).length > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.waive")}: ${invoice.number}`}
                            title={f.t("invoice.waive")}
                            onClick={() =>
                              void waiveReminderCharges(ctx, invoice.id)
                            }
                          >
                            <BellOffIcon />
                          </Button>
                        ) : null}
                        {openEntries(invoice, byId).length > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${f.t("invoice.markPaid")}: ${invoice.number}`}
                            onClick={() => setPaying(invoice)}
                          >
                            <CheckIcon />
                          </Button>
                        ) : null}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
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
    </Panel>
  )
}
