"use client"

import * as React from "react"
import { CopyIcon, LockIcon, Trash2Icon } from "lucide-react"

import { EntryTypeToggle } from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { InfoPopover } from "@/components/common/info-popover"
import { Keys } from "@/components/common/keys"
import { AttachmentGrid } from "@/components/entry/attachment-grid"
import { EntryHistory } from "@/components/entry/entry-history"
import { ReceiptPreview } from "@/components/entry/receipt-preview"
import { AttachmentViewer } from "@/components/receipt/receipt-viewer"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
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
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import {
  LINE_BY_KEY,
  RATES,
  categoryName,
  isEuSaleKind,
} from "@/lib/domain/accounts"
import { euPurchaseVat } from "@/lib/domain/calc"
import {
  describeInvoice,
  isEmptyGuess,
  parseInvoiceText,
  previousEntryFrom,
  suggestCategory,
} from "@/lib/domain/invoice-text"
import {
  duplicateOf,
  entryWithReceipt,
  vatNotDeductible,
} from "@/lib/domain/entry-checks"
import { isPdf } from "@/lib/domain/receipt-path"
import { isoDate, monthOf, todayIso, yearOf } from "@/lib/domain/dates"
import { rateMismatch, rateOnDate } from "@/lib/domain/vat-rates"
import { uid } from "@/lib/domain/id"
import { periodFromKey, vatPeriods } from "@/lib/domain/vat-deadline"
import { defaultSettledKey } from "@/lib/domain/vat-settlement"
import { periodLabel } from "@/lib/i18n/period-label"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { deleteEntry } from "@/lib/commands/book-commands"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { categorySide, compareCategories } from "@/stores/selectors"
import type {
  AmountMode,
  Attachment,
  Entry,
  EntryType,
} from "@/lib/domain/types"
import { indexCategories } from "@/lib/domain/types"
import {
  entryToRecurring,
  matchRecurring,
  type RecurringEntry,
} from "@/lib/domain/recurring"
import { useBookStore, type EntryPrefill } from "@/stores/book-store"

interface FormState {
  date: string
  description: string
  type: EntryType
  catId: string
  amount: string
  vatRate: number
  amountMode: AmountMode
  atts: Attachment[]
  /** Keep this entry as a monthly template (§8.5). */
  repeat: boolean
  /** The VAT period a payment or refund settles, "" to go by the date (§6.6). */
  settles: string
  /** "" when paid on the date, "open" while unpaid, else the payment date (§6.3). */
  paid: string
  /** The buyer's VAT number on an EU sale (§8.7). */
  buyerVatId: string
  /** What an EU purchase bought, "" for any other entry (§6.9). */
}

/** The rate an EU purchase starts from when its category is at 0 %. */

/** The three fields §8.5 validates, named as they are in `FormState`. */
type ErrorField = "date" | "amount" | "catId"

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
    return {
      date: prefill?.date ?? defaultDate(year, month),
      description: prefill?.description ?? "",
      type: prefill?.type ?? lastType,
      catId: prefill?.catId ?? "",
      amount: prefill?.amount ? formatMoneyPlain(prefill.amount) : "",
      vatRate: prefill?.vatRate ?? 0,
      amountMode: prefill?.amountMode ?? lastMode,
      atts: [],
      repeat: false,
      settles: prefill?.settles ?? "",
      paid: "",
      buyerVatId: "",
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
    settles: editing.settles ?? "",
    paid:
      mode === "edit"
        ? editing.paidOn === null
          ? "open"
          : (editing.paidOn ?? "")
        : "",
    buyerVatId: editing.buyerVatId ?? "",
  }
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
      prefill={dialog.prefill}
      registerDropTarget={registerDropTarget}
    />
  )
}

function EntryDialogForm({
  mode,
  entryId,
  files,
  prefill,
  registerDropTarget,
}: {
  mode: "new" | "edit" | "copy"
  entryId?: string
  files?: File[]
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

      const previous = previousEntryFrom(
        useBookStore.getState().entries,
        guess.vendor
      )
      const previousCat =
        previous && cats.some((c) => c.id === previous.catId)
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
      const readRate = euCategory ? null : guess.vatRate
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
            const other = entryWithReceipt(att, others, editingId)
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

  const catOptions = typeCats.map((c) => ({
    value: c.id,
    label: f.catLabel(c),
  }))
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
  const marks = { vatFiled: vatFiledMarks, yearsArchived, form5Filed }
  // Read-only apart from the payment date (KPL 2:7, §8.11).
  const lock =
    mode === "edit" && editing ? entryLock(editing, marks, catMap) : null
  const euSale = isEuSaleKind(selectedCat?.kind)
  const euPurchase = selectedCat?.euPurchase
  const unpayable = canBeUnpaid(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)
  )
  const ownerTransfer = !!(
    selectedCat && LINE_BY_KEY.get(selectedCat.line)?.owner
  )
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
  const formAmount = parseAmount(form.amount)
  const duplicate =
    formAmount && form.date
      ? duplicateOf(
          {
            id: editingId ?? "",
            date: form.date,
            description: "",
            type: form.type,
            catId: form.catId,
            amount: formAmount,
            vatRate: form.vatRate,
            amountMode: form.amountMode,
            euPurchase,
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
    const amount = parseAmount(form.amount)
    if (amount == null || amount === 0) {
      setError({ field: "amount", message: f.t("entry.errAmount") })
      return null
    }
    if (!form.catId) {
      setError({ field: "catId", message: f.t("entry.errCategory") })
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
      ...(euSale && form.buyerVatId.trim()
        ? { buyerVatId: normalizeVatId(form.buyerVatId) }
        : {}),
      ...(euPurchase ? { euPurchase } : {}),
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
        mode === "edit" && editing ? paidDate(editing) : paidDate(entry),
        paidDate(entry),
        marks
      )
    ) {
      setError({ field: "date", message: f.t("entry.paidInForm5Year") })
      return
    }

    const entries = useBookStore.getState().entries
    const after = entries.some((e) => e.id === entry.id)
      ? entries.map((e) => (e.id === entry.id ? entry : e))
      : [...entries, entry]
    if (!(await confirmFiledChange(after))) return

    upsertEntry(entry)
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
          template?.from ?? entry.date.slice(0, 7)
        )
      )
    } else if (mode === "edit" && template) {
      removeRecurring(template.id)
    }
    setLastDefaults({ mode: form.amountMode, type: form.type })
    // §8.5: saving an entry from another year switches the selected year.
    if (yearOf(entry.date) !== year) setYear(yearOf(entry.date))
    toast.add({
      title: mode === "edit" ? f.t("entry.changesSaved") : f.t("entry.saved"),
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
        settles: "",
        paid: "",
        buyerVatId: "",
      }
      keepRate.current = false
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

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void requestClose()
      }}
    >
      <DialogContent
        className="max-h-[92svh] overflow-y-auto sm:max-w-3xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
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
                      : "entry.lockedFiled",
                  { p: lock.key, d: f.date(lock.since) }
                )}
              </InfoPopover>
            ) : null}
          </div>
          {mode === "edit" && editing?.voucher ? (
            <DialogDescription className="tabular">
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

        <div className="grid gap-6 md:grid-cols-[1fr_17rem]">
          <FieldGroup>
            <fieldset disabled={!!lock} className="contents">
              {/*
               * Date and type share a row: both are narrow, and pairing them
               * keeps the form short enough that the receipt preview beside it
               * does not stand alone. One column below the compact breakpoint,
               * where a date input with its picker no longer fits half a dialog.
               */}
              <div className="grid gap-5 min-[560px]:grid-cols-2">
                <Field data-invalid={invalid("date")}>
                  <FieldLabel htmlFor="entry-date">
                    {f.t("entry.date")}
                  </FieldLabel>
                  <Input
                    id="entry-date"
                    ref={dateRef}
                    type="date"
                    value={form.date}
                    autoFocus={mode !== "edit"}
                    aria-invalid={invalid("date")}
                    onChange={(e) => {
                      const date = e.target.value
                      /*
                       * A rate the user did not choose follows the date across
                       * a rate change (§5); one they picked stays.
                       */
                      update(
                        keepRate.current
                          ? { date }
                          : { date, vatRate: rateOnDate(form.vatRate, date) }
                      )
                    }}
                  />
                </Field>

                <Field>
                  <FieldLabel>{f.t("common.type")}</FieldLabel>
                  <EntryTypeToggle
                    value={form.type}
                    // The old category belongs to the other side.
                    onChange={(type) => update({ type, catId: "" })}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="entry-desc">
                  {f.t("entry.description")}
                </FieldLabel>
                <Input
                  id="entry-desc"
                  value={form.description}
                  placeholder={f.t("entry.descriptionPlaceholder")}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Field>

              <Field data-invalid={invalid("catId")}>
                <div className="flex items-center gap-1">
                  <FieldLabel>{f.t("entry.category")}</FieldLabel>
                  {euPurchase ? (
                    <InfoPopover label={f.t("entry.euPurchaseInfo")}>
                      {f.t("entry.euPurchaseVat", {
                        a: f.money(
                          euPurchaseVat({
                            amount: formAmount ?? 0,
                            vatRate: form.vatRate,
                          })
                        ),
                        r: f.rate(form.vatRate),
                      })}
                    </InfoPopover>
                  ) : null}
                </div>
                <OptionSelect
                  invalid={invalid("catId")}
                  options={catOptions}
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
                    })
                  }}
                  placeholder={f.t("entry.errCategory")}
                  label={f.t("entry.category")}
                />
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
                <FieldDescription>{f.t("entry.ownerHint")}</FieldDescription>
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
                    <Input
                      type="date"
                      aria-label={f.t("entry.paidDate")}
                      value={form.paid}
                      onChange={(e) => update({ paid: e.target.value })}
                      className="w-44"
                    />
                  ) : null}
                </div>
                <FieldDescription>{f.t("entry.paidHint")}</FieldDescription>
              </Field>
            ) : null}

            <fieldset disabled={!!lock} className="contents">
              {selectedCat?.line === "313" ||
              selectedCat?.line === "314" ||
              selectedCat?.line === "315" ? (
                <FieldDescription>
                  {f.t("entry.privateUseHint")}
                </FieldDescription>
              ) : null}

              {selectedCat?.line === "335" ? (
                <FieldDescription>{f.t("entry.payrollHint")}</FieldDescription>
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
                  <Input
                    id="entry-sum"
                    inputMode="decimal"
                    value={form.amount}
                    aria-invalid={invalid("amount")}
                    onChange={(e) => update({ amount: e.target.value })}
                    className="tabular text-right"
                  />
                  {duplicate ? (
                    <FieldDescription className="text-warning">
                      {f.t("entry.duplicateOf", {
                        n: duplicate.voucher ?? "",
                        d: duplicate.description || f.t("ledger.noDescription"),
                      })}
                    </FieldDescription>
                  ) : null}
                </Field>

                {euPurchase ? null : (
                  <Field>
                    <FieldLabel>{f.t("entry.vatRate")}</FieldLabel>
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

              <Field orientation="horizontal">
                <Checkbox
                  id="entry-repeat"
                  checked={form.repeat}
                  onCheckedChange={(checked) =>
                    update({ repeat: checked === true })
                  }
                />
                <div className="flex items-center gap-1">
                  <FieldLabel htmlFor="entry-repeat" className="font-normal">
                    {f.t("recurring.repeat")}
                  </FieldLabel>
                  <InfoPopover label={f.t("recurring.repeatInfo")}>
                    {f.t("recurring.repeatHint")}
                  </InfoPopover>
                </div>
              </Field>
            </fieldset>

            <FieldError>{error?.message}</FieldError>

            <EntryHistory records={history} cats={catMap} />
          </FieldGroup>

          {/* The paper sits on a sunken surface, which is what tells it
              apart: it carries no border of its own. */}
          <div className="flex flex-col gap-4 rounded-lg bg-muted/60 p-4">
            <ReceiptPreview
              date={form.date}
              description={form.description}
              type={form.type}
              cat={selectedCat}
              amount={parseAmount(form.amount) ?? 0}
              vatRate={form.vatRate}
              amountMode={form.amountMode}
              euPurchase={euPurchase}
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
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap">
          {mode === "edit" && editing ? (
            <>
              {lock ? (
                <Button
                  variant="outline"
                  onClick={() =>
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
                      },
                    })
                  }
                >
                  {f.t("entry.correction")}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (await deleteEntry(ctx, editing)) closeDialog()
                  }}
                >
                  <Trash2Icon data-icon="inline-start" />
                  {f.t("common.delete")}
                </Button>
              )}
              <Button
                variant="outline"
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
                <CopyIcon data-icon="inline-start" />
                {f.t("ledger.copyAsNew")}
              </Button>
            </>
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
