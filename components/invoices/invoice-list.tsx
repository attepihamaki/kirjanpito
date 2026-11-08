"use client"

import * as React from "react"
import {
  CheckIcon,
  DownloadIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

import { DateInput } from "@/components/common/date-input"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
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
  downloadInvoicePdf,
  markInvoicePaid,
  sendInvoice,
  startCreditNote,
} from "@/lib/commands/invoice-commands"
import { todayIso } from "@/lib/domain/dates"
import type { Invoice } from "@/lib/domain/invoice"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import {
  invoiceStatus,
  openEntries,
  type InvoiceStatus,
} from "@/lib/domain/invoice-status"
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
  const [bad, setBad] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      const done = await markInvoicePaid(ctx, invoice.id, on)
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
          <Button disabled={bad || on === "" || busy} onClick={confirm}>
            {f.t("invoice.markPaid")}
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
                    {invoice.number ?? "–"}
                  </TableCell>
                  <TableCell>{invoice.customer.name || "–"}</TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(invoice.date)}
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={invoiceTotals(invoice.rows).gross} />
                  </TableCell>
                  <TableCell>
                    <Pill tone={STATUS_TONE[status]}>{label[status]}</Pill>
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
    </Panel>
  )
}
