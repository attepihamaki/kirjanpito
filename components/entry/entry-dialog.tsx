"use client"

import * as React from "react"
import {
  CopyIcon,
  EllipsisIcon,
  LockIcon,
  MergeIcon,
  ScanBarcodeIcon,
  SplitIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

import { EntryTypeToggle } from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { VoucherPicker } from "@/components/entry/voucher-picker"
import { DescriptionInput } from "@/components/entry/description-input"
import { HelpHint } from "@/components/common/help-hint"
import { InfoPopover } from "@/components/common/info-popover"
import { Keys } from "@/components/common/keys"
import { AttachmentGrid } from "@/components/entry/attachment-grid"
import { EntryFigureList } from "@/components/entry/entry-figures"
import { EntryHistory, hasHistory } from "@/components/entry/entry-history"
import { ReceiptPreview } from "@/components/entry/receipt-preview"
import { AttachmentViewer } from "@/components/receipt/receipt-viewer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useEntryFigures } from "@/hooks/use-entry-figures"
import { useShortcut } from "@/hooks/use-save-book"
import { isMediaFile } from "@/hooks/use-file-drop"
import { looksLikeVatId, normalizeVatId } from "@/lib/domain/ec-sales"
import {
  entryLock,
  lockOn,
  paidChangeHitsForm5,
} from "@/lib/domain/period-lock"
import { canBeUnpaid, paidDate } from "@/lib/domain/open-items"
import {
  getReceipt,
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import {
  LINE_BY_KEY,
  RATES,
  categoryName,
  isEuSaleKind,
} from "@/lib/domain/accounts"
import { isPeriod } from "@/lib/domain/accrual"
import { calcEntry, euPurchaseVat, isShare } from "@/lib/domain/calc"
import {
  describeInvoice,
  isEmptyGuess,
  parseInvoiceText,
  parseVirtualBarcode,
  previousEntryFrom,
  suggestCategory,
} from "@/lib/domain/invoice-text"
import { findCategoryRule } from "@/lib/domain/category-rules"
import { categoryUsage, mostUsedCategories } from "@/lib/domain/category-usage"
import {
  CASH_BOOKING_DAYS,
  duplicateOf,
  entryWithReceipt,
  vatNotDeductible,
} from "@/lib/domain/entry-checks"
import { isPdf } from "@/lib/domain/receipt-path"
import { addDays, isoDate, monthOf, todayIso, yearOf } from "@/lib/domain/dates"
import { billIban, billReference } from "@/lib/domain/bill-payment"
import { formatIban } from "@/lib/domain/iban"
import { formatReference } from "@/lib/domain/invoice-reference"
import { viewHelp } from "@/lib/domain/field-help"
import { canSplitLine, splitSiblings } from "@/lib/domain/split"
import { sellCandidates } from "@/lib/domain/assets"
import {
  creditSettlement,
  reversalCandidates,
  reversalLabel,
  reversingEntries,
} from "@/lib/domain/reversal"
import type { Customer } from "@/lib/domain/invoice"
import { partyDefaults, partyFitsSide } from "@/lib/domain/parties"
import {
  descriptionSuggestions,
  suggestCategoryFor,
  type SuggestionSource,
} from "@/lib/domain/entry-suggest"
import { rateMismatch, rateOnDate } from "@/lib/domain/vat-rates"
import { uid } from "@/lib/domain/id"
import { periodFromKey, vatPeriods } from "@/lib/domain/vat-deadline"
import { defaultSettledKey } from "@/lib/domain/vat-settlement"
import { periodLabel } from "@/lib/i18n/period-label"
import { AmountInput } from "@/components/common/amount-input"
import { DateInput } from "@/components/common/date-input"
import { evalAmount } from "@/lib/domain/amount-expr"
import { formatMoneyPlain } from "@/lib/domain/money"
import { deleteEntry, offerEditUndo } from "@/lib/commands/book-commands"
import { mergeSplit, restoreEntryVersion } from "@/lib/commands/bulk-commands"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { rememberReceiptHash } from "@/lib/commands/receipt-hash-commands"
import { categorySide, compareCategories } from "@/stores/selectors"
import type {
  AmountMode,
  Attachment,
  Category,
  Entry,
  EntryType,
} from "@/lib/domain/types"
import { indexCategories } from "@/lib/domain/types"
import {
  ENTRY_EVERY,
  entryToRecurring,
  everyOf,
  matchRecurring,
  type RecurringEntry,
} from "@/lib/domain/recurring"
import { everyLabel } from "@/lib/i18n/every-label"
import { useBookStore, type EntryPrefill } from "@/stores/book-store"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"

/** A category list this short is scanned whole, so it gets no "most used" group. */
const MOST_USED_MIN_LIST = 8

/** Whether a file's printed codes can be read: an image or a PDF (§8.30). */
function isScannable(type: string): boolean {
  return type === "application/pdf" || type.startsWith("image/")
}

interface FormState {
  date: string
  description: string
  type: EntryType
  catId: string
  amount: string
  vatRate: number
  amountMode: AmountMode
  atts: Attachment[]
  /** Keep this entry as a template (§8.5). */
  repeat: boolean
  /** Months between the template's entries, one of `ENTRY_EVERY`. */
  repeatEvery: number
  /** The VAT period a payment or refund settles, "" to go by the date (§6.6). */
  settles: string
  /** "" when paid on the date, "open" while unpaid, else the payment date (§6.3). */
  paid: string
  /** Paid in cash (§8.5). Ignored while the entry is open. */
  cash: boolean
  /** The buyer's VAT number on an EU sale (§8.7). */
  buyerVatId: string
  /** The business share in percent, "" for the whole voucher (§6.12). */
  share: string
  /** The id of the entry this one reverses, "" for none (§8.4). */
  reverses: string
  /** The id of the purchase this sale of machinery disposes of, "" for none (§8.8). */
  sells: string
  /** The id of the counterparty in the register, "" for none (§8.29). */
  party: string
  /** The first and last day the entry covers, "" for none (§6.3). */
  periodFrom: string
  periodTo: string
  /** The due date of a bill received, "" for none (§8.30). */
  due: string
  /** The payee's IBAN and the reference of a bill received, as typed (§8.30). */
  iban: string
  reference: string
}

/** The fields §8.5 validates, named as they are in `FormState`. */
type ErrorField =
  "date" | "amount" | "catId" | "share" | "period" | "iban" | "reference"

type FieldErrorState = { field: ErrorField; message: string } | null

const snapshot = (form: FormState) =>
  JSON.stringify({
    ...form,
    atts: form.atts.map((a) => a.id ?? a.path ?? a.name),
  })

/**
 * Default date for a new entry (§8.5): the selected month if one is picked,
 * capped at the 28th so February is always valid; otherwise today when the
 * year matches, else 1 January.
 */
function defaultDate(year: number, month: number): string {
  const today = new Date()
  if (month > 0) {
    return (
      isoDate(year, month, Math.min(today.getDate(), 28)) ??
      `${year}-${String(month).padStart(2, "0")}-01`
    )
  }
  const iso = todayIso(today)
  return yearOf(iso) === year ? iso : `${year}-01-01`
}

function initialForm({
  editing,
  mode,
  year,
  month,
  lastType,
  lastMode,
  recurring,
  prefill,
}: {
  editing: Entry | undefined
  mode: "new" | "edit" | "copy"
  year: number
  month: number
  lastType: EntryType
  lastMode: AmountMode
  recurring: readonly RecurringEntry[]
  prefill?: EntryPrefill
}): FormState {
  if (!editing || mode === "new") {
    const date = prefill?.date ?? defaultDate(year, month)
    return {
      date,
      description: prefill?.description ?? "",
      type: prefill?.type ?? lastType,
      catId: prefill?.catId ?? "",
      amount: prefill?.amount ? formatMoneyPlain(prefill.amount) : "",
      /* The general rate until a category sets its own, so the amount mode converts from the start. */
      vatRate: prefill?.vatRate ?? rateOnDate(25.5, date),
      amountMode: prefill?.amountMode ?? lastMode,
      // A memo voucher a calculator made for this entry (§8.8).
      atts: [...(prefill?.atts ?? [])],
      repeat: false,
      repeatEvery: 1,
      settles: prefill?.settles ?? "",
      paid: "",
      cash: false,
      buyerVatId: prefill?.buyerVatId ?? "",
      share: prefill?.share ? String(prefill.share) : "",
      reverses: prefill?.reverses ?? "",
      sells: "",
      party: prefill?.party ?? "",
      periodFrom: "",
      periodTo: "",
      due: prefill?.due ?? "",
      iban: prefill?.iban ? formatIban(prefill.iban) : "",
      reference: prefill?.reference ? formatReference(prefill.reference) : "",
    }
  }
  const today = todayIso()
  return {
    date:
      mode === "copy" && yearOf(today) === yearOf(editing.date)
        ? today
        : editing.date,
    description: editing.description,
    type: editing.type,
    catId: editing.catId,
    amount: formatMoneyPlain(editing.amount),
    vatRate: editing.vatRate,
    amountMode: editing.amountMode,
    // §8.5: a copy takes every field except the receipts.
    atts: mode === "copy" ? [] : [...(editing.atts ?? [])],
    repeat: mode === "edit" && matchRecurring(recurring, editing) !== undefined,
    repeatEvery:
      mode === "edit" ? everyOf(matchRecurring(recurring, editing) ?? {}) : 1,
    settles: editing.settles ?? "",
    paid:
      mode === "edit"
        ? editing.paidOn === null
          ? "open"
          : (editing.paidOn ?? "")
        : "",
    cash: !!editing.cash,
    buyerVatId: editing.buyerVatId ?? "",
    share: editing.share ? String(editing.share) : "",
    // A copy is a new voucher and reverses nothing until it is told to.
    reverses: mode === "edit" ? (editing.reverses ?? "") : "",
    sells: mode === "edit" ? (editing.sells ?? "") : "",
    party: editing.party ?? "",
    // A copy is dated afresh, so the days the original covered no longer fit.
    periodFrom: mode === "edit" ? (editing.periodFrom ?? "") : "",
    periodTo: mode === "edit" ? (editing.periodTo ?? "") : "",
    // A copy is a new bill, which falls due on a day of its own.
    due: mode === "edit" ? (editing.due ?? "") : "",
    // A copy pays the same supplier the same way, but a new bill has its own reference.
    iban: editing.iban ? formatIban(editing.iban) : "",
    reference:
      mode === "edit" && editing.reference
        ? formatReference(editing.reference)
        : "",
  }
}

/**
 * What a supplier fills on a bill from it (§8.30): its IBAN while none is
 * typed, and a due date its payment term away while none is set. Only on an
 * expense not paid on its own date, where the fields exist.
 */
function billDefaults(
  party: Customer | undefined,
  form: Pick<FormState, "type" | "paid" | "date" | "due" | "iban">
): Partial<FormState> {
  if (!party || form.type !== "expense" || form.paid === "") return {}
  if (!partyFitsSide(party, "expense")) return {}
  return {
    ...(party.iban && !form.iban.trim()
      ? { iban: formatIban(party.iban) }
      : {}),
    ...(party.termDays !== null && !form.due && form.date
      ? { due: addDays(form.date, party.termDays) }
      : {}),
  }
}

/**
 * The register keeps the IBAN of a supplier that has none once a bill from it
 * carries one, so the next bill starts with it (§8.29, §8.30).
 */
function rememberSupplierIban(entry: Entry) {
  if (entry.type !== "expense" || !entry.iban || !entry.party) return
  const { customers, setCustomers } = useBookStore.getState()
  const party = customers.find((c) => c.id === entry.party)
  if (!party || party.iban) return
  setCustomers(
    customers.map((c) => (c.id === party.id ? { ...c, iban: entry.iban } : c))
  )
}

/**
 * How a bill received is paid (§8.30): the payee's IBAN and the reference, and
 * a field that reads both, the due date and an untyped amount from a pasted
 * virtual barcode.
 */
function BillPaymentFields({
  form,
  update,
  invalid,
  scan,
}: {
  form: FormState
  update: (patch: Partial<FormState>) => void
  invalid: (field: ErrorField) => true | undefined
  /** Reads the code printed on the attached receipts, when there are any to read. */
  scan?: () => Promise<void>
}) {
  const f = useFormatters()
  const [barcode, setBarcode] = React.useState("")
  const [unread, setUnread] = React.useState(false)
  const [scanning, setScanning] = React.useState(false)

  const readBarcode = (text: string) => {
    setBarcode(text)
    const digits = text.replace(/\s+/g, "")
    if (digits.length < 54) {
      setUnread(false)
      return
    }
    const code = parseVirtualBarcode(digits)
    const iban = code && billIban(code.iban)
    if (!code || !iban) {
      setUnread(true)
      return
    }
    setUnread(false)
    setBarcode("")
    const reference = billReference(code.reference)
    update({
      iban: formatIban(iban),
      ...(reference ? { reference: formatReference(reference) } : {}),
      ...(code.dueDate ? { due: code.dueDate } : {}),
      ...(!form.amount.trim() && code.amount > 0
        ? {
            amount: formatMoneyPlain(code.amount),
            amountMode: "gross" as const,
          }
        : {}),
    })
    toast.add({ title: f.t("entry.barcodeRead") })
  }

  return (
    <>
      <Field data-invalid={unread || undefined}>
        <FieldLabel htmlFor="entry-barcode">{f.t("entry.barcode")}</FieldLabel>
        <Input
          id="entry-barcode"
          inputMode="numeric"
          autoComplete="off"
          value={barcode}
          aria-invalid={unread || undefined}
          onChange={(e) => readBarcode(e.target.value)}
          className="tabular"
        />
        <FieldDescription>
          {f.t(unread ? "entry.barcodeBad" : "entry.barcodeHint")}
        </FieldDescription>
        {scan ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={scanning}
            onClick={async () => {
              setScanning(true)
              try {
                await scan()
              } finally {
                setScanning(false)
              }
            }}
          >
            <ScanBarcodeIcon data-icon="inline-start" />
            {f.t("entry.codeScan")}
          </Button>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={invalid("iban")}>
          <FieldLabel htmlFor="entry-iban">{f.t("entry.iban")}</FieldLabel>
          <Input
            id="entry-iban"
            autoComplete="off"
            spellCheck={false}
            value={form.iban}
            aria-invalid={invalid("iban")}
            onChange={(e) => update({ iban: e.target.value.toUpperCase() })}
            className="tabular"
          />
        </Field>
        <Field data-invalid={invalid("reference")}>
          <FieldLabel htmlFor="entry-reference">
            {f.t("entry.reference")}
          </FieldLabel>
          <Input
            id="entry-reference"
            autoComplete="off"
            spellCheck={false}
            value={form.reference}
            aria-invalid={invalid("reference")}
            onChange={(e) =>
              update({ reference: e.target.value.toUpperCase() })
            }
            className="tabular"
          />
        </Field>
      </div>
    </>
  )
}

/** A button that opens the voucher at the other end of a reversal. */
function LinkedVoucherButton({
  entry,
  fromYear,
  onOpen,
}: {
  entry: Entry
  fromYear: number
  onOpen: (id: string) => void
}) {
  const f = useFormatters()
  const label = reversalLabel(entry, fromYear) || "–"
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="w-fit self-start"
      onClick={() => onOpen(entry.id)}
    >
      {f.t("entry.reversesOpen", { v: label })}
    </Button>
  )
}

export function EntryDialog({
  registerDropTarget,
}: {
  registerDropTarget: (fn: ((files: File[]) => void) | null) => void
}) {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "entry") return null
  /*
   * Keyed on the dialog identity, so opening or switching entry remounts the
   * form and its initial state comes from props, not an effect.
   */
  return (
    <EntryDialogForm
      key={dialog.mode + ":" + (dialog.entryId ?? "new")}
      mode={dialog.mode}
      entryId={dialog.entryId}
      files={dialog.files}
      inboxId={dialog.inboxId}
      prefill={dialog.prefill}
      registerDropTarget={registerDropTarget}
    />
  )
}

function EntryDialogForm({
  mode,
  entryId,
  files,
  inboxId,
  prefill,
  registerDropTarget,
}: {
  mode: "new" | "edit" | "copy"
  entryId?: string
  files?: File[]
  inboxId?: string
  prefill?: EntryPrefill
  registerDropTarget: (fn: ((files: File[]) => void) | null) => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const month = useBookStore((s) => s.month)
  const lastMode = useBookStore((s) => s.lastMode)
  const lastType = useBookStore((s) => s.lastType)

  const closeDialog = useBookStore((s) => s.closeDialog)
  const openDialog = useBookStore((s) => s.openDialog)
  const upsertEntry = useBookStore((s) => s.upsertEntry)
  const setYear = useBookStore((s) => s.setYear)
  const setDraftIds = useBookStore((s) => s.setDraftAttachmentIds)
  const setLastDefaults = useBookStore((s) => s.setLastEntryDefaults)
  const recurring = useBookStore((s) => s.recurring)
  const upsertRecurring = useBookStore((s) => s.upsertRecurring)
  const removeRecurring = useBookStore((s) => s.removeRecurring)
  const vatPeriodKind = useBookStore((s) => s.vatPeriod)
  const customers = useBookStore((s) => s.customers)
  const categoryRules = useBookStore((s) => s.categoryRules)

  // Captured at mount: the form owns its values from here on.
  const [editing] = React.useState(() =>
    entryId ? entries.find((e) => e.id === entryId) : undefined
  )
  // The entry the duplicate hints leave out: itself, while it is edited.
  const editingId = mode === "edit" ? editing?.id : undefined
  const [initial] = React.useState(() =>
    initialForm({
      editing,
      mode,
      year,
      month,
      lastType,
      lastMode,
      recurring,
      prefill,
    })
  )

  const [form, setForm] = React.useState<FormState>(initial)
  const [baseline, setBaseline] = React.useState(() => snapshot(initial))
  /*
   * The message and the field it belongs to: §8.5 shows one inline error
   * line, but the field it is about has to say so too, or a screen reader
   * reads a complaint with nothing attached to it.
   */
  const [error, setError] = React.useState<FieldErrorState>(null)
  const [tab, setTab] = React.useState("details")
  const [busy, setBusy] = React.useState(false)
  // The receipt open in the viewer on top of this dialog, if any (§8.6).
  const [viewing, setViewing] = React.useState<number | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const dateRef = React.useRef<HTMLInputElement>(null)
  const saveKeys = useShortcut()("Enter")
  // Read by the async PDF pre-fill, which must see the form as it is now.
  const formRef = React.useRef(form)
  React.useEffect(() => {
    formRef.current = form
  }, [form])
  /*
   * Set once the rate is one somebody chose: picked from the list, read from
   * an invoice PDF, or saved on the entry being edited or copied. A chosen
   * rate survives picking a category and changing the date; an unchosen one
   * follows the category default and the date (§5).
   */
  const keepRate = React.useRef(mode !== "new")
  /* A share the user typed, or the one an edited voucher has, is not replaced by a category's default. */
  const keepShare = React.useRef(mode !== "new")

  /*
   * Keep freshly attached receipts alive through a GC sweep (§7.4). One still
   * being added is in `pendingIds`: it is registered before its bytes reach
   * IndexedDB, and stays registered until the form holds it.
   */
  const pendingIds = React.useRef(new Set<string>())
  React.useEffect(() => {
    setDraftIds([
      ...form.atts.map((a) => a.id).filter((id): id is string => !!id),
      ...pendingIds.current,
    ])
  }, [form.atts, setDraftIds])

  /**
   * Fill an untouched form from an invoice PDF's text layer. A form the user
   * has typed an amount or a description into is left alone, so adding a
   * receipt to a half-written entry never overwrites it.
   */
  const prefillFromPdf = React.useCallback(
    async (file: File) => {
      let guess
      try {
        const { extractPdfText } = await import("@/lib/browser/pdf")
        guess = parseInvoiceText(await extractPdfText(file))
      } catch {
        return
      }
      const current = formRef.current
      if (isEmptyGuess(guess) || current.amount || current.description) return

      const state = useBookStore.getState()
      /*
       * The user's own rules come first (§8.17), over the seller's earlier
       * entry. The rule reads the seller and the rows, like the hints below,
       * and the account and reference the invoice gives for paying it.
       */
      const ruleHit = findCategoryRule(
        state.categoryRules,
        {
          text: [guess.vendor ?? "", ...guess.items].join(" "),
          iban: guess.iban,
          reference: guess.reference,
        },
        indexCategories(cats)
      )
      const previous = previousEntryFrom(state.entries, guess.vendor)
      const previousCat = ruleHit
        ? {
            type: ruleHit.type,
            catId: ruleHit.catId,
            vatRate:
              ruleHit.vatRate ??
              cats.find((c) => c.id === ruleHit.catId)?.vatRate ??
              0,
          }
        : previous && cats.some((c) => c.id === previous.catId)
          ? previous
          : undefined
      /*
       * Without a previous entry from the same seller, a category guessed
       * from the words on the invoice. Only an enabled one: a disabled
       * category is one the user has said they do not book to.
       */
      const suggestedId = suggestCategory(guess)
      const suggested = previousCat
        ? undefined
        : cats.find((c) => c.id === suggestedId && c.enabled)
      const description = describeInvoice(guess, (number) =>
        f.t("receipt.invoiceDescription", { number })
      )
      /*
       * The rate an EU invoice prints says nothing of the tax the buyer
       * reports, so an EU category keeps the seller's earlier rate (§6.9).
       */
      const euCategory = !!(
        previousCat && cats.find((c) => c.id === previousCat.catId)?.euPurchase
      )
      const readRate = euCategory ? null : (ruleHit?.vatRate ?? guess.vatRate)
      if (readRate != null) keepRate.current = true

      setForm((prev) => ({
        ...prev,
        date: guess.date ?? prev.date,
        description,
        ...(previousCat
          ? { type: previousCat.type, catId: previousCat.catId }
          : suggested
            ? { type: "expense" as const, catId: suggested.id }
            : {}),
        amount: guess.amount != null ? formatMoneyPlain(guess.amount) : "",
        /*
         * A bill not yet due is a bill to pay (§8.30): it opens with its due
         * date and how to pay it. One already past due was most likely paid.
         */
        ...(guess.dueDate &&
        guess.dueDate >= todayIso() &&
        (previousCat?.type ?? (suggested ? "expense" : prev.type)) === "expense"
          ? {
              paid: "open",
              due: guess.dueDate,
              iban: guess.iban ? formatIban(guess.iban) : prev.iban,
              reference: guess.reference
                ? formatReference(guess.reference)
                : prev.reference,
            }
          : {}),
        vatRate:
          readRate ??
          rateOnDate(
            previousCat?.vatRate ?? suggested?.vatRate ?? prev.vatRate,
            guess.date ?? prev.date
          ),
        // An invoice's total includes VAT.
        amountMode: guess.amount != null ? "gross" : prev.amountMode,
      }))
      toast.add({ title: f.t("receipt.prefilled") })
    },
    [cats, f]
  )

  const addFiles = React.useCallback(
    async (files: File[]) => {
      /*
       * The picker's `accept` is only a hint — "all files" defeats it — so
       * the rule is enforced here as well, for files from either source.
       */
      // A file can be dropped on the dialog as well as picked (§8.2).
      const state = useBookStore.getState()
      const current = state.entries.find((e) => e.id === editingId)
      if (current && entryLock(current, state, indexCategories(state.cats))) {
        toast.add({ title: f.t("entry.lockedRefused", { n: 1 }) })
        return
      }
      const accepted = files.filter(isMediaFile)
      if (accepted.length < files.length) {
        toast.add({ title: f.t("receipt.badType") })
      }
      if (!accepted.length) return
      if (!isReceiptStorageSupported()) {
        toast.add({ title: f.t("receipt.noStorage") })
        return
      }
      setBusy(true)
      try {
        const added: Attachment[] = []
        for (const file of accepted) {
          const id = `a-${uid()}`
          pendingIds.current.add(id)
          setDraftIds([...useBookStore.getState().draftAttachmentIds, id])
          try {
            await putReceipt(id, file)
            await rememberReceiptHash(id, file)
            added.push({
              id,
              name: file.name,
              type: file.type,
              size: file.size,
            })
          } catch {
            // Never record an attachment we failed to store.
            pendingIds.current.delete(id)
            toast.add({ title: f.t("receipt.noStorage") })
          }
        }
        if (added.length) {
          for (const att of added) pendingIds.current.delete(att.id as string)
          setForm((prev) => ({ ...prev, atts: [...prev.atts, ...added] }))
          // A hint only: one receipt can cover two entries on purpose.
          const others = useBookStore.getState().entries
          for (const att of added) {
            const other = entryWithReceipt(
              att,
              others,
              editingId,
              useReceiptHashStore.getState().hashes
            )
            if (!other) continue
            toast.add({
              title: f.t("receipt.attachedElsewhere", {
                n: other.voucher ?? "",
                d: other.description || f.t("ledger.noDescription"),
              }),
            })
            break
          }
        }
        const pdf = accepted.find((file) => isPdf(file))
        if (pdf) await prefillFromPdf(pdf)
        /*
         * A bill's printed code fills how it is paid (§8.30) when the PDF's
         * text gave no account. It is read after the receipt is stored, so
         * saving never waits for it.
         */
        const scannable = accepted.find((file) => isScannable(file.type))
        const now = formRef.current
        const untouched = !now.amount && !now.description
        if (
          scannable &&
          !now.iban.trim() &&
          (now.type === "expense" || untouched)
        ) {
          void prefillFromCodeRef.current?.(scannable, false)
        }
      } finally {
        setBusy(false)
      }
    },
    [f, prefillFromPdf, editingId, setDraftIds]
  )

  /*
   * Receipts dropped with no dialog open. The ref keeps a Strict Mode
   * re-run of the effect from attaching them twice.
   */
  const seeded = React.useRef(false)
  React.useEffect(() => {
    if (seeded.current || !files?.length) return
    seeded.current = true
    void addFiles(files)
  }, [files, addFiles])

  // Let the shell forward dropped media here while this dialog is open.
  React.useEffect(() => {
    const handler = (files: File[]) => void addFiles(files)
    registerDropTarget(handler)
    return () => registerDropTarget(null)
  }, [addFiles, registerDropTarget])

  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const usage = React.useMemo(() => categoryUsage(entries), [entries])
  const typeCats = React.useMemo(() => {
    return (
      cats
        .filter((c) => {
          if (categorySide(c) !== form.type) return false
          // The entry's own category stays listed even when disabled (§8.5).
          return c.enabled || c.id === form.catId
        })
        // In the order the settings table lists them (§8.10).
        .sort((a, b) =>
          compareCategories(a, b, (x, y) =>
            f.collator.compare(categoryName(x, f.lang), categoryName(y, f.lang))
          )
        )
    )
  }, [cats, form.type, form.catId, f.collator, f.lang])

  /*
   * The account number and the name, plus the Finnish name when the interface
   * is in English, since that is the one the tax return uses.
   */
  const catOption = (c: Category) => {
    const label = f.catLabel(c)
    return {
      value: c.id,
      label:
        f.lang === "en" && !c.custom && c.name !== f.catName(c)
          ? `${label} · ${c.name}`
          : label,
    }
  }
  const catOptions = typeCats.map(catOption)
  /* A short list needs no shortcut. */
  const topCats =
    typeCats.length > MOST_USED_MIN_LIST
      ? mostUsedCategories(typeCats, usage)
      : []
  const selectedCat = cats.find((c) => c.id === form.catId)
  const changeLog = useBookStore((s) => s.changeLog)
  const history = React.useMemo(
    () =>
      mode === "edit" && editing
        ? changeLog.filter((r) => r.entryId === editing.id)
        : [],
    [changeLog, mode, editing]
  )
  const settlement = !!(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)?.settlement
  )
  const vatFiledMarks = useBookStore((s) => s.vatFiled)
  const yearsArchived = useBookStore((s) => s.yearsArchived)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const traderType = useBookStore((s) => s.traderType)
  const invoices = useBookStore((s) => s.invoices)
  const vatCash = useBookStore((s) => s.vatCash)
  const marks = {
    vatFiled: vatFiledMarks,
    yearsArchived,
    form5Filed,
    traderType,
    invoices,
    vatCash,
  }
  // Read-only apart from the payment date (KPL 2:7, §8.11).
  const lock =
    mode === "edit" && editing ? entryLock(editing, marks, catMap) : null
  const euSale = isEuSaleKind(selectedCat?.kind)

  /* The register entries on this side, and the chosen one whatever its side. */
  const partyOptions = React.useMemo(
    () =>
      customers
        .filter((c) => c.id === form.party || partyFitsSide(c, form.type))
        .sort((a, b) => f.collator.compare(a.name, b.name))
        .map((c) => ({
          value: c.id,
          label: c.city ? `${c.name} · ${c.city}` : c.name,
          haystack: [c.name, c.city, c.vatId].join(" ").toLowerCase(),
        })),
    [customers, form.party, form.type, f.collator]
  )
  /*
   * What the book suggests from the description (§8.5). The category it
   * filled is remembered with where it came from, so the hint under the
   * category stays only while that category is still the chosen one.
   */
  const suggestCtx = React.useMemo(
    () => ({ entries, cats: catMap, rules: categoryRules, parties: customers }),
    [entries, catMap, categoryRules, customers]
  )
  const descSuggestions = React.useMemo(
    () => descriptionSuggestions(form.description, form.type, suggestCtx),
    [form.description, form.type, suggestCtx]
  )
  const [suggested, setSuggested] = React.useState<{
    catId: string
    source: SuggestionSource
  } | null>(null)

  /**
   * The fields a suggested category fills, as picking it by hand would: its
   * rate unless one was chosen, its share unless one was typed, and the
   * counterparty with its bill defaults while none is picked.
   */
  const suggestionPatch = (s: {
    catId: string
    vatRate: number | null
    party?: string
  }): Partial<FormState> | null => {
    const cat = cats.find((c) => c.id === s.catId)
    if (!cat || categorySide(cat) !== form.type) return null
    const party = !form.party
      ? customers.find((c) => c.id === s.party)
      : undefined
    return {
      catId: cat.id,
      vatRate:
        cat.euPurchase || !keepRate.current
          ? rateOnDate(s.vatRate ?? cat.vatRate, form.date)
          : form.vatRate,
      ...(keepShare.current
        ? {}
        : { share: cat.share ? String(cat.share) : "" }),
      ...(party ? { party: party.id, ...billDefaults(party, form) } : {}),
    }
  }

  const pickDescription = (s: (typeof descSuggestions)[number]) => {
    const patch = form.catId ? null : suggestionPatch(s)
    update({ description: s.description, ...patch })
    if (patch) setSuggested({ catId: s.catId, source: "history" })
  }

  /* Leaving the field with no category chosen fills the one the book suggests. */
  const suggestFromDescription = () => {
    if (mode === "edit" || form.catId || !form.description.trim()) return
    const hit = suggestCategoryFor(form.description, form.type, suggestCtx)
    const patch = hit && suggestionPatch(hit)
    if (!hit || !patch) return
    update(patch)
    setSuggested({ catId: hit.catId, source: hit.source })
  }

  /**
   * Fill a bill's payment from the bank barcode or QR code printed on it
   * (§8.30): the account, the reference and the due date, and the amount and
   * the description while they are empty. A bill not yet due, or one with no
   * due date on an untouched form, opens as one to pay. The payee the QR code
   * names suggests a category as a typed description would (§8.5).
   */
  const prefillFromCode = async (file: Blob, announce: boolean) => {
    let code
    try {
      const { readBillCode } = await import("@/lib/browser/barcode")
      code = await readBillCode(file)
    } catch {
      code = null
    }
    if (!code) {
      if (announce) toast.add({ title: f.t("entry.codeNotFound") })
      return false
    }
    const now = formRef.current
    const untouched = !now.amount && !now.description
    const due = code.dueDate ?? now.due
    const toPay = due ? due >= todayIso() : untouched
    const description = now.description.trim()
      ? now.description
      : (code.name ?? code.message ?? "")
    const hit =
      !now.catId && description
        ? suggestCategoryFor(description, "expense", suggestCtx)
        : null
    const cat = hit && cats.find((c) => c.id === hit.catId)
    setForm((prev) => ({
      ...prev,
      type: "expense",
      ...(prev.type !== "expense" ? { catId: "" } : {}),
      iban: formatIban(code.iban),
      ...(code.reference ? { reference: formatReference(code.reference) } : {}),
      ...(code.dueDate ? { due: code.dueDate } : {}),
      ...(toPay && prev.paid === "" ? { paid: "open" } : {}),
      ...(!prev.amount.trim() && code.amount
        ? { amount: formatMoneyPlain(code.amount), amountMode: "gross" }
        : {}),
      description: prev.description.trim() ? prev.description : description,
      ...(hit && cat && !prev.catId
        ? {
            catId: cat.id,
            vatRate: keepRate.current
              ? prev.vatRate
              : rateOnDate(hit.vatRate ?? cat.vatRate, prev.date),
          }
        : {}),
    }))
    if (hit && cat) setSuggested({ catId: cat.id, source: hit.source })
    toast.add({ title: f.t("entry.codeRead") })
    return true
  }
  /* `addFiles` is memoised; it reaches the current closure through this ref. */
  const prefillFromCodeRef = React.useRef<typeof prefillFromCode | null>(null)
  React.useEffect(() => {
    prefillFromCodeRef.current = prefillFromCode
  })

  /** Read the code off the attached receipts, the first that has one. */
  const scanAttachments = async () => {
    for (const att of form.atts) {
      if (!att.id || !isScannable(att.type)) continue
      const blob = await getReceipt(att.id)
      if (blob && (await prefillFromCode(blob, false))) return
    }
    toast.add({ title: f.t("entry.codeNotFound") })
  }

  /** The field is named for the side: a customer on income, else a supplier. */
  const partyLabel = f.t(
    form.type === "income" ? "entry.partyCustomer" : "entry.partySupplier"
  )

  /**
   * Picking a party fills what it knows (§8.29): its category and rate for
   * this side, the description while it is empty, and the buyer's VAT number
   * on an EU sale. A rate somebody chose is kept.
   */
  const pickParty = (id: string) => {
    const party = customers.find((c) => c.id === id)
    if (!party) {
      update({ party: "" })
      return
    }
    const defaults = partyDefaults(party, form.type, catMap)
    const catId = defaults?.catId ?? form.catId
    const cat = cats.find((c) => c.id === catId)
    update({
      party: id,
      ...(form.description.trim() ? {} : { description: party.name }),
      ...(defaults
        ? {
            catId,
            vatRate:
              keepRate.current && !cat?.euPurchase
                ? form.vatRate
                : rateOnDate(defaults.vatRate, form.date),
          }
        : {}),
      ...(isEuSaleKind(cat?.kind) && !form.buyerVatId.trim() && party.vatId
        ? { buyerVatId: party.vatId }
        : {}),
      ...billDefaults(party, form),
    })
  }
  const euPurchase = selectedCat?.euPurchase
  const unpayable = canBeUnpaid(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)
  )
  const ownerTransfer = !!(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)?.owner
  )
  const capitalAsset = !!(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)?.capital
  )
  const assetSale = capitalAsset && form.type === "income"
  /*
   * A cost can be used partly privately (§6.12). A transfer, a settlement, a
   * loan and an EU purchase have no such part.
   */
  const catLine = selectedCat && LINE_BY_KEY.get(selectedCat.line)
  const shareApplies =
    form.type === "expense" &&
    !euPurchase &&
    !!catLine &&
    !catLine.settlement &&
    !catLine.owner &&
    !catLine.loan
  const shareNumber = form.share.trim() === "" ? null : Number(form.share)
  const businessShare =
    shareApplies && isShare(shareNumber) ? shareNumber : undefined
  const shareInvalid =
    shareApplies && shareNumber !== null && !isShare(shareNumber)
  /*
   * A period is for a liikkeenharjoittaja's accrual (§6.3). Both dates or
   * neither, the end not before the start.
   */
  const periodApplies = unpayable && traderType === "business"
  // A due date belongs to a bill received that is not paid on its own date (§8.30).
  const dueApplies = unpayable && form.type === "expense" && form.paid !== ""
  const periodFilled = !!(form.periodFrom || form.periodTo)
  const periodInvalid =
    periodApplies && periodFilled && !isPeriod(form.periodFrom, form.periodTo)
  /*
   * A payment or refund names the return it settles (§6.6). Unchosen, it goes
   * by the date, and the periods offered are those of this year and the last.
   */
  const settledValue =
    form.settles ||
    (form.date ? defaultSettledKey(vatPeriodKind, form.date) : "")
  const settledOptions = React.useMemo(() => {
    const y = form.date ? yearOf(form.date) : year
    const keys = [
      ...vatPeriods(vatPeriodKind, y - 1),
      ...vatPeriods(vatPeriodKind, y),
    ].map((p) => p.key)
    if (settledValue && !keys.includes(settledValue)) keys.push(settledValue)
    return keys.flatMap((key) => {
      const p = periodFromKey(key)
      return p ? [{ value: key, label: periodLabel(f, p) }] : []
    })
  }, [form.date, year, vatPeriodKind, settledValue, f])
  const rateOptions = RATES.includes(form.vatRate)
    ? RATES
    : [...RATES, form.vatRate]
  const dirty = snapshot(form) !== baseline
  // A hint, never a block: corrections can carry an older rate (§5).
  const mismatch = rateMismatch(form.vatRate, form.date)
  const noDeduction = vatNotDeductible({ ...form, euPurchase }, catMap)
  const formAmount = evalAmount(form.amount)

  const splitMates =
    mode === "edit" && editing ? splitSiblings(editing, entries).length : 0
  const entryYear = form.date ? yearOf(form.date) : year
  const reversalOptions = React.useMemo(
    () =>
      reversalCandidates(editingId ?? "", form.date, entries).map((e) => {
        const label = f.t("entry.reversesOption", {
          v: reversalLabel(e, entryYear) || "–",
          d: f.date(e.date),
          x: e.description || f.t("ledger.noDescription"),
          m: f.money(calcEntry(e).gross),
        })
        // The ISO date and the plain amount let "2026-03" or "124,50" match.
        const extra = `${e.date} ${formatMoneyPlain(e.amount)}`
        return {
          value: e.id,
          label,
          haystack: `${label} ${extra}`.toLowerCase(),
        }
      }),
    [editingId, form.date, entries, entryYear, f]
  )
  const sellOptions = React.useMemo(
    () =>
      assetSale
        ? sellCandidates(entries, catMap, form.date).map((e) => {
            const label = f.t("entry.reversesOption", {
              v: reversalLabel(e, entryYear) || "–",
              d: f.date(e.date),
              x: e.description || f.t("ledger.noDescription"),
              m: f.money(calcEntry(e).gross),
            })
            const extra = `${e.date} ${formatMoneyPlain(e.amount)}`
            return {
              value: e.id,
              label,
              haystack: `${label} ${extra}`.toLowerCase(),
            }
          })
        : [],
    [assetSale, entries, catMap, form.date, entryYear, f]
  )
  const sold = entries.find((e) => e.id === form.sells)
  const reversed = entries.find((e) => e.id === form.reverses)
  const reversedBy =
    editingId && editing ? reversingEntries(editing, entries) : []
  const figureGroups = useEntryFigures(editingId)
  const figureCount = figureGroups.reduce((n, g) => n + g.items.length, 0)
  const showHistory = hasHistory(history)
  const paidSummary = unpayable
    ? form.paid === ""
      ? f.t("entry.paidSame")
      : form.paid === "open"
        ? f.t("entry.paidOpenShort")
        : f.date(form.paid)
    : null
  const duplicate =
    formAmount && form.date
      ? duplicateOf(
          {
            id: editingId ?? "",
            date: form.date,
            description: form.description,
            type: form.type,
            catId: form.catId,
            amount: formAmount,
            vatRate: form.vatRate,
            amountMode: form.amountMode,
            euPurchase,
            split: entries.find((e) => e.id === editingId)?.split,
          },
          entries
        )
      : undefined

  /** `true` when this field is the one the error line is complaining about. */
  const invalid = (field: ErrorField) =>
    error?.field === field ? true : undefined

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    /*
     * Clear the complaint as soon as the field it is about is touched,
     * rather than leaving it under a corrected value until the next save.
     */
    setError((prev) => (prev && prev.field in patch ? null : prev))
  }

  /** True when nothing typed would be lost, or the user lets it go. */
  const confirmDiscard = async () => {
    if (!dirty) return true
    const { confirm } = await import("@/lib/ui/confirm")
    return confirm({
      title: f.t("confirm.discardTitle"),
      message: f.t("confirm.discardEntry"),
      confirmLabel: f.t("confirm.discardConfirm"),
      cancelLabel: f.t("confirm.keepEditing"),
    })
  }

  const requestClose = async () => {
    if (await confirmDiscard()) closeDialog()
  }

  /** Switch to the other end of a reversal, once nothing typed would be lost. */
  const openLinked = async (id: string) => {
    if (!(await confirmDiscard())) return
    openDialog({ kind: "entry", mode: "edit", entryId: id })
  }

  const validate = (): Entry | null => {
    if (
      !form.date ||
      !isoDate(
        yearOf(form.date),
        monthOf(form.date),
        Number(form.date.slice(8, 10))
      )
    ) {
      setError({ field: "date", message: f.t("entry.errDate") })
      return null
    }
    const amount = evalAmount(form.amount)
    if (amount == null || amount === 0) {
      setError({ field: "amount", message: f.t("entry.errAmount") })
      return null
    }
    if (!form.catId) {
      setError({ field: "catId", message: f.t("entry.errCategory") })
      return null
    }
    if (shareInvalid) {
      setTab("payment")
      setError({ field: "share", message: f.t("entry.shareBad") })
      return null
    }
    if (periodInvalid) {
      setTab("payment")
      setError({ field: "period", message: f.t("entry.periodBad") })
      return null
    }
    if (dueApplies && form.iban.trim() && !billIban(form.iban)) {
      setTab("payment")
      setError({ field: "iban", message: f.t("entry.ibanBad") })
      return null
    }
    if (dueApplies && form.reference.trim() && !billReference(form.reference)) {
      setTab("payment")
      setError({ field: "reference", message: f.t("entry.referenceBad") })
      return null
    }
    setError(null)
    return {
      id: editing && mode === "edit" ? editing.id : uid(),
      date: form.date,
      description: form.description.trim(),
      type: form.type,
      catId: form.catId,
      amount,
      vatRate: form.vatRate,
      // An EU purchase's amount is always without VAT (§6.9).
      amountMode: euPurchase ? "net" : form.amountMode,
      ...(form.atts.length ? { atts: form.atts } : {}),
      ...(settlement && settledValue ? { settles: settledValue } : {}),
      ...(unpayable && form.paid && form.paid !== form.date
        ? { paidOn: form.paid === "open" ? null : form.paid }
        : {}),
      ...(unpayable && form.cash && form.paid !== "open"
        ? { cash: true as const }
        : {}),
      ...(periodApplies && periodFilled
        ? { periodFrom: form.periodFrom, periodTo: form.periodTo }
        : {}),
      ...(dueApplies && form.due ? { due: form.due } : {}),
      ...(dueApplies && billIban(form.iban)
        ? { iban: billIban(form.iban)! }
        : {}),
      ...(dueApplies && billReference(form.reference)
        ? { reference: billReference(form.reference)! }
        : {}),
      ...(euSale && form.buyerVatId.trim()
        ? { buyerVatId: normalizeVatId(form.buyerVatId) }
        : {}),
      ...(euPurchase ? { euPurchase } : {}),
      ...(businessShare ? { share: businessShare } : {}),
      // A link to an entry that has since been deleted is let go.
      ...(form.reverses && entries.some((e) => e.id === form.reverses)
        ? { reverses: form.reverses }
        : {}),
      ...(assetSale && form.sells && entries.some((e) => e.id === form.sells)
        ? { sells: form.sells }
        : {}),
      // A party since removed from the register is let go.
      ...(form.party && customers.some((c) => c.id === form.party)
        ? { party: form.party }
        : {}),
      // A part stays a part of its receipt; a copy is a new voucher of its own.
      ...(mode === "edit" && editing?.split ? { split: editing.split } : {}),
    }
  }

  const save = async (andNew: boolean) => {
    /*
     * A receipt still being stored is not in the form yet: saving now would
     * leave it out, and "Tallenna ja uusi" would attach it to the next entry.
     */
    if (busy) return
    const entry = validate()
    if (!entry) return
    const closed = lock ? null : lockOn(entry.date, marks)
    if (closed?.kind === "year" || closed?.kind === "form5") {
      setError({
        field: "date",
        message: f.t(
          closed.kind === "year" ? "entry.yearStored" : "entry.yearForm5Filed"
        ),
      })
      return
    }
    if (
      paidChangeHitsForm5(
        mode === "edit" && editing ? paidDate(editing) : null,
        paidDate(entry),
        marks
      )
    ) {
      setError({ field: "date", message: f.t("entry.paidInForm5Year") })
      return
    }

    const entries = useBookStore.getState().entries
    /*
     * A new link to an open voucher that this credit cancels in full settles
     * both (§8.4), unless that would move a payment into a filed Form 5 year.
     */
    const newLink =
      entry.reverses !== undefined &&
      !(mode === "edit" && editing?.reverses === entry.reverses)
    const settled = newLink ? creditSettlement(entry, entries) : null
    const settles =
      settled &&
      !paidChangeHitsForm5(null, paidDate(settled.target), marks) &&
      !paidChangeHitsForm5(paidDate(entry), paidDate(settled.credit), marks)
        ? settled
        : null
    const saved = settles?.credit ?? entry
    const after = (
      entries.some((e) => e.id === saved.id)
        ? entries.map((e) => (e.id === saved.id ? saved : e))
        : [...entries, saved]
    ).map((e) => (settles && e.id === settles.target.id ? settles.target : e))
    if (!(await confirmFiledChange(after))) return

    upsertEntry(saved)
    if (settles) upsertEntry(settles.target)
    rememberSupplierIban(saved)
    /* The inbox item is done once its receipt is on the entry (§8.31). */
    if (inboxId && saved.atts?.length) {
      useBookStore.getState().removeInboxItem(inboxId)
    }
    /*
     * The template follows the entry it was made from, found by the entry as
     * it was before this edit, so renaming the entry does not leave a second
     * template behind.
     */
    const template =
      (mode === "edit" && editing
        ? matchRecurring(recurring, editing)
        : undefined) ?? matchRecurring(recurring, entry)
    if (form.repeat && entry.description) {
      upsertRecurring(
        entryToRecurring(
          entry,
          template?.id ?? uid(),
          template?.from ?? entry.date.slice(0, 7),
          form.repeatEvery
        )
      )
    } else if (mode === "edit" && template) {
      removeRecurring(template.id)
    }
    setLastDefaults({ mode: form.amountMode, type: form.type })
    // §8.5: saving an entry from another year switches the selected year.
    if (yearOf(entry.date) !== year) setYear(yearOf(entry.date))
    if (mode === "edit" && editing) offerEditUndo(ctx, editing, recurring)
    else
      toast.add({
        title: settles
          ? f.t("entry.creditSettled", {
              n: settles.target.voucher ?? "",
              d: f.date(saved.date),
            })
          : f.t("entry.saved"),
      })

    if (andNew) {
      // Keep the date, reset the rest.
      const next: FormState = {
        ...form,
        description: "",
        amount: "",
        catId: "",
        vatRate: 0,
        atts: [],
        repeat: false,
        repeatEvery: 1,
        settles: "",
        paid: "",
        buyerVatId: "",
        share: "",
        reverses: "",
        sells: "",
        party: "",
      }
      keepRate.current = false
      keepShare.current = false
      setForm(next)
      setBaseline(snapshot(next))
      // The next receipt usually starts from its own date.
      dateRef.current?.focus()
    } else {
      closeDialog()
    }
  }

  /*
   * Ctrl/⌘+Enter takes the footer's main way forward (§8.5). It waits for a
   * receipt still being stored, and leaves the viewer on top of this dialog
   * and an open list, whose portals still bubble here, to their own keys.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return
    if (event.altKey || event.shiftKey || viewing != null) return
    if ((event.target as Element).closest('[role="listbox"]')) return
    event.preventDefault()
    void save(mode !== "edit")
  }

  const title =
    mode === "edit"
      ? f.t("entry.editTitle")
      : mode === "copy"
        ? f.t("entry.copyTitle")
        : f.t("ledger.newEntry")

  const countBadge = (n: number) => (
    <span className="tabular rounded-full bg-muted px-1.5 text-xs font-normal">
      {n}
    </span>
  )

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void requestClose()
      }}
    >
      <DialogContent
        className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 pr-10">
            <DialogTitle className="text-base font-semibold">
              {title}
            </DialogTitle>
            {mode === "edit" && editing?.voucher ? (
              <span className="tabular rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                #{editing.voucher}
              </span>
            ) : null}
            {lock ? (
              <InfoPopover
                label={f.t("entry.locked")}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-my-1 text-muted-foreground"
                  >
                    <LockIcon />
                    {f.t("entry.locked")}
                  </Button>
                }
              >
                {f.t(
                  lock.kind === "year"
                    ? "entry.lockedYear"
                    : lock.kind === "form5"
                      ? "entry.lockedForm5"
                      : lock.kind === "form5Paid"
                        ? "entry.lockedForm5Paid"
                        : lock.kind === "invoice"
                          ? "entry.lockedInvoice"
                          : "entry.lockedFiled",
                  { p: lock.key, d: f.date(lock.since) }
                )}
              </InfoPopover>
            ) : null}
          </div>
          {mode === "edit" && editing?.voucher ? (
            <DialogDescription className="sr-only">
              {f.t("entry.voucher", { n: editing.voucher })}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ""
            if (files.length) void addFiles(files)
          }}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* The paper sits on a sunken band, which is what tells it apart:
              it carries no border of its own. The attachments are beside it. */}
          <div className="flex flex-col gap-2 bg-muted/60 px-5 py-4">
            <div className="grid items-stretch gap-4 min-[560px]:grid-cols-[1fr_9.5rem]">
              <ReceiptPreview
                date={form.date}
                description={form.description}
                type={form.type}
                cat={selectedCat}
                amount={formAmount ?? 0}
                vatRate={form.vatRate}
                amountMode={form.amountMode}
                euPurchase={euPurchase}
                share={businessShare}
              />
              <AttachmentGrid
                attachments={form.atts}
                busy={busy}
                onAdd={() => fileRef.current?.click()}
                onOpen={setViewing}
                onRemove={(index) =>
                  update({ atts: form.atts.filter((_, i) => i !== index) })
                }
                readOnly={!!lock}
                className="min-[560px]:min-h-full"
              />
            </div>
            {splitMates > 0 ? (
              <p className="text-sm text-muted-foreground">
                {f.t("entry.splitFilesHint")}
              </p>
            ) : null}
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList className="px-5">
              <TabsTrigger value="details">
                {f.t("entry.tabDetails")}
              </TabsTrigger>
              <TabsTrigger value="payment">
                {f.t("entry.tabPayment")}
                {paidSummary ? (
                  <span className="text-xs font-normal">· {paidSummary}</span>
                ) : null}
              </TabsTrigger>
              {figureCount > 0 ? (
                <TabsTrigger value="figures">
                  {f.t("entry.tabFigures")}
                  {countBadge(figureCount)}
                </TabsTrigger>
              ) : null}
              {showHistory ? (
                <TabsTrigger value="history">
                  {f.t("entry.tabHistory")}
                  {countBadge(history.length)}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="details" className="min-h-72 px-5 py-5">
              <FieldGroup>
                <fieldset disabled={!!lock} className="contents">
                  {/* Type and date share a row, as do amount and VAT below.
                      One column under the compact breakpoint, where a date
                      input with its picker no longer fits half a dialog. */}
                  <div className="grid gap-5 min-[560px]:grid-cols-2">
                    <Field>
                      <FieldLabel>{f.t("common.type")}</FieldLabel>
                      <EntryTypeToggle
                        value={form.type}
                        // The old category belongs to the other side.
                        onChange={(type) => update({ type, catId: "" })}
                      />
                    </Field>

                    <Field data-invalid={invalid("date")}>
                      <FieldLabel htmlFor="entry-date">
                        {f.t("entry.date")}
                      </FieldLabel>
                      <DateInput
                        id="entry-date"
                        ref={dateRef}
                        value={form.date}
                        autoFocus={mode !== "edit"}
                        aria-invalid={invalid("date")}
                        onValueChange={(date) => {
                          /*
                           * A rate the user did not choose follows the date
                           * across a rate change (§5); one they picked stays.
                           */
                          update(
                            keepRate.current
                              ? { date }
                              : {
                                  date,
                                  vatRate: rateOnDate(form.vatRate, date),
                                }
                          )
                        }}
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="entry-desc">
                      {f.t("entry.description")}
                    </FieldLabel>
                    <DescriptionInput
                      id="entry-desc"
                      value={form.description}
                      placeholder={f.t("entry.descriptionPlaceholder")}
                      suggestions={descSuggestions}
                      listLabel={f.t("entry.descriptionSuggestions")}
                      detail={(s) => {
                        const cat = catMap.get(s.catId)
                        return [cat ? f.catLabel(cat) : "", f.money(s.gross)]
                          .filter(Boolean)
                          .join(" · ")
                      }}
                      onChange={(description) => update({ description })}
                      onPick={pickDescription}
                      onBlur={suggestFromDescription}
                    />
                  </Field>

                  {partyOptions.length ? (
                    <Field>
                      <div className="flex items-center gap-1">
                        <FieldLabel>{partyLabel}</FieldLabel>
                        <InfoPopover label={f.t("entry.partyInfo")}>
                          {f.t("entry.partyHint")}
                        </InfoPopover>
                      </div>
                      <VoucherPicker
                        options={partyOptions}
                        value={form.party}
                        onChange={pickParty}
                        label={partyLabel}
                        noneLabel={f.t(
                          form.type === "income"
                            ? "entry.partyNoneCustomer"
                            : "entry.partyNoneSupplier"
                        )}
                        searchPlaceholder={f.t("entry.partySearch")}
                        emptyText={f.t("entry.partyEmpty")}
                        moreText={(n) => f.t("entry.partyMore", { n })}
                      />
                    </Field>
                  ) : null}

                  <Field data-invalid={invalid("catId")}>
                    <div className="flex items-center gap-1">
                      <FieldLabel>{f.t("entry.category")}</FieldLabel>
                      <HelpHint topic={viewHelp("ledger.category")} />
                      {euPurchase ? (
                        <InfoPopover label={f.t("entry.euPurchaseInfo")}>
                          {f.t(
                            euPurchase === "import"
                              ? "entry.importVat"
                              : euPurchase === "reverse"
                                ? "entry.reverseVat"
                                : "entry.euPurchaseVat",
                            {
                              a: f.money(
                                euPurchaseVat({
                                  amount: formAmount ?? 0,
                                  vatRate: form.vatRate,
                                })
                              ),
                              r: f.rate(form.vatRate),
                            }
                          )}
                        </InfoPopover>
                      ) : null}
                    </div>
                    <OptionSelect
                      invalid={invalid("catId")}
                      options={catOptions}
                      featured={{
                        options: topCats.map(catOption),
                        label: f.t("entry.categoryMostUsed"),
                        allLabel: f.t("entry.categoryAll"),
                      }}
                      value={form.catId}
                      onChange={(value) => {
                        const cat = cats.find((c) => c.id === value)
                        // Picking a category pre-fills its default rate (§8.5).
                        update({
                          catId: value,
                          // An EU category hides the rate, so it sets it (§6.9).
                          vatRate:
                            cat && (cat.euPurchase || !keepRate.current)
                              ? rateOnDate(cat.vatRate, form.date)
                              : form.vatRate,
                          // A category's default share fills the field (§6.12).
                          ...(keepShare.current
                            ? {}
                            : { share: cat?.share ? String(cat.share) : "" }),
                        })
                      }}
                      placeholder={f.t("entry.errCategory")}
                      label={f.t("entry.category")}
                    />
                    {suggested && suggested.catId === form.catId ? (
                      <FieldDescription>
                        {f.t(
                          suggested.source === "rule"
                            ? "entry.suggestedByRule"
                            : suggested.source === "party"
                              ? "entry.suggestedByParty"
                              : "entry.suggestedByHistory"
                        )}
                      </FieldDescription>
                    ) : null}
                  </Field>

                  {settlement ? (
                    <Field>
                      <FieldLabel>{f.t("entry.settles")}</FieldLabel>
                      <OptionSelect
                        options={settledOptions}
                        value={settledValue}
                        onChange={(value) => update({ settles: value })}
                        label={f.t("entry.settles")}
                      />
                      <FieldDescription>
                        {f.t("entry.settlesHint")}
                      </FieldDescription>
                    </Field>
                  ) : null}

                  {ownerTransfer ? (
                    <FieldDescription>
                      {f.t("entry.ownerHint")}
                    </FieldDescription>
                  ) : null}

                  {capitalAsset ? (
                    <FieldDescription>
                      {f.t("entry.assetHint")}
                    </FieldDescription>
                  ) : null}

                  {euSale ? (
                    <Field>
                      <FieldLabel htmlFor="entry-buyer-vat">
                        {f.t("entry.buyerVat")}
                      </FieldLabel>
                      <Input
                        id="entry-buyer-vat"
                        value={form.buyerVatId}
                        placeholder="SE556123456701"
                        onChange={(e) => update({ buyerVatId: e.target.value })}
                      />
                      {form.buyerVatId.trim() &&
                      !looksLikeVatId(form.buyerVatId) ? (
                        <FieldDescription className="text-warning">
                          {f.t("entry.buyerVatBad")}
                        </FieldDescription>
                      ) : (
                        <FieldDescription>
                          {f.t("entry.buyerVatHint")}
                        </FieldDescription>
                      )}
                    </Field>
                  ) : null}
                  {euPurchase &&
                  selectedCat &&
                  LINE_BY_KEY.get(selectedCat.line)?.noVatDeduction ? (
                    <Field>
                      <FieldDescription className="text-warning">
                        {f.t("entry.euPurchaseNoDeduction")}
                      </FieldDescription>
                    </Field>
                  ) : null}
                </fieldset>

                <fieldset disabled={!!lock} className="contents">
                  {selectedCat?.line === "313" ||
                  selectedCat?.line === "314" ||
                  selectedCat?.line === "315" ? (
                    <FieldDescription>
                      {f.t("entry.privateUseHint")}
                    </FieldDescription>
                  ) : null}

                  {selectedCat?.line === "335" ? (
                    <FieldDescription>
                      {f.t("entry.payrollHint")}
                    </FieldDescription>
                  ) : null}

                  {/* Paired for the same reason as date and type above. */}
                  <div
                    className={
                      euPurchase
                        ? "grid gap-5"
                        : "grid gap-5 min-[560px]:grid-cols-2"
                    }
                  >
                    <Field data-invalid={invalid("amount")}>
                      <FieldLabel htmlFor="entry-sum">
                        {f.t("entry.amount")}
                      </FieldLabel>
                      <AmountInput
                        id="entry-sum"
                        value={form.amount}
                        aria-invalid={invalid("amount")}
                        onChange={(e) => update({ amount: e.target.value })}
                      />
                      {duplicate ? (
                        <FieldDescription className="text-warning">
                          {f.t("entry.duplicateOf", {
                            n: duplicate.voucher ?? "",
                            d:
                              duplicate.description ||
                              f.t("ledger.noDescription"),
                          })}
                        </FieldDescription>
                      ) : null}
                    </Field>

                    {euPurchase ? null : (
                      <Field>
                        <div className="flex items-center gap-1">
                          <FieldLabel>{f.t("entry.vatRate")}</FieldLabel>
                          <HelpHint topic={viewHelp("entry.vatRate")} />
                        </div>
                        <OptionSelect
                          options={rateOptions.map((rate) => ({
                            value: String(rate),
                            label: f.rate(rate),
                          }))}
                          value={String(form.vatRate)}
                          onChange={(value) => {
                            keepRate.current = true
                            update({ vatRate: Number(value) })
                          }}
                          label={f.t("entry.vatRate")}
                        />
                        {mismatch ? (
                          <FieldDescription className="text-warning">
                            {mismatch.kind === "notYet"
                              ? f.t("entry.rateNotYet", {
                                  r: f.rate(mismatch.rate),
                                  d: f.date(mismatch.since),
                                  s: f.rate(mismatch.suggested),
                                })
                              : f.t("entry.rateEnded", {
                                  r: f.rate(mismatch.rate),
                                  d: f.date(mismatch.until),
                                  s: f.rate(mismatch.suggested),
                                })}
                          </FieldDescription>
                        ) : null}
                        {noDeduction ? (
                          <FieldDescription className="text-warning">
                            {selectedCat?.line === "341"
                              ? f.t("entry.vatNotDeductible341")
                              : f.t("entry.vatNotDeductible")}
                          </FieldDescription>
                        ) : null}
                      </Field>
                    )}
                  </div>

                  {euPurchase ? null : (
                    <Field>
                      <div className="flex items-center gap-1">
                        <FieldLabel>{f.t("entry.amountMode")}</FieldLabel>
                        <InfoPopover label={f.t("entry.amountModeInfo")}>
                          {f.t("entry.amountModeInfoText")}
                        </InfoPopover>
                      </div>
                      <ToggleGroup
                        aria-label={f.t("entry.amountMode")}
                        value={[form.amountMode]}
                        onValueChange={(value) => {
                          const next = value[0] as AmountMode | undefined
                          if (next) update({ amountMode: next })
                        }}
                      >
                        <ToggleGroupItem value="gross">
                          {f.t("common.gross")}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="net">
                          {f.t("common.net")}
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  )}
                </fieldset>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="payment" className="min-h-72 px-5 py-5">
              <FieldGroup>
                {/* The payment date stays open on a locked voucher (§8.11). */}
                <fieldset className="contents">
                  {unpayable ? (
                    <Field>
                      <div className="flex items-center gap-1">
                        <FieldLabel>{f.t("entry.paid")}</FieldLabel>
                        <InfoPopover label={f.t("entry.paidInfo")}>
                          {f.t("entry.paidInfoText")}
                        </InfoPopover>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <OptionSelect
                          options={[
                            { value: "same", label: f.t("entry.paidSame") },
                            { value: "later", label: f.t("entry.paidLater") },
                            { value: "open", label: f.t("entry.paidOpen") },
                          ]}
                          value={
                            form.paid === ""
                              ? "same"
                              : form.paid === "open"
                                ? "open"
                                : "later"
                          }
                          onChange={(value) =>
                            update({
                              ...(value === "same"
                                ? {}
                                : billDefaults(
                                    customers.find((c) => c.id === form.party),
                                    { ...form, paid: "open" }
                                  )),
                              paid:
                                value === "same"
                                  ? ""
                                  : value === "open"
                                    ? "open"
                                    : form.date,
                            })
                          }
                          label={f.t("entry.paid")}
                          className="w-48"
                        />
                        {form.paid && form.paid !== "open" ? (
                          <DateInput
                            aria-label={f.t("entry.paidDate")}
                            value={form.paid}
                            onValueChange={(iso) => update({ paid: iso })}
                            className="w-44"
                          />
                        ) : null}
                      </div>
                      <FieldDescription>
                        {f.t("entry.paidHint")}
                      </FieldDescription>
                      {splitMates > 0 ? (
                        <FieldDescription>
                          {f.t("entry.splitPaidHint")}
                        </FieldDescription>
                      ) : null}
                    </Field>
                  ) : null}

                  {dueApplies ? (
                    <Field>
                      <FieldLabel>{f.t("entry.due")}</FieldLabel>
                      <div className="flex">
                        <DateInput
                          aria-label={f.t("entry.due")}
                          value={form.due}
                          onValueChange={(iso) => update({ due: iso })}
                          className="w-44"
                        />
                      </div>
                      <FieldDescription>
                        {f.t("entry.dueHint")}
                      </FieldDescription>
                    </Field>
                  ) : null}

                  {dueApplies ? (
                    <BillPaymentFields
                      form={form}
                      update={update}
                      invalid={invalid}
                      scan={
                        form.atts.some((a) => a.id && isScannable(a.type))
                          ? scanAttachments
                          : undefined
                      }
                    />
                  ) : null}

                  <fieldset disabled={!!lock} className="contents">
                    {periodApplies ? (
                      <Field data-invalid={invalid("period")}>
                        <div className="flex items-center gap-1">
                          <FieldLabel>{f.t("entry.period")}</FieldLabel>
                          <InfoPopover label={f.t("entry.periodInfo")}>
                            {f.t("entry.periodInfoText")}
                          </InfoPopover>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <DateInput
                            aria-label={f.t("entry.periodFrom")}
                            aria-invalid={invalid("period")}
                            value={form.periodFrom}
                            onValueChange={(iso) => update({ periodFrom: iso })}
                            className="w-44"
                          />
                          <span className="text-sm text-muted-foreground">
                            –
                          </span>
                          <DateInput
                            aria-label={f.t("entry.periodTo")}
                            aria-invalid={invalid("period")}
                            value={form.periodTo}
                            onValueChange={(iso) => update({ periodTo: iso })}
                            className="w-44"
                          />
                        </div>
                        <FieldDescription>
                          {f.t("entry.periodHint")}
                        </FieldDescription>
                      </Field>
                    ) : null}

                    {shareApplies ? (
                      <Field data-invalid={invalid("share")}>
                        <div className="flex items-center gap-1">
                          <FieldLabel htmlFor="entry-share">
                            {f.t("entry.share")}
                          </FieldLabel>
                          <InfoPopover label={f.t("entry.shareInfo")}>
                            {f.t("entry.shareInfoText")}
                          </InfoPopover>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="entry-share"
                            inputMode="numeric"
                            placeholder="100"
                            value={form.share}
                            aria-invalid={invalid("share")}
                            onChange={(e) => {
                              keepShare.current = true
                              update({
                                share: e.target.value.replace(/[^\d]/g, ""),
                              })
                            }}
                            className="tabular w-24 text-right"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </Field>
                    ) : null}

                    <div className="flex flex-col divide-y rounded-lg border">
                      {unpayable && form.paid !== "open" ? (
                        <Field orientation="horizontal" className="p-3">
                          <Checkbox
                            id="entry-cash"
                            checked={form.cash}
                            onCheckedChange={(checked) =>
                              update({ cash: checked === true })
                            }
                          />
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <FieldLabel
                                htmlFor="entry-cash"
                                className="font-normal"
                              >
                                {f.t("entry.cashLabel")}
                              </FieldLabel>
                              <InfoPopover label={f.t("entry.cashInfo")}>
                                {f.t("entry.cashInfoText", {
                                  d: CASH_BOOKING_DAYS,
                                })}
                              </InfoPopover>
                            </div>
                            <FieldDescription>
                              {f.t("entry.cashDesc")}
                            </FieldDescription>
                          </div>
                        </Field>
                      ) : null}

                      <Field orientation="horizontal" className="p-3">
                        <Checkbox
                          id="entry-repeat"
                          checked={form.repeat}
                          onCheckedChange={(checked) =>
                            update({ repeat: checked === true })
                          }
                        />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <FieldLabel
                              htmlFor="entry-repeat"
                              className="font-normal"
                            >
                              {f.t("recurring.repeat")}
                            </FieldLabel>
                            <InfoPopover label={f.t("recurring.repeatInfo")}>
                              {f.t("recurring.repeatHint")}
                            </InfoPopover>
                          </div>
                          <FieldDescription>
                            {f.t("entry.repeatDesc")}
                          </FieldDescription>
                          {form.repeat ? (
                            <OptionSelect
                              size="sm"
                              className="mt-1 w-44"
                              label={f.t("recurring.every")}
                              value={String(form.repeatEvery)}
                              onChange={(v) =>
                                update({ repeatEvery: Number(v) })
                              }
                              options={ENTRY_EVERY.map((n) => ({
                                value: String(n),
                                label: everyLabel(f, n),
                              }))}
                            />
                          ) : null}
                        </div>
                      </Field>
                    </div>

                    {assetSale ? (
                      <Field>
                        <div className="flex items-center gap-1">
                          <FieldLabel>{f.t("entry.sells")}</FieldLabel>
                          <InfoPopover label={f.t("entry.sellsInfo")}>
                            {f.t("entry.sellsInfoText")}
                          </InfoPopover>
                        </div>
                        <VoucherPicker
                          options={sellOptions}
                          value={sold ? form.sells : ""}
                          label={f.t("entry.sells")}
                          noneLabel={f.t("entry.sellsNone")}
                          searchPlaceholder={f.t("entry.reversesSearch")}
                          emptyText={f.t("entry.reversesEmpty")}
                          moreText={(n) => f.t("entry.reversesMore", { n })}
                          onChange={(value) => update({ sells: value })}
                        />
                      </Field>
                    ) : null}

                    <Field>
                      <div className="flex items-center gap-1">
                        <FieldLabel>{f.t("entry.reverses")}</FieldLabel>
                        <InfoPopover label={f.t("entry.reversesInfo")}>
                          {f.t("entry.reversesInfoText")}
                        </InfoPopover>
                      </div>
                      <VoucherPicker
                        options={reversalOptions}
                        value={reversed ? form.reverses : ""}
                        label={f.t("entry.reverses")}
                        noneLabel={f.t("entry.reversesNone")}
                        searchPlaceholder={f.t("entry.reversesSearch")}
                        emptyText={f.t("entry.reversesEmpty")}
                        moreText={(n) => f.t("entry.reversesMore", { n })}
                        onChange={(value) => update({ reverses: value })}
                      />
                    </Field>
                  </fieldset>
                </fieldset>

                {reversed ? (
                  <LinkedVoucherButton
                    entry={reversed}
                    fromYear={entryYear}
                    onOpen={openLinked}
                  />
                ) : null}
                {reversedBy.length > 0 ? (
                  <Field>
                    <FieldLabel>{f.t("entry.reversedBy")}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {reversedBy.map((e) => (
                        <LinkedVoucherButton
                          key={e.id}
                          entry={e}
                          fromYear={entryYear}
                          onOpen={openLinked}
                        />
                      ))}
                    </div>
                  </Field>
                ) : null}
              </FieldGroup>
            </TabsContent>

            {figureCount > 0 ? (
              <TabsContent value="figures" className="min-h-72 px-5 py-5">
                <EntryFigureList groups={figureGroups} />
              </TabsContent>
            ) : null}

            {showHistory ? (
              <TabsContent value="history" className="min-h-72 px-5 py-5">
                <EntryHistory
                  records={history}
                  cats={catMap}
                  onRestore={
                    editing
                      ? (index, when) =>
                          void restoreEntryVersion(
                            ctx,
                            editing.id,
                            index,
                            when
                          ).then((done) => done && closeDialog())
                      : undefined
                  }
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>

        {error ? (
          <div className="px-5 pt-3">
            <FieldError>{error.message}</FieldError>
          </div>
        ) : null}

        <DialogFooter className="m-0 flex-row flex-wrap items-center gap-2 bg-popover px-5 py-3">
          {mode === "edit" && editing ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={f.t("entry.moreActions")}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="min-w-48"
              >
                <DropdownMenuItem
                  onClick={async () => {
                    // A credit is of the saved voucher, not of what is typed here.
                    if (!lock && !(await confirmDiscard())) return
                    openDialog({
                      kind: "entry",
                      mode: "new",
                      prefill: {
                        date: todayIso(),
                        description: f.t("entry.correctionOf", {
                          n: editing.voucher ?? "",
                          x: editing.description,
                        }),
                        type: editing.type,
                        catId: editing.catId,
                        amount: -editing.amount,
                        vatRate: editing.vatRate,
                        amountMode: editing.amountMode,
                        reverses: editing.id,
                        ...(editing.party ? { party: editing.party } : {}),
                        ...(editing.buyerVatId
                          ? { buyerVatId: editing.buyerVatId }
                          : {}),
                        ...(editing.share ? { share: editing.share } : {}),
                      },
                    })
                  }}
                >
                  <Undo2Icon />
                  {f.t("entry.correction")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    // A copy is of the saved entry, not of what is typed here.
                    if (await confirmDiscard()) {
                      openDialog({
                        kind: "entry",
                        mode: "copy",
                        entryId: editing.id,
                      })
                    }
                  }}
                >
                  <CopyIcon />
                  {f.t("entry.copyAction")}
                </DropdownMenuItem>
                {!lock &&
                canSplitLine(editing.catId, catMap, editing.euPurchase) ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      // A split is of the saved voucher, not of what is typed here.
                      if (await confirmDiscard()) {
                        openDialog({ kind: "split", entryId: editing.id })
                      }
                    }}
                  >
                    <SplitIcon />
                    {f.t("entry.splitAction")}
                  </DropdownMenuItem>
                ) : null}
                {!lock && splitMates > 0 ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      // Merging works on the saved voucher, not what is typed here.
                      if (!(await confirmDiscard())) return
                      if (await mergeSplit(ctx, editing)) closeDialog()
                    }}
                  >
                    <MergeIcon />
                    {f.t("entry.splitMergeAction")}
                  </DropdownMenuItem>
                ) : null}
                {lock ? null : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={async () => {
                        if (await deleteEntry(ctx, editing)) closeDialog()
                      }}
                    >
                      <Trash2Icon />
                      {f.t("entry.deleteAction")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void requestClose()}>
              {f.t("common.cancel")}
            </Button>
            {mode !== "edit" ? (
              <Button
                variant="secondary"
                disabled={busy}
                aria-keyshortcuts={saveKeys.aria}
                onClick={() => void save(true)}
              >
                {f.t("entry.saveAndNew")}
                {saveKeys.label ? (
                  <Keys className="hidden min-[900px]:inline">
                    {saveKeys.label}
                  </Keys>
                ) : null}
              </Button>
            ) : null}
            <Button
              disabled={busy}
              aria-keyshortcuts={mode === "edit" ? saveKeys.aria : undefined}
              onClick={() => void save(false)}
            >
              {f.t("common.save")}
            </Button>
          </div>
        </DialogFooter>

        {viewing != null ? (
          <AttachmentViewer
            attachments={form.atts}
            index={viewing}
            onIndexChange={setViewing}
            onClose={() => setViewing(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
