"use client"

import * as React from "react"
import { DownloadIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react"

import { AmountInput } from "@/components/common/amount-input"
import { DateInput } from "@/components/common/date-input"
import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { PartyFields } from "@/components/invoices/party-fields"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  downloadInvoicePdf,
  issueInvoice,
  sendInvoice,
} from "@/lib/commands/invoice-commands"
import { categoryLabel, lineOf } from "@/lib/domain/accounts"
import { evalAmount } from "@/lib/domain/amount-expr"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import {
  emptyParty,
  type Customer,
  type Invoice,
  type InvoiceLang,
  type InvoiceRow,
} from "@/lib/domain/invoice"
import { addDays } from "@/lib/domain/dates"
import { invoiceTotals, rowNet } from "@/lib/domain/invoice-calc"
import { formatQuantity, parseQuantity } from "@/lib/domain/invoice-input"
import { formatMoneyPlain } from "@/lib/domain/money"
import { rateOnDate, validRates } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"

/** The default income category of a new row. */
const DEFAULT_CAT = "300-domestic"

/** An invoice row as it is typed, before it is read into numbers. */
interface RowDraft {
  key: string
  description: string
  quantity: string
  unit: string
  price: string
  vatRate: number
  catId: string
}

function blankRow(
  date: string,
  catId = DEFAULT_CAT,
  rate = 25.5,
  credit = false
): RowDraft {
  return {
    key: uid(),
    description: "",
    quantity: credit ? "-1" : "1",
    unit: "",
    price: "",
    vatRate: rateOnDate(rate, date),
    catId,
  }
}

function toDraft(row: InvoiceRow): RowDraft {
  return {
    key: uid(),
    description: row.description,
    quantity: formatQuantity(row.quantityMilli),
    unit: row.unit,
    price: formatMoneyPlain(row.unitCents),
    vatRate: row.vatRate,
    catId: row.catId,
  }
}

/** A row with nothing typed in it, which is dropped rather than refused. */
const isBlank = (r: RowDraft) =>
  r.description.trim() === "" && r.price.trim() === ""

/** The row as numbers, or null when its quantity or price cannot be read. */
function toRow(draft: RowDraft, credit: boolean): InvoiceRow | null {
  const quantityMilli = parseQuantity(draft.quantity, credit)
  const unitCents = evalAmount(draft.price)
  if (quantityMilli === null || unitCents === null || unitCents < 0) return null
  return {
    description: draft.description.trim(),
    quantityMilli,
    unit: draft.unit.trim(),
    unitCents,
    vatRate: draft.vatRate,
    catId: draft.catId,
  }
}

/** Open the dialog for a new draft, a draft or an issued invoice (§8.27). */
export function InvoiceDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "invoice") return null
  return <InvoiceForm invoiceId={dialog.invoiceId} />
}

function InvoiceForm({ invoiceId }: { invoiceId: string | null }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const invoices = useBookStore((s) => s.invoices)
  const customers = useBookStore((s) => s.customers)
  const settings = useBookStore((s) => s.invoiceSettings)
  const cats = useBookStore((s) => s.cats)
  const setInvoices = useBookStore((s) => s.setInvoices)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const closeDialog = useBookStore((s) => s.closeDialog)

  /* A new draft keeps one id however often it is saved, so saving twice is one draft. */
  const [newId] = React.useState(() => uid())
  const draftId = invoiceId ?? newId
  const existing = invoices.find((i) => i.id === draftId)
  const issued = existing !== undefined && existing.number !== null
  /* A credit note takes negative quantities and has no due date. */
  const credit = existing?.credits != null
  const credited = invoices.find((i) => i.id === existing?.credits)

  const [date, setDate] = React.useState(existing?.date ?? todayIso())
  const [dueDate, setDueDate] = React.useState(
    existing?.dueDate ?? addDays(todayIso(), settings.termDays)
  )
  /* A due date the user has set stays put when the customer or the date changes. */
  const dueTouched = React.useRef(existing !== undefined)
  const [supplyFrom, setSupplyFrom] = React.useState(existing?.supplyFrom ?? "")
  const [supplyTo, setSupplyTo] = React.useState(existing?.supplyTo ?? "")
  const [language, setLanguage] = React.useState<InvoiceLang>(
    existing?.language ?? f.lang
  )
  const [customerId, setCustomerId] = React.useState<string | null>(
    existing?.customerId ?? null
  )
  const [party, setParty] = React.useState(existing?.customer ?? emptyParty())
  const [saveCustomer, setSaveCustomer] = React.useState(false)
  const [rows, setRows] = React.useState<RowDraft[]>(() =>
    existing && existing.rows.length > 0
      ? existing.rows.map(toDraft)
      : [blankRow(existing?.date ?? todayIso(), undefined, undefined, credit)]
  )
  const [note, setNote] = React.useState(existing?.note ?? "")
  const [showErrors, setShowErrors] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const ids = { note: React.useId(), language: React.useId() }

  const incomeCats = cats.filter(
    (c) => c.enabled && c.kind === "domestic" && lineOf(c)?.side === "income"
  )
  const rateOptions = validRates(date)
  const rowErrors = rows.map((r) => !isBlank(r) && toRow(r, credit) === null)
  const readRows = rows
    .filter((r) => !isBlank(r))
    .flatMap((r) => {
      const row = toRow(r, credit)
      return row ? [row] : []
    })
  const totals = invoiceTotals(readRows)
  const nameMissing = party.name.trim() === ""

  const changeDate = (iso: string) => {
    setDate(iso)
    if (credit) {
      setDueDate(iso)
    } else if (!dueTouched.current && iso) {
      const customer = customers.find((c) => c.id === customerId)
      setDueDate(addDays(iso, customer?.termDays ?? settings.termDays))
    }
  }

  const pickCustomer = (id: string) => {
    if (id === "") {
      setCustomerId(null)
      return
    }
    const customer = customers.find((c) => c.id === id)
    if (!customer) return
    setCustomerId(id)
    setParty({
      name: customer.name,
      street: customer.street,
      postcode: customer.postcode,
      city: customer.city,
      country: customer.country,
      vatId: customer.vatId,
      email: customer.email,
    })
    setLanguage(customer.language)
    if (!dueTouched.current && date) {
      setDueDate(addDays(date, customer.termDays ?? settings.termDays))
    }
  }

  const patchRow = (key: string, patch: Partial<RowDraft>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  /** Store the invoice as a draft. Returns it, or null while the rows cannot be read. */
  const saveDraft = (): Invoice | null => {
    if (rowErrors.some(Boolean)) {
      setShowErrors(true)
      return null
    }
    let register = customerId
    if (saveCustomer && register === null && !nameMissing) {
      const customer: Customer = {
        ...party,
        name: party.name.trim(),
        country: party.country.trim().toUpperCase() || "FI",
        vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
        id: uid(),
        language,
        termDays: null,
      }
      setCustomers([...useBookStore.getState().customers, customer])
      register = customer.id
      setCustomerId(register)
    }
    const draft: Invoice = {
      id: draftId,
      number: null,
      date,
      dueDate,
      supplyFrom: supplyFrom || null,
      supplyTo: supplyFrom ? supplyTo || null : null,
      customerId: register,
      customer: {
        ...party,
        name: party.name.trim(),
        country: party.country.trim().toUpperCase() || "FI",
        vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
      },
      language,
      rows: readRows,
      note: note.trim(),
      terms: "",
      reference: null,
      seller: null,
      issuedAt: null,
      entryIds: [],
      credits: existing?.credits ?? null,
    }
    const all = useBookStore.getState().invoices
    setInvoices(
      existing
        ? all.map((i) => (i.id === draft.id ? draft : i))
        : [...all, draft]
    )
    return draft
  }

  const save = () => {
    if (!saveDraft()) return
    toast.add({ title: f.t("invoice.draftSaved") })
    closeDialog()
  }

  const issue = async () => {
    const draft = saveDraft()
    if (!draft) return
    setBusy(true)
    try {
      if (await issueInvoice(ctx, draft.id)) closeDialog()
    } finally {
      setBusy(false)
    }
  }

  const title = issued
    ? f.t(credit ? "invoice.creditViewTitle" : "invoice.viewTitle", {
        n: existing.number ?? 0,
      })
    : f.t(credit ? "invoice.creditDraftTitle" : "invoice.draftTitle")

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="px-5 pt-4 pb-3">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4">
          {issued ? (
            <p className="text-sm text-muted-foreground">
              {f.t("invoice.issuedLocked")}
            </p>
          ) : null}
          {credit ? (
            <div className="flex flex-col gap-1 text-sm">
              {credited?.number != null ? (
                <p className="font-medium">
                  {f.t("invoice.credits", { n: credited.number })}
                </p>
              ) : null}
              {!issued ? (
                <p className="text-muted-foreground">
                  {f.t("invoice.creditHint")}
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{f.t("invoice.customer")}</h3>
            {!issued ? (
              <Field className="max-w-xs">
                <OptionSelect
                  label={f.t("invoice.customer")}
                  value={customerId ?? ""}
                  onChange={pickCustomer}
                  options={[
                    { value: "", label: f.t("invoice.customerTyped") },
                    ...[...customers]
                      .sort((a, b) => f.collator.compare(a.name, b.name))
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </Field>
            ) : null}
            <PartyFields
              value={party}
              onChange={setParty}
              disabled={issued}
              invalidName={showErrors && nameMissing}
            />
            {!issued && customerId === null ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={saveCustomer}
                  onCheckedChange={(v) => setSaveCustomer(v === true)}
                />
                {f.t("invoice.saveCustomer")}
              </label>
            ) : null}
          </section>

          <section className="flex flex-wrap gap-3">
            <Field className="w-44">
              <FieldLabel>{f.t("invoice.date")}</FieldLabel>
              <DateInput
                value={date}
                onValueChange={changeDate}
                disabled={issued}
              />
            </Field>
            {credit ? null : (
              <Field className="w-44">
                <FieldLabel>{f.t("invoice.dueDate")}</FieldLabel>
                <DateInput
                  value={dueDate}
                  onValueChange={(iso) => {
                    dueTouched.current = true
                    setDueDate(iso)
                  }}
                  disabled={issued}
                />
              </Field>
            )}
            <Field className="w-44">
              <FieldLabel htmlFor={ids.language}>
                {f.t("invoice.language")}
              </FieldLabel>
              <OptionSelect
                label={f.t("invoice.language")}
                value={language}
                disabled={issued}
                onChange={(v) => setLanguage(v as InvoiceLang)}
                options={[
                  { value: "fi", label: "Suomi" },
                  { value: "en", label: "English" },
                ]}
              />
            </Field>
          </section>

          <section className="flex flex-wrap gap-3">
            <Field className="w-44">
              <FieldLabel>{f.t("invoice.supplyFrom")}</FieldLabel>
              <DateInput
                value={supplyFrom}
                onValueChange={setSupplyFrom}
                disabled={issued}
              />
            </Field>
            <Field className="w-44">
              <FieldLabel>{f.t("invoice.supplyTo")}</FieldLabel>
              <DateInput
                value={supplyTo}
                onValueChange={setSupplyTo}
                disabled={issued || supplyFrom === ""}
                min={supplyFrom || undefined}
              />
            </Field>
            <FieldDescription className="self-end pb-2">
              {f.t("invoice.supplyHint")}
            </FieldDescription>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{f.t("invoice.rows")}</h3>
            {rows.map((row, index) => {
              const parsed = toRow(row, credit)
              const bad = showErrors && rowErrors[index]
              return (
                <div
                  key={row.key}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`${f.t("invoice.rowDescription")} ${index + 1}`}
                      placeholder={f.t("invoice.rowDescription")}
                      disabled={issued}
                      aria-invalid={bad || undefined}
                      value={row.description}
                      onChange={(e) =>
                        patchRow(row.key, { description: e.target.value })
                      }
                    />
                    {!issued ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("invoice.removeRow", { n: index + 1 })}
                        disabled={rows.length === 1}
                        onClick={() =>
                          setRows((list) =>
                            list.filter((r) => r.key !== row.key)
                          )
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Field className="w-20">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowQuantity")}
                      </FieldLabel>
                      <Input
                        inputMode="decimal"
                        className="tabular text-right"
                        disabled={issued}
                        aria-invalid={bad || undefined}
                        value={row.quantity}
                        onChange={(e) =>
                          patchRow(row.key, { quantity: e.target.value })
                        }
                      />
                    </Field>
                    <Field className="w-16">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowUnit")}
                      </FieldLabel>
                      <Input
                        disabled={issued}
                        value={row.unit}
                        onChange={(e) =>
                          patchRow(row.key, { unit: e.target.value })
                        }
                      />
                    </Field>
                    <Field className="w-28">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowPrice")}
                      </FieldLabel>
                      <AmountInput
                        className="text-right"
                        disabled={issued}
                        aria-invalid={bad || undefined}
                        value={row.price}
                        onChange={(e) =>
                          patchRow(row.key, { price: e.target.value })
                        }
                      />
                    </Field>
                    <Field className="w-24">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowVat")}
                      </FieldLabel>
                      <OptionSelect
                        label={f.t("invoice.rowVat")}
                        disabled={issued}
                        value={String(row.vatRate)}
                        onChange={(v) =>
                          patchRow(row.key, { vatRate: Number(v) })
                        }
                        options={(rateOptions.includes(row.vatRate)
                          ? rateOptions
                          : [...rateOptions, row.vatRate]
                        ).map((r) => ({ value: String(r), label: f.rate(r) }))}
                      />
                    </Field>
                    <Field className="min-w-36 flex-1">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowCategory")}
                      </FieldLabel>
                      <OptionSelect
                        label={f.t("invoice.rowCategory")}
                        disabled={issued}
                        value={row.catId}
                        onChange={(v) => patchRow(row.key, { catId: v })}
                        options={(incomeCats.some((c) => c.id === row.catId)
                          ? incomeCats
                          : [
                              ...incomeCats,
                              ...cats.filter((c) => c.id === row.catId),
                            ]
                        ).map((c) => ({
                          value: c.id,
                          label: categoryLabel(c, f.lang),
                        }))}
                      />
                    </Field>
                    <div className="tabular flex h-9 min-w-24 items-center justify-end text-sm">
                      {parsed ? <Money cents={rowNet(parsed)} /> : null}
                    </div>
                  </div>
                  {bad ? (
                    <FieldError>{f.t("invoice.problemBadRow")}</FieldError>
                  ) : null}
                </div>
              )
            })}
            {!issued ? (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setRows((list) => [
                    ...list,
                    blankRow(
                      date,
                      list.at(-1)?.catId,
                      list.at(-1)?.vatRate,
                      credit
                    ),
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                {f.t("invoice.addRow")}
              </Button>
            ) : null}
          </section>

          <Field>
            <FieldLabel htmlFor={ids.note}>{f.t("invoice.note")}</FieldLabel>
            <Input
              id={ids.note}
              disabled={issued}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <dl className="ml-auto grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{f.t("invoice.totalNet")}</dt>
            <dd className="text-right">
              <Money cents={totals.net} />
            </dd>
            {totals.rates.map((line) => (
              <React.Fragment key={line.vatRate}>
                <dt className="text-muted-foreground">
                  {f.t("invoice.totalVat")} {f.rate(line.vatRate)}
                </dt>
                <dd className="text-right">
                  <Money cents={line.vat} />
                </dd>
              </React.Fragment>
            ))}
            <dt className="font-semibold">{f.t("invoice.totalGross")}</dt>
            <dd className="text-right font-semibold">
              <Money cents={totals.gross} />
            </dd>
          </dl>
        </div>
        <DialogFooter className="m-0 flex-row flex-wrap items-center gap-2 bg-popover px-5 py-3">
          {issued ? (
            <>
              <Button
                variant="outline"
                onClick={() => void sendInvoice(ctx, existing)}
              >
                <SendIcon data-icon="inline-start" />
                {f.t("invoice.send")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void downloadInvoicePdf(ctx, existing)}
              >
                <DownloadIcon data-icon="inline-start" />
                {f.t("invoice.download")}
              </Button>
              <Button onClick={closeDialog}>{f.t("invoice.close")}</Button>
            </>
          ) : (
            <>
              {credit ? (
                <span className="mr-auto" />
              ) : (
                <p className="mr-auto self-center text-xs text-muted-foreground">
                  {f.t("invoice.issueHint")}
                </p>
              )}
              <Button variant="outline" onClick={save} disabled={busy}>
                {f.t("invoice.saveDraft")}
              </Button>
              <Button onClick={issue} disabled={busy}>
                {f.t("invoice.issue")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
