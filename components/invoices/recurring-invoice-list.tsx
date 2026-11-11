"use client"

import * as React from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { DateInput } from "@/components/common/date-input"
import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import {
  RECURRING_EVERY,
  type Invoice,
  type RecurringInvoice,
} from "@/lib/domain/invoice"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import {
  firstRecurringDate,
  recurringEnded,
  templateFromInvoice,
} from "@/lib/domain/invoice-draft"
import { everyLabel } from "@/lib/i18n/every-label"
import { useBookStore } from "@/stores/book-store"

/** Store the templates, keeping the rest of the invoice settings as they are. */
function setRecurring(recurring: RecurringInvoice[]) {
  const s = useBookStore.getState()
  s.setInvoiceSettings({ ...s.invoiceSettings, recurring })
}

/**
 * The recurring invoices (§8.27), at Laskut → Toistuvat. A template is made
 * from an invoice with its repeat button. When its next date comes, the app
 * makes a draft on opening; the draft is reviewed and issued like any other.
 */
export function RecurringInvoiceList() {
  const f = useFormatters()
  const recurring = useBookStore((s) => s.invoiceSettings.recurring)
  const invoices = useBookStore((s) => s.invoices)
  const [editing, setEditing] = React.useState<RecurringInvoice | null>(null)
  const sorted = [...recurring].sort(
    (a, b) =>
      f.collator.compare(a.customer.name, b.customer.name) ||
      a.next.localeCompare(b.next)
  )

  const remove = (template: RecurringInvoice) => {
    setRecurring(recurring.filter((r) => r.id !== template.id))
    const id = toast.add({
      title: f.t("invoice.recurringDeleted", { x: template.customer.name }),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState().invoiceSettings.recurring
          setRecurring([...now, template])
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("invoice.recurringTitle")}
      description={f.t("invoice.recurringHint")}
    >
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("invoice.recurringEmpty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.colCustomer")}</TableHead>
              <TableHead>{f.t("invoice.recurringColEvery")}</TableHead>
              <TableHead>{f.t("invoice.recurringColNext")}</TableHead>
              <TableHead className="text-right">
                {f.t("invoice.colAmount")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {f.t("invoice.recurringColMade")}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const made = invoices.filter((i) => i.recurring === r.id).length
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.customer.name || "–"}
                    <div className="max-w-64 truncate text-xs font-normal text-muted-foreground">
                      {r.rows.map((row) => row.description).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell>{everyLabel(f, r.every)}</TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {r.paused ? (
                      <Pill tone="neutral">
                        {f.t("invoice.recurringPaused")}
                      </Pill>
                    ) : recurringEnded(r) ? (
                      <Pill tone="neutral">
                        {f.t("invoice.recurringEnded")}
                      </Pill>
                    ) : (
                      f.date(r.next)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={invoiceTotals(r.rows, r.discount).gross} />
                  </TableCell>
                  <TableCell className="tabular hidden sm:table-cell">
                    {made}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("invoice.recurringEdit", {
                        x: r.customer.name,
                      })}
                      onClick={() => setEditing(r)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("invoice.recurringDelete", {
                        x: r.customer.name,
                      })}
                      onClick={() => remove(r)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {editing ? (
        <RecurringInvoiceDialog
          template={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  )
}

/**
 * Set a recurring invoice's schedule: a new one from `source`, or a change to
 * `template`. Its rows are the invoice's; to change them, make a new template
 * from an invoice that has the new rows.
 */
export function RecurringInvoiceDialog({
  source,
  template,
  onClose,
}: {
  source?: Invoice
  template?: RecurringInvoice
  onClose: () => void
}) {
  const f = useFormatters()
  const today = todayIso()
  const from = template ?? source
  const [every, setEvery] = React.useState(template?.every ?? 1)
  const [next, setNext] = React.useState(
    template?.next ?? (source ? firstRecurringDate(1, source.date, today) : "")
  )
  /* A start date the user has set stays put when the interval changes. */
  const nextTouched = React.useRef(template !== undefined)
  const [until, setUntil] = React.useState(template?.until ?? "")
  const [paused, setPaused] = React.useState(template?.paused ?? false)
  const [bad, setBad] = React.useState(false)
  const ids = { paused: React.useId() }
  if (!from) return null

  const untilBad = until !== "" && next !== "" && until < next
  const disabled = bad || next === "" || untilBad

  const changeEvery = (value: number) => {
    setEvery(value)
    if (!nextTouched.current && source)
      setNext(firstRecurringDate(value, source.date, today))
  }

  const save = () => {
    if (disabled) return
    const all = useBookStore.getState().invoiceSettings.recurring
    if (template) {
      const changed: RecurringInvoice = {
        ...template,
        every,
        day: Number(next.slice(8, 10)),
        next,
        until: until || null,
        paused,
      }
      setRecurring(all.map((r) => (r.id === template.id ? changed : r)))
    } else if (source) {
      setRecurring([
        ...all,
        templateFromInvoice(source, uid(), every, next, until || null),
      ])
    }
    /* A date that has come makes its draft at once, and that toast says so. */
    toast.add({
      title:
        next <= today
          ? f.t("invoice.recurringSavedNow")
          : f.t("invoice.recurringSaved", { d: f.date(next) }),
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t(template ? "invoice.recurringEditTitle" : "invoice.repeat")}
          </DialogTitle>
          <DialogDescription>
            {f.t("invoice.recurringDialogHint", {
              x: from.customer.name || "–",
              n: f.money(invoiceTotals(from.rows, from.discount).gross),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3">
          <Field className="w-44">
            <FieldLabel>{f.t("invoice.recurringColEvery")}</FieldLabel>
            <OptionSelect
              label={f.t("invoice.recurringColEvery")}
              value={String(every)}
              onChange={(v) => changeEvery(Number(v))}
              options={RECURRING_EVERY.map((n) => ({
                value: String(n),
                label: everyLabel(f, n),
              }))}
            />
          </Field>
          <Field className="w-44">
            <FieldLabel>{f.t("invoice.recurringColNext")}</FieldLabel>
            <DateInput
              value={next}
              onBadChange={setBad}
              onValueChange={(iso) => {
                nextTouched.current = true
                setNext(iso)
              }}
            />
          </Field>
          <Field className="w-44">
            <FieldLabel>{f.t("invoice.recurringUntil")}</FieldLabel>
            <DateInput
              value={until}
              onValueChange={setUntil}
              min={next || undefined}
            />
          </Field>
        </div>
        <FieldDescription>
          {next !== "" && next <= today
            ? f.t("invoice.recurringNowHint")
            : f.t("invoice.recurringDraftHint")}
        </FieldDescription>
        {template ? (
          <label
            htmlFor={ids.paused}
            className="flex items-center gap-2 text-sm"
          >
            <Checkbox
              id={ids.paused}
              checked={paused}
              onCheckedChange={(v) => setPaused(v === true)}
            />
            {f.t("invoice.recurringPause")}
          </label>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={disabled}>
            {f.t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
