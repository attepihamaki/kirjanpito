"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, FileOutputIcon } from "lucide-react"

import { DateInput } from "@/components/common/date-input"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { TotalCard } from "@/components/common/total-card"
import { PaymentFileDialog } from "@/components/invoices/payment-file-dialog"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { payBill } from "@/lib/commands/bulk-commands"
import { todayIso } from "@/lib/domain/dates"
import { formatIban } from "@/lib/domain/iban"
import { formatReference } from "@/lib/domain/invoice-reference"
import {
  PAYABLE_GROUPS,
  payablesReport,
  type Payable,
  type PayableGroup,
} from "@/lib/domain/payables"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

const GROUP_TONE = {
  overdue: "expense",
  soon: "neutral",
  later: "neutral",
  noDue: "neutral",
} as const satisfies Record<PayableGroup, "neutral" | "income" | "expense">

/** Ask on which day a bill was paid, then mark every part of it (§8.30). */
function PayDialog({ bill, onClose }: { bill: Payable; onClose: () => void }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const [on, setOn] = React.useState(todayIso)
  const [bad, setBad] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      if (await payBill(ctx, bill.entries, on)) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.t("payables.payTitle")}</DialogTitle>
          <DialogDescription>
            {f.t("payables.payDescription", {
              d: bill.lead.description || "–",
              n: f.money(bill.open),
            })}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t("payables.paidOn")}
          <DateInput value={on} onValueChange={setOn} onBadChange={setBad} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={bad || on === "" || busy} onClick={confirm}>
            {f.t("payables.pay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * How to pay a bill (§8.30): the payee's IBAN and the reference, each with a
 * copy button, and the virtual barcode when the details make one, which most
 * Finnish banks take in a single paste.
 */
function BillPaymentLine({ bill }: { bill: Payable }) {
  const f = useFormatters()
  if (!bill.iban && !bill.reference) return null

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: f.t("payables.copied", { x: what }) })
    } catch {
      toast.add({ title: f.t("common.formCopyFailed") })
    }
  }

  const parts: { label: string; shown: string; value: string }[] = []
  if (bill.iban) {
    parts.push({
      label: f.t("payables.iban"),
      shown: formatIban(bill.iban),
      value: bill.iban,
    })
  }
  if (bill.reference) {
    parts.push({
      label: f.t("payables.reference"),
      shown: formatReference(bill.reference),
      value: bill.reference,
    })
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {parts.map((p) => (
        <span key={p.label} className="inline-flex items-center gap-1">
          <span>{p.label}</span>
          <span className="font-mono text-foreground tabular-nums">
            {p.shown}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={f.t("payables.copy", { x: p.label })}
            onClick={() => copy(p.value, p.label)}
          >
            <CopyIcon />
          </Button>
        </span>
      ))}
      {bill.barcode ? (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copy(bill.barcode!, f.t("payables.barcode"))}
        >
          <CopyIcon data-icon="inline-start" />
          {f.t("payables.copyBarcode")}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Bills received and not yet paid (§8.30), the payables side of Saatavat: the
 * totals by when they fall due, then every bill, the one due first at the top.
 * A row opens its voucher, and "Maksa" asks for the day it was paid.
 */
export function PayablesList() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const openDialog = useBookStore((s) => s.openDialog)
  const [paying, setPaying] = React.useState<Payable | null>(null)
  /* The bills ticked for a payment file, by their lead entry's id. */
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(new Set())
  const [fileOf, setFileOf] = React.useState<Payable[] | null>(null)

  const report = React.useMemo(
    () => payablesReport(entries, indexCategories(cats), todayIso()),
    [entries, cats]
  )
  /* A bill paid or deleted since it was ticked drops out of the choice. */
  const chosen = report.items.filter((b) => picked.has(b.lead.id))
  const transferable = report.items.filter((b) => b.iban && b.open > 0)
  const allPicked =
    report.items.length > 0 && chosen.length === report.items.length
  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const heading: Record<PayableGroup, string> = {
    overdue: f.t("payables.overdue"),
    soon: f.t("payables.soon"),
    later: f.t("payables.later"),
    noDue: f.t("payables.noDue"),
  }

  const dueText = (bill: Payable) => {
    if (!bill.due) return "–"
    return bill.daysLate > 0
      ? f.t("payables.dueLate", { d: f.date(bill.due), n: bill.daysLate })
      : f.date(bill.due)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {PAYABLE_GROUPS.map((g) => (
          <TotalCard key={g} label={heading[g]}>
            <Money
              cents={report.totals[g]}
              tone={
                g === "overdue" && report.totals[g] > 0 ? "expense" : undefined
              }
            />
          </TotalCard>
        ))}
        <TotalCard label={f.t("payables.total")}>
          <Money cents={report.total} />
        </TotalCard>
      </div>

      {transferable.length ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {chosen.length
              ? f.t("payables.fileChosen", { n: chosen.length })
              : f.t("payables.fileAllWithIban", { n: transferable.length })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFileOf(chosen.length ? chosen : transferable)}
          >
            <FileOutputIcon data-icon="inline-start" />
            {f.t("payables.fileOpen")}
          </Button>
        </div>
      ) : null}

      <Panel>
        {report.items.length === 0 ? (
          <Empty>
            <EmptyDescription>{f.t("payables.empty")}</EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-px">
                  <Checkbox
                    aria-label={f.t("payables.filePickAll")}
                    checked={allPicked}
                    onCheckedChange={(checked) =>
                      setPicked(
                        checked === true
                          ? new Set(report.items.map((b) => b.lead.id))
                          : new Set()
                      )
                    }
                  />
                </TableHead>
                <TableHead>{f.t("payables.colDue")}</TableHead>
                <TableHead>{f.t("payables.colVoucher")}</TableHead>
                <TableHead>{f.t("payables.colDescription")}</TableHead>
                <TableHead className="text-right">
                  {f.t("payables.colAmount")}
                </TableHead>
                <TableHead className="w-px">
                  <span className="sr-only">{f.t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((bill) => (
                <TableRow key={bill.lead.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={f.t("payables.filePick", {
                        d: bill.lead.description || "–",
                      })}
                      checked={picked.has(bill.lead.id)}
                      onCheckedChange={(checked) =>
                        toggle(bill.lead.id, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className="tabular">{dueText(bill)}</span>
                      <Pill tone={GROUP_TONE[bill.group]}>
                        {heading[bill.group]}
                      </Pill>
                    </div>
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.t("payables.voucher", {
                      n: bill.lead.voucher ?? "–",
                      d: f.date(bill.lead.date),
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-left whitespace-normal"
                      onClick={() =>
                        openDialog({
                          kind: "entry",
                          mode: "edit",
                          entryId: bill.lead.id,
                        })
                      }
                    >
                      {bill.lead.description || "–"}
                    </Button>
                    <BillPaymentLine bill={bill} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Money cents={bill.open} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaying(bill)}
                      aria-label={`${f.t("payables.pay")}: ${bill.lead.description}`}
                    >
                      <CheckIcon data-icon="inline-start" />
                      {f.t("payables.pay")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {fileOf ? (
        <PaymentFileDialog
          bills={fileOf}
          onClose={() => {
            setFileOf(null)
            setPicked(new Set())
          }}
        />
      ) : null}

      {paying ? (
        <PayDialog bill={paying} onClose={() => setPaying(null)} />
      ) : null}
    </div>
  )
}
