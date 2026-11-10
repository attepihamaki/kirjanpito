"use client"

import * as React from "react"
import { ChevronDownIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"

import { DateInput } from "@/components/common/date-input"
import { OptionSelect } from "@/components/common/option-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  deleteEntries,
  recategorizeEntries,
  redateEntries,
  setEntriesPaid,
  setEntriesVat,
} from "@/lib/commands/bulk-commands"
import { RATES } from "@/lib/domain/accounts"
import { todayIso } from "@/lib/domain/dates"
import type { MessageKey } from "@/lib/i18n/messages"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"
import { categoriesToMoveTo, compareCategories } from "@/stores/selectors"

/** A change the bulk bar's edit menu makes to every selected row. */
type BulkEdit = "date" | "vat" | "paid"

const EDIT_TEXT: Record<
  BulkEdit,
  { title: MessageKey; label: MessageKey; hint: MessageKey }
> = {
  date: {
    title: "ledger.bulkDate",
    label: "ledger.bulkDateLabel",
    hint: "ledger.bulkDateHint",
  },
  vat: {
    title: "ledger.bulkVat",
    label: "ledger.bulkVatLabel",
    hint: "ledger.bulkVatHint",
  },
  paid: {
    title: "ledger.bulkPay",
    label: "ledger.bulkPayLabel",
    hint: "ledger.bulkPayHint",
  },
}

/**
 * What can be done to the selected ledger rows (§8.4): move them to another
 * category, give them one date, VAT rate or payment date, or delete them.
 * Shown only while something is selected.
 */
export function BulkBar({
  selected,
  onDone,
}: {
  selected: readonly Entry[]
  /** Clears the selection once an action has gone through. */
  onDone: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const cats = useBookStore((s) => s.cats)

  // A category belongs to one side, so mixed rows cannot share one.
  const type = selected.every((e) => e.type === selected[0]?.type)
    ? selected[0]?.type
    : undefined

  const eu = !!selected[0]?.euPurchase
  const euMixed = selected.some((e) => !!e.euPurchase !== eu)

  const options = React.useMemo(
    () =>
      categoriesToMoveTo(cats, type, eu)
        .sort((a, b) =>
          compareCategories(a, b, (x, y) =>
            f.collator.compare(f.catName(x), f.catName(y))
          )
        )
        .map((c) => ({ value: c.id, label: f.catLabel(c) })),
    [cats, type, eu, f]
  )

  const recategorize = async (catId: string) => {
    if (await recategorizeEntries(ctx, selected, catId)) onDone()
  }
  const remove = async () => {
    if (await deleteEntries(ctx, selected)) onDone()
  }
  const [editing, setEditing] = React.useState<BulkEdit | null>(null)

  return (
    <div
      role="region"
      aria-label={f.t("ledger.selected", { n: selected.length })}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2"
    >
      <span className="tabular text-sm font-medium">
        {f.t("ledger.selected", { n: selected.length })}
      </span>

      {type && !euMixed ? (
        <OptionSelect
          options={options}
          value=""
          placeholder={f.t("ledger.bulkCategory")}
          label={f.t("ledger.bulkCategory")}
          size="sm"
          className="w-[16rem] bg-background"
          onChange={(catId) => void recategorize(catId)}
        />
      ) : (
        <span className="text-xs text-muted-foreground">
          {type ? f.t("ledger.bulkMixedEu") : f.t("ledger.bulkMixed")}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="bg-background">
              <PencilIcon data-icon="inline-start" />
              {f.t("ledger.bulkEdit")}
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {(Object.keys(EDIT_TEXT) as BulkEdit[]).map((kind) => (
            <DropdownMenuItem key={kind} onClick={() => setEditing(kind)}>
              {f.t(EDIT_TEXT[kind].title)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="bg-background"
        onClick={() => void remove()}
      >
        <Trash2Icon data-icon="inline-start" />
        {f.t("ledger.bulkDelete")}
      </Button>

      <Button variant="ghost" size="sm" className="ml-auto" onClick={onDone}>
        <XIcon data-icon="inline-start" />
        {f.t("ledger.bulkClear")}
      </Button>

      {editing ? (
        <BulkEditDialog
          kind={editing}
          selected={selected}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            onDone()
          }}
        />
      ) : null}
    </div>
  )
}

/** Asks for the one value a bulk edit gives every selected row, then makes it. */
function BulkEditDialog({
  kind,
  selected,
  onClose,
  onDone,
}: {
  kind: BulkEdit
  selected: readonly Entry[]
  onClose: () => void
  onDone: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const first = selected[0]
  const [date, setDate] = React.useState(
    kind === "date" && first ? first.date : todayIso()
  )
  const [bad, setBad] = React.useState(false)
  const [rate, setRate] = React.useState(String(first?.vatRate ?? RATES[0]))
  const [busy, setBusy] = React.useState(false)
  const text = EDIT_TEXT[kind]
  const year = first?.date.slice(0, 4)

  const apply = async () => {
    setBusy(true)
    try {
      const done =
        kind === "date"
          ? await redateEntries(ctx, selected, date)
          : kind === "vat"
            ? await setEntriesVat(ctx, selected, Number(rate))
            : await setEntriesPaid(ctx, selected, date)
      if (done) onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{f.t(text.title)}</DialogTitle>
          <DialogDescription>
            {f.t("ledger.selected", { n: selected.length })}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {f.t(text.label)}
          {kind === "vat" ? (
            <OptionSelect
              options={RATES.map((r) => ({
                value: String(r),
                label: f.rate(r),
              }))}
              value={rate}
              onChange={setRate}
              label={f.t(text.label)}
            />
          ) : (
            <DateInput
              value={date}
              onValueChange={setDate}
              onBadChange={setBad}
              {...(kind === "date" && year
                ? { min: `${year}-01-01`, max: `${year}-12-31` }
                : {})}
            />
          )}
        </label>
        <p className="text-xs text-muted-foreground">{f.t(text.hint)}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button
            disabled={busy || (kind !== "vat" && (bad || date === ""))}
            onClick={() => void apply()}
          >
            {f.t("ledger.bulkApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
