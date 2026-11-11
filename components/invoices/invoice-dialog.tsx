"use client"

import * as React from "react"
import {
  BookmarkPlusIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  MinusIcon,
  PlusIcon,
  ReceiptIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"

import { AmountInput } from "@/components/common/amount-input"
import { DateInput } from "@/components/common/date-input"
import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { TagsInput } from "@/components/common/tags-input"
import { InvoiceFiles } from "@/components/invoices/invoice-files"
import { PartyFields } from "@/components/invoices/party-fields"
import { RebillPicker } from "@/components/invoices/rebill-picker"
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
  copyInvoice,
  downloadInvoicePdf,
  issueInvoice,
  sendInvoice,
} from "@/lib/commands/invoice-commands"
import {
  downloadQuotePdf,
  invoiceQuote,
  saveQuote,
  sendQuote,
} from "@/lib/commands/quote-commands"
import { evalAmount } from "@/lib/domain/amount-expr"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import {
  BUYER_REF_MAX,
  buyerRefs,
  CUSTOMER_DEFAULTS,
  discountField,
  isCustomer,
  emptyParty,
  type Customer,
  type Invoice,
  type InvoiceFile,
  type InvoiceLang,
  type InvoiceRow,
  type Quote,
} from "@/lib/domain/invoice"
import { deductionRows, openAdvances } from "@/lib/domain/invoice-advance"
import { rebillCost } from "@/lib/domain/invoice-rebill"
import { addDays } from "@/lib/domain/dates"
import { canCopy, productFromRow, productRow } from "@/lib/domain/invoice-draft"
import { duplicateInvoice } from "@/lib/domain/invoice-duplicate"
import {
  docDiscountCents,
  invoiceTotals,
  isInvoiceCategory,
  rowNet,
} from "@/lib/domain/invoice-calc"
import {
  formatDiscount,
  formatQuantity,
  parseDiscount,
  parseQuantity,
} from "@/lib/domain/invoice-input"
import { invoiceLabels } from "@/lib/domain/invoice-labels"
import { isZeroRated, rowSaleKind, vatNotes } from "@/lib/domain/invoice-vat"
import { formatMoneyPlain } from "@/lib/domain/money"
import { defaultValidUntil, nextQuoteNumber } from "@/lib/domain/quote"
import { allTags, tagsField } from "@/lib/domain/tags"
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
  /** The row's discount percent as typed, "" for none. */
  discount: string
  vatRate: number
  catId: string
  /** The expense the row bills on (§8.27), carried through unchanged. */
  rebills?: string
  /** The advance invoice the row deducts (§8.27); its figures are not edited. */
  advance?: string
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
    discount: "",
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
    discount: formatDiscount(row.discount),
    vatRate: row.vatRate,
    catId: row.catId,
    ...(row.rebills ? { rebills: row.rebills } : {}),
    ...(row.advance ? { advance: row.advance } : {}),
  }
}

/** A row with nothing typed in it, which is dropped rather than refused. */
const isBlank = (r: RowDraft) =>
  r.description.trim() === "" && r.price.trim() === ""

/** The row as numbers, or null when its quantity or price cannot be read. */
function toRow(draft: RowDraft, credit: boolean): InvoiceRow | null {
  /* A deducted advance has the opposite sign of the document's other rows. */
  const quantityMilli = parseQuantity(draft.quantity, credit || !!draft.advance)
  const unitCents = evalAmount(draft.price)
  const discount = parseDiscount(draft.discount)
  if (quantityMilli === null || unitCents === null || unitCents < 0) return null
  if (discount === null) return null
  return {
    description: draft.description.trim(),
    quantityMilli,
    unit: draft.unit.trim(),
    unitCents,
    vatRate: draft.vatRate,
    catId: draft.catId,
    ...discountField(discount),
    ...(draft.rebills ? { rebills: draft.rebills } : {}),
    ...(draft.advance ? { advance: draft.advance } : {}),
  }
}

/**
 * Open the dialog for a new draft, a draft or an issued invoice (§8.27), or
 * for a quote (§8.34), which has the same customer and rows and books nothing.
 */
export function InvoiceDialog() {
  const dialog = useBookStore((s) => s.dialog)
  /* Keyed, so opening a copy from an invoice starts the form afresh. */
  if (dialog.kind === "invoice")
    return (
      <InvoiceForm
        key={dialog.invoiceId ?? "new"}
        invoiceId={dialog.invoiceId}
        quote={false}
      />
    )
  if (dialog.kind === "quote")
    return (
      <InvoiceForm
        key={`quote-${dialog.quoteId ?? "new"}`}
        invoiceId={dialog.quoteId}
        quote
      />
    )
  return null
}

function InvoiceForm({
  invoiceId,
  quote,
}: {
  invoiceId: string | null
  /** Whether the form edits a quote rather than an invoice. */
  quote: boolean
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const invoices = useBookStore((s) => s.invoices)
  const customers = useBookStore((s) => s.customers)
  const settings = useBookStore((s) => s.invoiceSettings)
  const cats = useBookStore((s) => s.cats)
  const setInvoices = useBookStore((s) => s.setInvoices)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const openDialog = useBookStore((s) => s.openDialog)
  const products = useBookStore((s) => s.invoiceSettings.products)
  const quotes = useBookStore((s) => s.invoiceSettings.quotes)

  /* A new draft keeps one id however often it is saved, so saving twice is one draft. */
  const [newId] = React.useState(() => uid())
  const draftId = invoiceId ?? newId
  const existing = quote ? undefined : invoices.find((i) => i.id === draftId)
  const existingQuote = quote ? quotes.find((q) => q.id === draftId) : undefined
  const start = existing ?? existingQuote
  const issued = existing !== undefined && existing.number !== null
  /* A credit note takes negative quantities and has no due date. */
  const credit = existing?.credits != null
  /* An issued invoice keeps the VAT standing it was issued with (§8.27). */
  const registered = existing?.seller
    ? existing.seller.vatRegistered
    : settings.vatRegistered
  const credited = invoices.find((i) => i.id === existing?.credits)

  const [date, setDate] = React.useState(start?.date ?? todayIso())
  /* On a quote this is the last valid day. */
  const [dueDate, setDueDate] = React.useState(
    existing?.dueDate ??
      existingQuote?.validUntil ??
      (quote
        ? defaultValidUntil(todayIso())
        : addDays(todayIso(), settings.termDays))
  )
  /* A due date the user has set stays put when the customer or the date changes. */
  const dueTouched = React.useRef(start !== undefined)
  const [supplyFrom, setSupplyFrom] = React.useState(existing?.supplyFrom ?? "")
  const [supplyTo, setSupplyTo] = React.useState(existing?.supplyTo ?? "")
  const [language, setLanguage] = React.useState<InvoiceLang>(
    start?.language ?? f.lang
  )
  const [customerId, setCustomerId] = React.useState<string | null>(
    start?.customerId ?? null
  )
  const [party, setParty] = React.useState(start?.customer ?? emptyParty())
  const [saveCustomer, setSaveCustomer] = React.useState(false)
  /*
   * The rate a row's category allows: 0 on a zero-rated sale and for a seller
   * outside the VAT register, otherwise the row's own. Leaving a zero-rated
   * category for a domestic one brings back the category's rate.
   */
  const fitRate = (row: RowDraft, before?: RowDraft): RowDraft => {
    if (issued) return row
    if (!registered || isZeroRated(rowSaleKind(row.catId)))
      return { ...row, vatRate: 0 }
    if (before && isZeroRated(rowSaleKind(before.catId)) && row.vatRate === 0) {
      const cat = cats.find((c) => c.id === row.catId)
      return cat ? { ...row, vatRate: rateOnDate(cat.vatRate, date) } : row
    }
    return row
  }
  const [rows, setRows] = React.useState<RowDraft[]>(() =>
    start && start.rows.length > 0
      ? start.rows.map(toDraft)
      : [
          fitRate(
            blankRow(start?.date ?? todayIso(), undefined, undefined, credit)
          ),
        ]
  )
  const [note, setNote] = React.useState(start?.note ?? "")
  const [docDiscount, setDocDiscount] = React.useState(
    formatDiscount(start?.discount)
  )
  const [tags, setTags] = React.useState<string[]>(() => [
    ...(start?.tags ?? []),
  ])
  const bookEntries = useBookStore((s) => s.entries)
  /* The book's tags with those of other invoices, so a project is offered before its first sale is booked. */
  const tagSuggestions = React.useMemo(
    () => allTags([...bookEntries, ...invoices]),
    [bookEntries, invoices]
  )
  /* An advance invoice taxes its sale when it is paid (§8.27, §6.17). */
  const [advanceKind, setAdvanceKind] = React.useState(
    existing?.kind === "advance"
  )
  const [files, setFiles] = React.useState<InvoiceFile[]>(() => [
    ...(existing?.files ?? []),
  ])
  const [rebilling, setRebilling] = React.useState(false)
  const [buyerReference, setBuyerReference] = React.useState(
    existing?.buyerReference ?? ""
  )
  const [orderNumber, setOrderNumber] = React.useState(
    existing?.orderNumber ?? ""
  )
  /* A reference the user has typed stays put when another customer is picked. */
  const buyerRefTouched = React.useRef(start !== undefined)
  const [showErrors, setShowErrors] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const ids = {
    note: React.useId(),
    language: React.useId(),
    buyerReference: React.useId(),
    orderNumber: React.useId(),
    discount: React.useId(),
    tags: React.useId(),
  }

  /* A seller outside the VAT register sells domestically only (`vatProblems`). */
  const incomeCats = cats.filter(
    (c) =>
      isInvoiceCategory(c) && (registered || rowSaleKind(c.id) === "domestic")
  )
  const notes = vatNotes(rows, registered).map(
    (note) => invoiceLabels(language).vatNote[note]
  )
  const rateOptions = validRates(date)
  const rowErrors = rows.map((r) => !isBlank(r) && toRow(r, credit) === null)
  const readRows = rows
    .filter((r) => !isBlank(r))
    .flatMap((r) => {
      const row = toRow(r, credit)
      return row ? [row] : []
    })
  const docDiscountValue = parseDiscount(docDiscount)
  const discountBad = docDiscountValue === null
  const discount = docDiscountValue ?? undefined
  const totals = invoiceTotals(readRows, discount)
  /* A hint only: it never stops the invoice being issued. */
  const lookalike =
    issued || quote
      ? undefined
      : duplicateInvoice(
          {
            id: draftId,
            date,
            customerId,
            customer: party,
            rows: readRows,
            credits: existing?.credits ?? null,
          },
          invoices
        )
  const nameMissing = party.name.trim() === ""
  const entryById = React.useMemo(
    () => new Map(bookEntries.map((e) => [e.id, e])),
    [bookEntries]
  )
  const invoiceById = React.useMemo(
    () => new Map(invoices.map((i) => [i.id, i])),
    [invoices]
  )
  const deducting = rows.some((r) => r.advance)
  const taken = React.useMemo(
    () => new Set(rows.flatMap((r) => (r.rebills ? [r.rebills] : []))),
    [rows]
  )
  /* Advances of this customer with something left, less those a row already deducts. */
  const advances =
    issued || quote || credit || advanceKind
      ? []
      : openAdvances(
          { customerId, name: party.name },
          invoices,
          entryById,
          draftId
        ).filter(({ advance }) => !rows.some((r) => r.advance === advance.id))
  /* Re-billed rows start on the invoice's own sales category and rate. */
  const saleRow = rows.filter((r) => !r.advance).at(-1)
  const sale = {
    id: saleRow?.catId ?? DEFAULT_CAT,
    vatRate: saleRow?.vatRate ?? rateOnDate(25.5, date || todayIso()),
  }
  const addRows = (added: InvoiceRow[]) =>
    setRows((list) => {
      const kept = list.length === 1 && isBlank(list[0]) ? [] : list
      return [...kept, ...added.map((r) => fitRate(toDraft(r)))]
    })

  const changeDate = (iso: string) => {
    setDate(iso)
    if (credit) {
      setDueDate(iso)
    } else if (quote) {
      if (!dueTouched.current && iso) setDueDate(defaultValidUntil(iso))
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
    if (!buyerRefTouched.current) setBuyerReference(customer.reference ?? "")
    if (!quote && !dueTouched.current && date) {
      setDueDate(addDays(date, customer.termDays ?? settings.termDays))
    }
  }

  /* A picked product fills the last row while nothing is typed in it, and is added after it otherwise. */
  const addProduct = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    const row = fitRate(toDraft(productRow(product, date || todayIso())))
    setRows((list) =>
      list.length > 0 && isBlank(list[list.length - 1])
        ? [...list.slice(0, -1), row]
        : [...list, row]
    )
  }

  const keepAsProduct = (row: InvoiceRow) => {
    const product = productFromRow(row, uid())
    const s = useBookStore.getState()
    s.setInvoiceSettings({
      ...s.invoiceSettings,
      products: [...s.invoiceSettings.products, product],
    })
    toast.add({ title: f.t("product.saved", { x: product.name }) })
  }
  const known = new Set(
    products.map((p) => p.name.trim().toLocaleLowerCase("fi"))
  )

  const patchRow = (key: string, patch: Partial<RowDraft>) =>
    setRows((list) =>
      list.map((r) => (r.key === key ? fitRate({ ...r, ...patch }, r) : r))
    )

  /** Keep a typed customer in the register when asked to. Returns the register id, or null. */
  const registerCustomer = (): string | null => {
    let register = customerId
    if (saveCustomer && register === null && !nameMissing) {
      const customer: Customer = {
        ...CUSTOMER_DEFAULTS,
        ...party,
        name: party.name.trim(),
        country: party.country.trim().toUpperCase() || "FI",
        vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
        id: uid(),
        language,
      }
      setCustomers([...useBookStore.getState().customers, customer])
      register = customer.id
      setCustomerId(register)
    }
    return register
  }

  const cleanParty = () => ({
    ...party,
    name: party.name.trim(),
    country: party.country.trim().toUpperCase() || "FI",
    vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
  })

  /** Store the quote. Returns it, or null while the rows cannot be read. */
  const storeQuote = (): Quote | null => {
    if (rowErrors.some(Boolean) || discountBad) {
      setShowErrors(true)
      return null
    }
    const register = registerCustomer()
    const stored: Quote = {
      id: draftId,
      number:
        existingQuote?.number ??
        nextQuoteNumber(useBookStore.getState().invoiceSettings.quotes),
      date,
      validUntil: dueDate,
      customerId: register,
      customer: cleanParty(),
      language,
      rows: readRows,
      ...discountField(discount),
      ...tagsField(tags),
      note: note.trim(),
      outcome: existingQuote?.outcome ?? null,
      invoiceId: existingQuote?.invoiceId ?? null,
    }
    saveQuote(stored)
    return stored
  }

  /** Store the invoice as a draft. Returns it, or null while the rows cannot be read. */
  const saveDraft = (): Invoice | null => {
    if (rowErrors.some(Boolean) || discountBad) {
      setShowErrors(true)
      return null
    }
    const register = registerCustomer()
    const draft: Invoice = {
      id: draftId,
      number: null,
      date,
      dueDate,
      supplyFrom: supplyFrom || null,
      supplyTo: supplyFrom ? supplyTo || null : null,
      customerId: register,
      customer: cleanParty(),
      language,
      rows: readRows,
      ...discountField(discount),
      ...tagsField(tags),
      note: note.trim(),
      ...buyerRefs({ buyerReference, orderNumber }),
      terms: "",
      reference: null,
      seller: null,
      issuedAt: null,
      entryIds: [],
      credits: existing?.credits ?? null,
      ...(existing?.reservedNumber !== undefined
        ? { reservedNumber: existing.reservedNumber }
        : {}),
      ...(advanceKind && !credit ? { kind: "advance" as const } : {}),
      ...(files.length > 0 ? { files } : {}),
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
    if (quote) {
      const stored = storeQuote()
      if (!stored) return
      toast.add({ title: f.t("quote.saved", { n: stored.number }) })
    } else {
      if (!saveDraft()) return
      toast.add({ title: f.t("invoice.draftSaved") })
    }
    closeDialog()
  }

  /* The quote is stored before it is printed, sent or invoiced, so all three use what is on screen. */
  const quoteAction = (run: (q: Quote) => void) => () => {
    const stored = storeQuote()
    if (stored) run(stored)
  }
  const toInvoice = quoteAction((q) => {
    const id = invoiceQuote(q.id)
    if (id) {
      toast.add({ title: f.t("quote.invoiced", { n: q.number }) })
      openDialog({ kind: "invoice", invoiceId: id })
    }
  })
  const quoteInvoice = existingQuote?.invoiceId
    ? invoices.find((i) => i.id === existingQuote.invoiceId)
    : undefined

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

  const title = quote
    ? existingQuote
      ? f.t("quote.viewTitle", { n: existingQuote.number })
      : f.t("quote.newTitle")
    : issued
      ? f.t(credit ? "invoice.creditViewTitle" : "invoice.viewTitle", {
          n: existing.number ?? 0,
        })
      : existing?.reservedNumber !== undefined
        ? f.t("invoice.reopenedTitle", { n: existing.reservedNumber })
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
                    ...customers
                      .filter((c) => isCustomer(c) || c.id === customerId)
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
              nameError={
                showErrors && nameMissing
                  ? f.t("invoice.customerNeedsName")
                  : undefined
              }
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
              <FieldLabel>
                {f.t(quote ? "quote.date" : "invoice.date")}
              </FieldLabel>
              <DateInput
                value={date}
                onValueChange={changeDate}
                disabled={issued}
              />
            </Field>
            {credit ? null : (
              <Field className="w-44">
                <FieldLabel>
                  {f.t(quote ? "quote.validUntil" : "invoice.dueDate")}
                </FieldLabel>
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
                {f.t(quote ? "quote.language" : "invoice.language")}
              </FieldLabel>
              <OptionSelect
                label={f.t(quote ? "quote.language" : "invoice.language")}
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

          {quote || credit ? null : (
            <section className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={advanceKind}
                  disabled={issued || deducting}
                  onCheckedChange={(v) => setAdvanceKind(v === true)}
                />
                {f.t("invoice.advanceKind")}
              </label>
              {issued ? null : (
                <FieldDescription>
                  {f.t(
                    deducting
                      ? "invoice.advanceKindDeducting"
                      : "invoice.advanceKindHint"
                  )}
                </FieldDescription>
              )}
            </section>
          )}

          {quote ? null : (
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
          )}

          {quote ? null : (
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-3">
                <Field className="w-60">
                  <FieldLabel htmlFor={ids.buyerReference}>
                    {f.t("invoice.buyerReference")}
                  </FieldLabel>
                  <Input
                    id={ids.buyerReference}
                    value={buyerReference}
                    maxLength={BUYER_REF_MAX}
                    disabled={issued}
                    onChange={(event) => {
                      buyerRefTouched.current = true
                      setBuyerReference(event.target.value)
                    }}
                  />
                </Field>
                <Field className="w-60">
                  <FieldLabel htmlFor={ids.orderNumber}>
                    {f.t("invoice.orderNumber")}
                  </FieldLabel>
                  <Input
                    id={ids.orderNumber}
                    value={orderNumber}
                    maxLength={BUYER_REF_MAX}
                    disabled={issued}
                    onChange={(event) => setOrderNumber(event.target.value)}
                  />
                </Field>
              </div>
              <FieldDescription>{f.t("invoice.buyerRefHint")}</FieldDescription>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{f.t("invoice.rows")}</h3>
            {rows.map((row, index) => {
              const parsed = toRow(row, credit)
              const bad = showErrors && rowErrors[index]
              /* A deducted advance's figures come from what was paid. */
              const fixed = issued || !!row.advance
              const rebilled = row.rebills
                ? entryById.get(row.rebills)
                : undefined
              const deducted = row.advance
                ? invoiceById.get(row.advance)
                : undefined
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
                    {!issued &&
                    !credit &&
                    !row.advance &&
                    !row.rebills &&
                    parsed &&
                    parsed.description !== "" &&
                    !known.has(parsed.description.toLocaleLowerCase("fi")) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("product.keepRow", { n: index + 1 })}
                        title={f.t("product.keepRow", { n: index + 1 })}
                        onClick={() => keepAsProduct(parsed)}
                      >
                        <BookmarkPlusIcon />
                      </Button>
                    ) : null}
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
                        disabled={fixed}
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
                        {f.t(
                          registered
                            ? "invoice.rowPrice"
                            : "invoice.rowPricePlain"
                        )}
                      </FieldLabel>
                      <AmountInput
                        className="text-right"
                        disabled={fixed}
                        aria-invalid={bad || undefined}
                        value={row.price}
                        onChange={(e) =>
                          patchRow(row.key, { price: e.target.value })
                        }
                      />
                    </Field>
                    <Field className="w-16">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowDiscount")}
                      </FieldLabel>
                      <Input
                        aria-label={`${f.t("invoice.rowDiscount")} ${index + 1}`}
                        inputMode="decimal"
                        className="tabular text-right"
                        disabled={fixed}
                        aria-invalid={bad || undefined}
                        value={row.discount}
                        onChange={(e) =>
                          patchRow(row.key, { discount: e.target.value })
                        }
                      />
                    </Field>
                    {registered ? (
                      <Field className="w-24">
                        <FieldLabel className="text-xs">
                          {f.t("invoice.rowVat")}
                        </FieldLabel>
                        <OptionSelect
                          label={f.t("invoice.rowVat")}
                          disabled={
                            fixed || isZeroRated(rowSaleKind(row.catId))
                          }
                          value={String(row.vatRate)}
                          onChange={(v) =>
                            patchRow(row.key, { vatRate: Number(v) })
                          }
                          options={(rateOptions.includes(row.vatRate)
                            ? rateOptions
                            : [...rateOptions, row.vatRate]
                          ).map((r) => ({
                            value: String(r),
                            label: f.rate(r),
                          }))}
                        />
                      </Field>
                    ) : null}
                    <Field className="min-w-36 flex-1">
                      <FieldLabel className="text-xs">
                        {f.t("invoice.rowCategory")}
                      </FieldLabel>
                      <OptionSelect
                        label={f.t("invoice.rowCategory")}
                        disabled={fixed}
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
                          label: f.catLabel(c),
                        }))}
                      />
                    </Field>
                    <div className="tabular flex h-9 min-w-24 items-center justify-end text-sm">
                      {parsed ? <Money cents={rowNet(parsed)} /> : null}
                    </div>
                  </div>
                  {row.rebills ? (
                    <p className="text-xs text-muted-foreground">
                      {rebilled
                        ? f.t("invoice.rebillRowFrom", {
                            d: f.date(rebilled.date),
                            x: rebilled.description,
                            m: f.money(rebillCost(rebilled)),
                          })
                        : f.t("invoice.rebillRowGone")}
                    </p>
                  ) : null}
                  {row.advance ? (
                    <p className="text-xs text-muted-foreground">
                      {f.t("invoice.advanceRow", {
                        n: deducted?.number ?? "",
                      })}
                    </p>
                  ) : null}
                  {bad ? (
                    <FieldError>{f.t("invoice.problemBadRow")}</FieldError>
                  ) : null}
                </div>
              )
            })}
            {!issued ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRows((list) => [
                      ...list,
                      fitRate(
                        blankRow(
                          date,
                          list.at(-1)?.catId,
                          list.at(-1)?.vatRate,
                          credit
                        )
                      ),
                    ])
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  {f.t("invoice.addRow")}
                </Button>
                {!credit && products.length > 0 ? (
                  <OptionSelect
                    size="sm"
                    className="w-56"
                    label={f.t("product.pick")}
                    placeholder={f.t("product.pick")}
                    value=""
                    onChange={addProduct}
                    options={[...products]
                      .sort((a, b) => f.collator.compare(a.name, b.name))
                      .map((p) => ({ value: p.id, label: p.name }))}
                  />
                ) : null}
                {!credit && !rebilling ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRebilling(true)}
                  >
                    <ReceiptIcon data-icon="inline-start" />
                    {f.t("invoice.rebillOpen")}
                  </Button>
                ) : null}
                {advances.map(({ advance, left }) => (
                  <Button
                    key={advance.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addRows(deductionRows(advance, left, language))
                    }
                  >
                    <MinusIcon data-icon="inline-start" />
                    {f.t("invoice.advanceDeduct", {
                      n: advance.number ?? "",
                      m: f.money(left.reduce((sum, p) => sum + p.net, 0)),
                    })}
                  </Button>
                ))}
              </div>
            ) : null}
            {rebilling && !issued ? (
              <RebillPicker
                invoiceId={draftId}
                taken={taken}
                sale={sale}
                language={language}
                onAdd={(added) => {
                  addRows(added)
                  setRebilling(false)
                }}
                onClose={() => setRebilling(false)}
              />
            ) : null}
          </section>

          <Field className="max-w-48">
            <FieldLabel htmlFor={ids.discount}>
              {f.t("invoice.docDiscount")}
            </FieldLabel>
            <Input
              id={ids.discount}
              inputMode="decimal"
              className="tabular text-right"
              disabled={issued}
              aria-invalid={(showErrors && discountBad) || undefined}
              value={docDiscount}
              onChange={(e) => setDocDiscount(e.target.value)}
            />
            {showErrors && discountBad ? (
              <FieldError>{f.t("invoice.discountBad")}</FieldError>
            ) : null}
          </Field>

          {quote || credit ? null : (
            <InvoiceFiles files={files} onChange={setFiles} disabled={issued} />
          )}

          {issued && tags.length === 0 ? null : (
            <Field>
              <FieldLabel htmlFor={ids.tags}>{f.t("entry.tags")}</FieldLabel>
              <TagsInput
                id={ids.tags}
                value={tags}
                disabled={issued}
                suggestions={tagSuggestions}
                placeholder={f.t("entry.tagsPlaceholder")}
                removeLabel={(tag) => f.t("entry.tagRemove", { tag })}
                onChange={setTags}
              />
              {issued ? null : (
                <FieldDescription>{f.t("invoice.tagsHint")}</FieldDescription>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor={ids.note}>{f.t("invoice.note")}</FieldLabel>
            <Input
              id={ids.note}
              disabled={issued}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          {notes.length > 0 ? (
            <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              <p className="text-xs font-medium">{f.t("invoice.vatNotes")}</p>
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}

          <dl className="ml-auto grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
            {discount !== undefined ? (
              <>
                <dt className="text-muted-foreground">
                  {f.t("invoice.totalDiscount", { p: f.rate(discount) })}
                </dt>
                <dd className="text-right">
                  <Money cents={-docDiscountCents(readRows, discount)} />
                </dd>
              </>
            ) : null}
            {registered ? (
              <>
                <dt className="text-muted-foreground">
                  {f.t("invoice.totalNet")}
                </dt>
                <dd className="text-right">
                  <Money cents={totals.net} />
                </dd>
              </>
            ) : null}
            {(registered ? totals.rates : []).map((line) => (
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
          {quote ? (
            <>
              <p className="mr-auto self-center text-xs text-muted-foreground">
                {quoteInvoice
                  ? quoteInvoice.number !== null
                    ? f.t("quote.invoicedAs", { n: quoteInvoice.number })
                    : f.t("quote.invoicedDraft")
                  : f.t("quote.hint")}
              </p>
              <Button variant="outline" onClick={save}>
                {f.t("quote.save")}
              </Button>
              <Button
                variant="outline"
                onClick={quoteAction((q) => void sendQuote(ctx, q))}
              >
                <SendIcon data-icon="inline-start" />
                {f.t("invoice.send")}
              </Button>
              <Button
                variant="outline"
                onClick={quoteAction((q) => void downloadQuotePdf(ctx, q))}
              >
                <DownloadIcon data-icon="inline-start" />
                {f.t("invoice.download")}
              </Button>
              {quoteInvoice ? null : (
                <Button onClick={toInvoice}>
                  <FileTextIcon data-icon="inline-start" />
                  {f.t("quote.toInvoice")}
                </Button>
              )}
            </>
          ) : issued ? (
            <>
              {canCopy(existing) ? (
                <Button
                  variant="outline"
                  className="mr-auto"
                  onClick={() => {
                    const id = copyInvoice(existing.id)
                    if (id) openDialog({ kind: "invoice", invoiceId: id })
                  }}
                >
                  <CopyIcon data-icon="inline-start" />
                  {f.t("invoice.copy")}
                </Button>
              ) : null}
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
              {lookalike ? (
                <p
                  role="status"
                  className="mr-auto self-center text-xs text-warning"
                >
                  {f.t("invoice.duplicateOf", {
                    n: lookalike.number ?? "",
                    d: f.date(lookalike.date),
                  })}
                </p>
              ) : credit ? (
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
