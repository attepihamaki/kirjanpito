"use client"

import * as React from "react"

import { EuroInput } from "@/components/common/euro-input"
import { OptionSelect } from "@/components/common/option-select"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { useCommandCtx } from "@/hooks/use-commands"
import { splitEntry } from "@/lib/commands/bulk-commands"
import { evalAmount } from "@/lib/domain/amount-expr"
import { canSplitLine } from "@/lib/domain/split"
import { indexCategories } from "@/lib/domain/types"
import { rateOnDate, validRates } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"
import { categoriesToMoveTo, compareCategories } from "@/stores/selectors"

/**
 * "Jaa tosite" (§8.4): carve a part off a voucher as another category or VAT
 * rate. The part is asked for in the voucher's own mode, and what is left stays
 * on the original, so the two always add up to the receipt.
 */
export function SplitDialog() {
  const dialog = useBookStore((s) => s.dialog)
  const entry = useBookStore((s) => {
    const d = s.dialog
    return d.kind === "split"
      ? s.entries.find((e) => e.id === d.entryId)
      : undefined
  })
  if (dialog.kind !== "split" || !entry) return null
  return <SplitForm key={entry.id} entryId={entry.id} />
}

function SplitForm({ entryId }: { entryId: string }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const cats = useBookStore((s) => s.cats)
  const entry = useBookStore((s) => s.entries.find((e) => e.id === entryId))!

  const [amount, setAmount] = React.useState("")
  const [catId, setCatId] = React.useState(entry.catId)
  const [vatRate, setVatRate] = React.useState(entry.vatRate)
  const [rateChosen, setRateChosen] = React.useState(false)
  const [bad, setBad] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const catOptions = React.useMemo(
    () =>
      categoriesToMoveTo(cats, entry.type, false)
        .filter((c) => canSplitLine(c.id, catMap))
        .sort((a, b) =>
          compareCategories(a, b, (x, y) =>
            f.collator.compare(f.catName(x), f.catName(y))
          )
        )
        .map((c) => ({ value: c.id, label: f.catLabel(c) })),
    [cats, catMap, entry.type, f]
  )
  const rates = validRates(entry.date)
  const rateOptions = rates.includes(vatRate) ? rates : [...rates, vatRate]

  const sign = Math.sign(entry.amount) || 1
  const parsed = evalAmount(amount)
  const part = parsed == null ? null : sign * Math.abs(parsed)
  const left = part == null ? null : entry.amount - part

  const pickCategory = (id: string) => {
    setCatId(id)
    const cat = catMap.get(id)
    if (cat && !rateChosen) setVatRate(rateOnDate(cat.vatRate, entry.date))
  }

  const submit = async () => {
    if (part == null || part === 0) {
      setBad(true)
      return
    }
    setBusy(true)
    try {
      if (await splitEntry(ctx, entry, { amount: part, catId, vatRate })) {
        closeDialog()
      } else {
        setBad(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.t("entry.splitTitle")}</DialogTitle>
          <DialogDescription>{f.t("entry.splitHint")}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={bad}>
            <FieldLabel htmlFor="split-amount">
              {f.t("entry.splitAmount")}
            </FieldLabel>
            <EuroInput
              id="split-amount"
              autoFocus
              value={amount}
              aria-invalid={bad}
              onChange={(e) => {
                setAmount(e.target.value)
                setBad(false)
              }}
            />
            {left != null && left !== entry.amount ? (
              <FieldDescription>
                {f.t("entry.splitLeft", {
                  a: f.money(left),
                  m: f.t(
                    entry.amountMode === "net"
                      ? "entry.splitNet"
                      : "entry.splitGross"
                  ),
                })}
              </FieldDescription>
            ) : null}
            {bad ? (
              <FieldError>{f.t("entry.splitAmountRefused")}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>{f.t("entry.splitCategory")}</FieldLabel>
            <OptionSelect
              options={catOptions}
              value={catId}
              onChange={pickCategory}
              label={f.t("entry.splitCategory")}
            />
          </Field>

          <Field>
            <FieldLabel>{f.t("entry.splitVatRate")}</FieldLabel>
            <OptionSelect
              options={rateOptions.map((rate) => ({
                value: String(rate),
                label: f.rate(rate),
              }))}
              value={String(vatRate)}
              onChange={(value) => {
                setRateChosen(true)
                setVatRate(Number(value))
              }}
              label={f.t("entry.splitVatRate")}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            {f.t("entry.splitSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
