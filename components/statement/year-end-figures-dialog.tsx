"use client"

import * as React from "react"
import { LockIcon } from "lucide-react"

import { EuroInput } from "@/components/common/euro-input"
import { InfoPopover } from "@/components/common/info-popover"
import { Money } from "@/components/common/money"
import { Pill } from "@/components/common/pill"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { EMPTY_YEAR_END, type YearEnd } from "@/lib/domain/form5-balance"
import type { MessageKey } from "@/lib/i18n/messages"
import { formatMoneyPlain } from "@/lib/domain/money"
import { evalAmount } from "@/lib/domain/amount-expr"
import { useBookStore } from "@/stores/book-store"

/** Label and help text keys for each figure the book cannot know. */
export const ASSET_FIELDS = [
  ["goods", "balance.goods", "balance.goodsHelp"],
  ["otherCurrent", "balance.otherCurrent", "balance.otherCurrentHelp"],
  ["otherFixed", "balance.otherFixed", "balance.otherFixedHelp"],
  ["cash", "balance.cash", "balance.cashHelp"],
  ["otherFinancial", "balance.otherFinancial", "balance.otherFinancialHelp"],
] as const satisfies readonly (readonly [
  keyof YearEnd,
  MessageKey,
  MessageKey,
])[]

export const DEBT_FIELDS = [
  ["loanCurrent", "balance.loanCurrent", "balance.loanCurrentHelp"],
  [
    "otherCurrentDebt",
    "balance.otherCurrentDebt",
    "balance.otherCurrentDebtHelp",
  ],
  ["otherLongDebt", "balance.otherLongDebt", "balance.otherLongDebtHelp"],
] as const satisfies readonly (readonly [
  keyof YearEnd,
  MessageKey,
  MessageKey,
])[]

export function sumYearEnd(
  values: YearEnd,
  keys: readonly (keyof YearEnd)[]
): number {
  return keys.reduce((total, key) => total + values[key], 0)
}

/**
 * The year-end figures the book cannot know (§8.8), typed in per year. Each
 * field commits on blur, and each carries a popover saying what belongs in it.
 */
export function YearEndFiguresDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "year-end-figures") return null
  return <FiguresForm />
}

function FiguresForm() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const yearEnds = useBookStore((s) => s.yearEnd)
  const setYearEnd = useBookStore((s) => s.setYearEnd)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const setLoanOpening = useBookStore((s) => s.setLoanOpening)
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])
  const values = yearEnds[year] ?? EMPTY_YEAR_END

  const group = (
    fields: readonly (readonly [keyof YearEnd, MessageKey, MessageKey])[]
  ) =>
    fields.map(([key, label, help]) => (
      <AmountField
        key={key}
        id={`year-end-${key}`}
        label={f.t(label)}
        help={f.t(help)}
        cents={values[key]}
        disabled={filed}
        onCommit={(cents) => setYearEnd(year, { ...values, [key]: cents })}
      />
    ))

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {f.t("balance.figuresDialogTitle", { y: year })}
            {filed ? (
              <Pill>
                <LockIcon className="mr-1 size-3" aria-hidden />
                {f.t("balance.locked")}
              </Pill>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-x-8 gap-y-6 overflow-y-auto pr-1 min-[700px]:grid-cols-2">
          <section className="flex flex-col gap-4">
            <SectionHeading
              title={f.t("balance.assetsTitle")}
              hint={f.t("balance.assetsHint")}
              total={sumYearEnd(
                values,
                ASSET_FIELDS.map(([key]) => key)
              )}
            />
            {group(ASSET_FIELDS)}
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading
              title={f.t("balance.debtsTitle")}
              hint={f.t("balance.debtsHint")}
              total={sumYearEnd(
                values,
                DEBT_FIELDS.map(([key]) => key)
              )}
            />
            {group(DEBT_FIELDS)}
            <div className="border-t pt-4">
              <AmountField
                id="loan-opening"
                label={f.t("balance.loanOpening", {
                  y: loanOpening?.year ?? year,
                })}
                help={f.t("balance.loanOpeningHelp")}
                cents={loanOpening?.amount ?? 0}
                disabled={filed}
                onCommit={(amount) =>
                  setLoanOpening(
                    amount ? { year: loanOpening?.year ?? year, amount } : null
                  )
                }
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button onClick={closeDialog}>{f.t("balance.figuresDone")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionHeading({
  title,
  hint,
  total,
}: {
  title: string
  hint: string
  total: number
}) {
  const f = useFormatters()
  return (
    <div className="border-b pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {f.t("balance.total")} <Money cents={total} className="font-medium" />
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

export function AmountField({
  id,
  label,
  help,
  cents,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  help: string
  cents: number
  disabled: boolean
  onCommit: (cents: number) => void
}) {
  const f = useFormatters()
  const [text, setText] = React.useState(cents ? formatMoneyPlain(cents) : "")
  const [bad, setBad] = React.useState(false)

  const commit = () => {
    const parsed = text.trim() === "" ? 0 : evalAmount(text)
    if (parsed == null || parsed < 0) {
      setBad(true)
      return
    }
    setBad(false)
    if (parsed !== cents) onCommit(parsed)
  }

  return (
    <Field data-invalid={bad}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <InfoPopover label={label}>
          <p className="text-sm">{help}</p>
        </InfoPopover>
      </div>
      <EuroInput
        id={id}
        disabled={disabled}
        aria-invalid={bad}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {bad ? <FieldError>{f.t("balance.badAmount")}</FieldError> : null}
    </Field>
  )
}
