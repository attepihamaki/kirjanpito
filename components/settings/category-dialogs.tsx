"use client"

import * as React from "react"

import { EntryTypeToggle } from "@/components/common/filter-controls"
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
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { deleteCategory } from "@/lib/commands/category-commands"
import { GENERAL_RATE, LINE_BY_KEY, LINES } from "@/lib/domain/accounts"
import { categoryNameTaken } from "@/lib/domain/category-names"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import type {
  Category,
  EntryType,
  EuPurchase,
  SalesKind,
} from "@/lib/domain/types"
import { validRates } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"
import {
  categoriesToMoveTo,
  categorySide,
  compareCategories,
} from "@/stores/selectors"

/** The VAT return rows a sale on line 300 can report to, with their labels. */
const VAT_ROW_OPTIONS = [
  ["domestic", "settings.vatRowDomestic"],
  ["euGoods", "settings.vatRowEuGoods"],
  ["euServices", "settings.vatRowEuServices"],
  ["nonEu", "settings.vatRowNonEu"],
  ["reverse", "settings.vatRowReverse"],
] as const

/**
 * A category's default VAT: the rates in force today. A rate the category
 * already holds stays on the list, so opening an older one does not change it.
 */
export function DefaultVatSelect({
  value,
  onChange,
  label,
  size,
  className,
}: {
  value: number
  onChange: (rate: number) => void
  /** Accessible name, where one label is not enough for the page. */
  label?: string
  size?: "sm" | "default"
  className?: string
}) {
  const f = useFormatters()
  const valid = validRates(todayIso())
  const rates = valid.includes(value) ? valid : [...valid, value]
  return (
    <OptionSelect
      options={rates.map((rate) => ({
        value: String(rate),
        label: f.rate(rate),
      }))}
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      label={label ?? f.t("settings.defaultVat")}
      size={size}
      className={className}
    />
  )
}

/** The dialogs of Asetukset, Luokat (§8.10): add, edit and delete. */
export function CategoryDialogs() {
  const dialog = useBookStore((s) => s.dialog)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const cat = useBookStore((s) =>
    dialog.kind === "category-edit" || dialog.kind === "category-delete"
      ? s.cats.find((c) => c.id === dialog.id)
      : undefined
  )
  if (dialog.kind === "category-add") {
    return <CategoryFormDialog onClose={closeDialog} />
  }
  if (!cat) return null
  return dialog.kind === "category-edit" ? (
    <CategoryFormDialog key={cat.id} cat={cat} onClose={closeDialog} />
  ) : (
    <DeleteCategoryDialog key={cat.id} cat={cat} onClose={closeDialog} />
  )
}

/**
 * One form for adding and editing a category, so the two read alike (§8.10).
 * Without `cat` it adds. Editing fixes the side, and the line too once a
 * voucher uses the category.
 */
function CategoryFormDialog({
  cat,
  onClose,
}: {
  cat?: Category
  onClose: () => void
}) {
  const f = useFormatters()
  const upsertCategory = useBookStore((s) => s.upsertCategory)
  /*
   * A voucher on this category reports through its line, so changing the line
   * would move figures past the period locks of §8.11. Deleting the category
   * moves its vouchers through those checks instead.
   */
  const lineFixed = useBookStore((s) =>
    cat ? s.entries.some((e) => e.catId === cat.id) : false
  )

  /* Moving a voucher between return rows would shift a filed period (§8.11). */
  const kindFixed = lineFixed

  const [side, setSide] = React.useState<EntryType>(
    (cat && categorySide(cat)) || "expense"
  )
  const [lineChoice, setLine] = React.useState<string | null>(cat?.line ?? null)
  const [name, setName] = React.useState(cat?.name ?? "")
  // Null until picked, so a new category's rate can follow the EU choice below.
  const [rateChoice, setRate] = React.useState<number | null>(
    cat ? cat.vatRate : null
  )
  const [kindChoice, setKind] = React.useState<SalesKind>(
    cat?.kind ?? "domestic"
  )
  const [eu, setEu] = React.useState<EuPurchase | "">("")
  const [error, setError] = React.useState<string | null>(null)

  const lineOptions = React.useMemo(
    () => LINES.filter((l) => l.side === side),
    [side]
  )

  /*
   * Derived, not stored: switching side changes which lines are valid, and
   * resetting the choice in an effect would render once with a stale line.
   */
  const line =
    lineChoice && lineOptions.some((l) => l.key === lineChoice)
      ? lineChoice
      : (lineOptions[0]?.key ?? "")

  /*
   * The VAT return row is a choice on line 300 only: income on any other line
   * is not turnover, so it stays domestic. The retired "eu" kind is kept as it
   * is, not offered.
   */
  const showKind = side === "income" && line === "300"
  const kind: SalesKind = showKind ? kindChoice : "domestic"

  const euPurchase = !cat && side === "expense" && eu ? eu : undefined
  /*
   * An EU, non-EU or reverse-charge sale is reported at 0 %, and an EU
   * purchase at the general rate, so the rate is not asked for.
   */
  const foreignSale = showKind && kind !== "domestic"
  const rateHidden = foreignSale || !!euPurchase || !!cat?.euPurchase
  const rate = foreignSale ? 0 : (rateChoice ?? (euPurchase ? GENERAL_RATE : 0))

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(f.t("settings.nameRequired"))
      return
    }
    const cats = useBookStore.getState().cats
    if (categoryNameTaken(cats, trimmed, line, cat?.id)) {
      setError(
        f.t("settings.nameTaken", {
          a: LINE_BY_KEY.get(line)?.account ?? "",
        })
      )
      return
    }
    if (cat) {
      upsertCategory({
        ...cat,
        name: trimmed,
        line,
        vatRate: rate,
        ...(side === "income" ? { kind: kindFixed ? cat.kind : kind } : {}),
      })
      toast.add({ title: f.t("settings.categoryUpdated", { c: trimmed }) })
    } else {
      upsertCategory({
        id: `c-${uid()}`,
        line,
        name: trimmed,
        vatRate: rate,
        ...(side === "income" ? { kind } : {}),
        ...(euPurchase ? { euPurchase } : {}),
        enabled: true,
        custom: true,
      })
      toast.add({ title: f.t("settings.categoryAdded", { c: trimmed }) })
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t(cat ? "settings.editCategoryTitle" : "settings.addCategory")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {cat ? null : (
            <Field>
              <FieldLabel>{f.t("common.type")}</FieldLabel>
              <EntryTypeToggle value={side} onChange={setSide} />
            </Field>
          )}

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="cat-name">{f.t("common.name")}</FieldLabel>
            <Input
              id="cat-name"
              value={name}
              placeholder={f.t("settings.namePlaceholder")}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.line")}</FieldLabel>
            <OptionSelect
              options={lineOptions.map((l) => ({
                value: l.key,
                label: `${l.account} ${f.lineName(l)}`,
              }))}
              value={line}
              onChange={setLine}
              label={f.t("settings.line")}
              disabled={lineFixed}
            />
            {lineFixed ? (
              <FieldDescription>{f.t("settings.lineLocked")}</FieldDescription>
            ) : null}
          </Field>

          {showKind ? (
            <Field>
              <FieldLabel>{f.t("settings.vatRow")}</FieldLabel>
              <OptionSelect
                options={VAT_ROW_OPTIONS.map(([value, key]) => ({
                  value,
                  label: f.t(key),
                }))}
                value={kindChoice === "eu" ? "domestic" : kindChoice}
                onChange={(value) => setKind(value as SalesKind)}
                label={f.t("settings.vatRow")}
                disabled={kindFixed}
              />
              {kindFixed ? (
                <FieldDescription>
                  {f.t("settings.vatRowLocked")}
                </FieldDescription>
              ) : null}
            </Field>
          ) : null}

          {!cat && side === "expense" ? (
            <Field>
              <FieldLabel>{f.t("settings.euPurchase")}</FieldLabel>
              <OptionSelect
                options={[
                  { value: "no", label: f.t("settings.euPurchaseNo") },
                  { value: "goods", label: f.t("entry.euPurchaseGoods") },
                  { value: "services", label: f.t("entry.euPurchaseServices") },
                ]}
                value={eu || "no"}
                onChange={(value) =>
                  setEu(value === "no" ? "" : (value as EuPurchase))
                }
                label={f.t("settings.euPurchase")}
              />
            </Field>
          ) : null}

          {rateHidden ? null : (
            <Field>
              <FieldLabel>{f.t("settings.defaultVat")}</FieldLabel>
              <DefaultVatSelect value={rate} onChange={setRate} />
            </Field>
          )}

          <FieldError>{error}</FieldError>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button onClick={submit}>{f.t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryDialog({
  cat,
  onClose,
}: {
  cat: Category
  onClose: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const cats = useBookStore((s) => s.cats)
  const entries = useBookStore((s) => s.entries)
  const recurring = useBookStore((s) => s.recurring)

  const targets = React.useMemo(
    () =>
      categoriesToMoveTo(
        cats,
        categorySide(cat),
        !!cat.euPurchase,
        cat.id
      ).sort((a, b) =>
        compareCategories(a, b, (x, y) =>
          f.collator.compare(f.catName(x), f.catName(y))
        )
      ),
    [cats, cat, f]
  )
  const [targetId, setTargetId] = React.useState("")
  const target = targets.find((c) => c.id === targetId)

  const submit = async () => {
    if (!target) return
    const label = f.catLabel(target)
    if (await deleteCategory(ctx, cat, { cat: target, label })) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t("settings.deleteCategoryTitle", { c: cat.name })}
          </DialogTitle>
          <DialogDescription>
            {f.t("settings.deleteCategoryUses", {
              v: entries.filter((e) => e.catId === cat.id).length,
              r: recurring.filter((r) => r.catId === cat.id).length,
            })}
          </DialogDescription>
        </DialogHeader>

        {targets.length > 0 ? (
          <Field>
            <FieldLabel>{f.t("settings.moveTo")}</FieldLabel>
            <OptionSelect
              options={targets.map((c) => ({
                value: c.id,
                label: f.catLabel(c),
              }))}
              value={targetId}
              onChange={setTargetId}
              placeholder={f.t("settings.moveTo")}
              label={f.t("settings.moveTo")}
            />
          </Field>
        ) : (
          <FieldDescription>{f.t("settings.noMoveTarget")}</FieldDescription>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!target}
            onClick={() => void submit()}
          >
            {f.t("settings.deleteCategoryConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
