"use client"

import * as React from "react"
import { CopyIcon, Trash2Icon } from "lucide-react"

import { EntryTypeToggle } from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { AttachmentGrid } from "@/components/entry/attachment-grid"
import { ReceiptPreview } from "@/components/entry/receipt-preview"
import { AttachmentViewer } from "@/components/receipt/receipt-viewer"
import { Button } from "@/components/ui/button"
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { isMediaFile } from "@/hooks/use-file-drop"
import { prepareImage } from "@/lib/browser/prep-image"
import {
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { RATES, categoryName } from "@/lib/domain/accounts"
import {
  describeInvoice,
  isEmptyGuess,
  parseInvoiceText,
  previousEntryFrom,
  suggestCategory,
} from "@/lib/domain/invoice-text"
import { isPdf } from "@/lib/domain/receipt-path"
import { isoDate, monthOf, todayIso, yearOf } from "@/lib/domain/dates"
import { rateMismatch, rateOnDate } from "@/lib/domain/vat-rates"
import { uid } from "@/lib/domain/id"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { deleteEntry } from "@/lib/commands/book-commands"
import { categoryAccount, categorySide } from "@/stores/selectors"
import type {
  AmountMode,
  Attachment,
  Entry,
  EntryType,
} from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

interface FormState {
  date: string
  description: string
  type: EntryType
  catId: string
  amount: string
  vatRate: number
  amountMode: AmountMode
  atts: Attachment[]
}

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
}: {
  editing: Entry | undefined
  mode: "new" | "edit" | "copy"
  year: number
  month: number
  lastType: EntryType
  lastMode: AmountMode
}): FormState {
  if (!editing || mode === "new") {
    return {
      date: defaultDate(year, month),
      description: "",
      type: lastType,
      catId: "",
      amount: "",
      vatRate: 0,
      amountMode: lastMode,
      atts: [],
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
      registerDropTarget={registerDropTarget}
    />
  )
}

function EntryDialogForm({
  mode,
  entryId,
  files,
  registerDropTarget,
}: {
  mode: "new" | "edit" | "copy"
  entryId?: string
  files?: File[]
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

  // Captured at mount: the form owns its values from here on.
  const [editing] = React.useState(() =>
    entryId ? entries.find((e) => e.id === entryId) : undefined
  )
  const [initial] = React.useState(() =>
    initialForm({ editing, mode, year, month, lastType, lastMode })
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

  // Keep freshly attached receipts alive through a GC sweep (§7.4).
  React.useEffect(() => {
    setDraftIds(form.atts.map((a) => a.id).filter((id): id is string => !!id))
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
      if (guess.vatRate != null) keepRate.current = true

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
          guess.vatRate ??
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
          const prepared = await prepareImage(file)
          const id = `a-${uid()}`
          try {
            await putReceipt(id, prepared.blob)
            added.push({
              id,
              name: prepared.name,
              type: prepared.type,
              size: prepared.blob.size,
            })
          } catch {
            // Never record an attachment we failed to store.
            toast.add({ title: f.t("receipt.noStorage") })
          }
        }
        if (added.length) {
          setForm((prev) => ({ ...prev, atts: [...prev.atts, ...added] }))
        }
        const pdf = accepted.find((file) => isPdf(file))
        if (pdf) await prefillFromPdf(pdf)
      } finally {
        setBusy(false)
      }
    },
    [f, prefillFromPdf]
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

  const typeCats = React.useMemo(() => {
    return (
      cats
        .filter((c) => {
          if (categorySide(c) !== form.type) return false
          // The entry's own category stays listed even when disabled (§8.5).
          return c.enabled || c.id === form.catId
        })
        /* By account number, as the settings table lists them (§8.10), with the
         * name deciding the several categories that share one account.
         */
        .sort(
          (a, b) =>
            categoryAccount(a) - categoryAccount(b) ||
            f.collator.compare(categoryName(a, f.lang), categoryName(b, f.lang))
        )
    )
  }, [cats, form.type, form.catId, f.collator, f.lang])

  const catOptions = typeCats.map((c) => ({
    value: c.id,
    label: f.catLabel(c),
  }))
  const selectedCat = cats.find((c) => c.id === form.catId)
  const rateOptions = RATES.includes(form.vatRate)
    ? RATES
    : [...RATES, form.vatRate]
  const dirty = snapshot(form) !== baseline
  // A hint, never a block: corrections can carry an older rate (§5).
  const mismatch = rateMismatch(form.vatRate, form.date)

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

  const requestClose = async () => {
    if (!dirty) {
      closeDialog()
      return
    }
    const { confirm } = await import("@/lib/ui/confirm")
    const discard = await confirm({
      title: f.t("confirm.discardTitle"),
      message: f.t("confirm.discardEntry"),
      confirmLabel: f.t("confirm.discardConfirm"),
      cancelLabel: f.t("confirm.keepEditing"),
    })
    if (discard) closeDialog()
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
      amountMode: form.amountMode,
      ...(form.atts.length ? { atts: form.atts } : {}),
    }
  }

  const save = (andNew: boolean) => {
    const entry = validate()
    if (!entry) return

    upsertEntry(entry)
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
      }
      keepRate.current = false
      setForm(next)
      setBaseline(snapshot(next))
    } else {
      closeDialog()
    }
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
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ""
            if (files.length) void addFiles(files)
          }}
        />

        <div className="grid gap-6 md:grid-cols-[1fr_17rem]">
          <FieldGroup>
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
                  type="date"
                  value={form.date}
                  autoFocus={mode === "copy"}
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
              <FieldLabel>{f.t("entry.category")}</FieldLabel>
              <OptionSelect
                invalid={invalid("catId")}
                options={catOptions}
                value={form.catId}
                onChange={(value) => {
                  const cat = cats.find((c) => c.id === value)
                  // Picking a category pre-fills its default rate (§8.5).
                  update({
                    catId: value,
                    vatRate:
                      cat && !keepRate.current
                        ? rateOnDate(cat.vatRate, form.date)
                        : form.vatRate,
                  })
                }}
                placeholder={f.t("entry.errCategory")}
                label={f.t("entry.category")}
              />
            </Field>

            {/* Paired for the same reason as date and type above. */}
            <div className="grid gap-5 min-[560px]:grid-cols-2">
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
              </Field>

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
              </Field>
            </div>

            <Field>
              <FieldLabel>{f.t("entry.amountMode")}</FieldLabel>
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

            <FieldError>{error?.message}</FieldError>
          </FieldGroup>

          {/* The prototype's `.receipt-wrap`: the paper sits on a sunken
              surface, which is what tells it apart now that it carries no
              border of its own. */}
          <div className="flex flex-col gap-4 rounded-lg bg-muted/60 p-4">
            <ReceiptPreview
              date={form.date}
              description={form.description}
              type={form.type}
              cat={selectedCat}
              amount={parseAmount(form.amount) ?? 0}
              vatRate={form.vatRate}
              amountMode={form.amountMode}
            />
            <AttachmentGrid
              attachments={form.atts}
              busy={busy}
              onAdd={() => fileRef.current?.click()}
              onOpen={setViewing}
              onRemove={(index) =>
                update({ atts: form.atts.filter((_, i) => i !== index) })
              }
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap">
          {mode === "edit" && editing ? (
            <>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (await deleteEntry(ctx, editing)) closeDialog()
                }}
              >
                <Trash2Icon data-icon="inline-start" />
                {f.t("common.delete")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  openDialog({
                    kind: "entry",
                    mode: "copy",
                    entryId: editing.id,
                  })
                }
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
              <Button variant="secondary" onClick={() => save(true)}>
                {f.t("entry.saveAndNew")}
              </Button>
            ) : null}
            <Button onClick={() => save(false)}>{f.t("common.save")}</Button>
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
