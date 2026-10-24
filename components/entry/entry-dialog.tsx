"use client"

import * as React from "react"
import { CopyIcon, Trash2Icon } from "lucide-react"

import { AttachmentGrid } from "@/components/entry/attachment-grid"
import { ReceiptPreview } from "@/components/entry/receipt-preview"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { prepareImage } from "@/lib/browser/prep-image"
import {
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { RATES, categoryName } from "@/lib/domain/accounts"
import { isoDate, monthOf, todayIso, yearOf } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { deleteEntry } from "@/lib/commands/book-commands"
import { categorySide } from "@/stores/selectors"
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
  // Keyed on the dialog identity, so opening or switching entry remounts
  // the form and its initial state comes from props, not an effect.
  return (
    <EntryDialogForm
      key={dialog.mode + ":" + (dialog.entryId ?? "new")}
      mode={dialog.mode}
      entryId={dialog.entryId}
      registerDropTarget={registerDropTarget}
    />
  )
}

function EntryDialogForm({
  mode,
  entryId,
  registerDropTarget,
}: {
  mode: "new" | "edit" | "copy"
  entryId?: string
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
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Keep freshly attached receipts alive through a GC sweep (§7.4).
  React.useEffect(() => {
    setDraftIds(form.atts.map((a) => a.id).filter((id): id is string => !!id))
  }, [form.atts, setDraftIds])

  const addFiles = React.useCallback(
    async (files: File[]) => {
      if (!isReceiptStorageSupported()) {
        toast.add({ title: f.t("att_noDb") })
        return
      }
      setBusy(true)
      try {
        const added: Attachment[] = []
        for (const file of files) {
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
            toast.add({ title: f.t("att_noDb") })
          }
        }
        if (added.length) {
          setForm((prev) => ({ ...prev, atts: [...prev.atts, ...added] }))
        }
      } finally {
        setBusy(false)
      }
    },
    [f]
  )

  // Let the shell forward dropped media here while this dialog is open.
  React.useEffect(() => {
    const handler = (files: File[]) => void addFiles(files)
    registerDropTarget(handler)
    return () => registerDropTarget(null)
  }, [addFiles, registerDropTarget])

  const typeCats = React.useMemo(() => {
    return cats
      .filter((c) => {
        if (categorySide(c) !== form.type) return false
        // The entry's own category stays listed even when disabled (§8.5).
        return c.enabled || c.id === form.catId
      })
      .sort((a, b) =>
        f.collator.compare(categoryName(a, f.lang), categoryName(b, f.lang))
      )
  }, [cats, form.type, form.catId, f.collator, f.lang])

  const catItems = Object.fromEntries(
    typeCats.map((c) => [c.id, f.catLabel(c)])
  )
  const selectedCat = cats.find((c) => c.id === form.catId)
  const rateOptions = RATES.includes(form.vatRate)
    ? RATES
    : [...RATES, form.vatRate]
  const dirty = snapshot(form) !== baseline

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const requestClose = async () => {
    if (!dirty) {
      closeDialog()
      return
    }
    const { confirm } = await import("@/lib/ui/confirm")
    const discard = await confirm({
      title: f.t("discardT"),
      message: f.t("discardEntry"),
      confirmLabel: f.t("discardYes"),
      cancelLabel: f.t("keepEditing"),
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
      setError(f.t("e_date"))
      return null
    }
    const amount = parseAmount(form.amount)
    if (amount == null || amount === 0) {
      setError(f.t("e_sum"))
      return null
    }
    if (!form.catId) {
      setError(f.t("e_cat"))
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
    toast.add({ title: mode === "edit" ? f.t("changesSaved") : f.t("saved") })

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
      setForm(next)
      setBaseline(snapshot(next))
    } else {
      closeDialog()
    }
  }

  const title =
    mode === "edit"
      ? f.t("editEntry")
      : mode === "copy"
        ? f.t("copyEntry")
        : f.t("newEntry")

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
            <Field>
              <FieldLabel htmlFor="entry-date">{f.t("f_date")}</FieldLabel>
              <Input
                id="entry-date"
                type="date"
                value={form.date}
                autoFocus={mode === "copy"}
                onChange={(e) => update({ date: e.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel>{f.t("f_type")}</FieldLabel>
              <ToggleGroup
                aria-label={f.t("f_type")}
                value={[form.type]}
                onValueChange={(value) => {
                  const next = value[0] as EntryType | undefined
                  if (!next || next === form.type) return
                  // The old category belongs to the other side.
                  update({ type: next, catId: "" })
                }}
              >
                <ToggleGroupItem
                  value="income"
                  className="data-pressed:bg-income-subtle data-pressed:text-income"
                >
                  {f.t("income")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="expense"
                  className="data-pressed:bg-expense-subtle data-pressed:text-expense"
                >
                  {f.t("expense")}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="entry-desc">{f.t("f_desc")}</FieldLabel>
              <Input
                id="entry-desc"
                value={form.description}
                placeholder={f.t("f_descPh")}
                onChange={(e) => update({ description: e.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel>{f.t("f_cat")}</FieldLabel>
              <Select
                items={catItems}
                value={form.catId}
                onValueChange={(value) => {
                  if (!value) return
                  const cat = cats.find((c) => c.id === value)
                  // Picking a category pre-fills its default rate (§8.5).
                  update({
                    catId: value,
                    vatRate: cat ? cat.vatRate : form.vatRate,
                  })
                }}
              >
                <SelectTrigger aria-label={f.t("f_cat")}>
                  <SelectValue placeholder={f.t("e_cat")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {typeCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {f.catLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="entry-sum">{f.t("f_sum")}</FieldLabel>
              <Input
                id="entry-sum"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => update({ amount: e.target.value })}
                className="tabular text-right"
              />
            </Field>

            <Field>
              <FieldLabel>{f.t("f_vat")}</FieldLabel>
              <Select
                items={Object.fromEntries(
                  rateOptions.map((rate) => [String(rate), f.rate(rate)])
                )}
                value={String(form.vatRate)}
                onValueChange={(value) =>
                  value && update({ vatRate: Number(value) })
                }
              >
                <SelectTrigger aria-label={f.t("f_vat")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {rateOptions.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {f.rate(rate)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{f.t("f_mode")}</FieldLabel>
              <ToggleGroup
                aria-label={f.t("f_mode")}
                value={[form.amountMode]}
                onValueChange={(value) => {
                  const next = value[0] as AmountMode | undefined
                  if (next) update({ amountMode: next })
                }}
              >
                <ToggleGroupItem value="gross">{f.t("gross")}</ToggleGroupItem>
                <ToggleGroupItem value="net">{f.t("net")}</ToggleGroupItem>
              </ToggleGroup>
            </Field>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
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
              onOpen={(index) => {
                if (editing && mode === "edit") {
                  openDialog({ kind: "viewer", entryId: editing.id, index })
                }
              }}
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
                {f.t("del")}
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
                {f.t("copyAsNew")}
              </Button>
            </>
          ) : null}

          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void requestClose()}>
              {f.t("cancel")}
            </Button>
            {mode !== "edit" ? (
              <Button variant="secondary" onClick={() => save(true)}>
                {f.t("saveNew")}
              </Button>
            ) : null}
            <Button onClick={() => save(false)}>{f.t("save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
