"use client"

import * as React from "react"

import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { storeMemo } from "@/lib/commands/memo-commands"
import {
  EMPTY_YEAR_END,
  inventoryChange,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { useBookStore } from "@/stores/book-store"

/**
 * What Form 5's assets and liabilities need beyond the book (§8.8), year by
 * year. The year-end dialog lists the resulting fields for copying.
 */
export function BalanceView() {
  const year = useBookStore((s) => s.year)

  return (
    <div className="flex flex-col gap-6">
      <YearEndPanel key={year} year={year} />
      <InventoryPanel year={year} />
    </div>
  )
}

const FIELDS = [
  ["goods", "balance.goods"],
  ["otherCurrent", "balance.otherCurrent"],
  ["otherFixed", "balance.otherFixed"],
  ["cash", "balance.cash"],
  ["otherFinancial", "balance.otherFinancial"],
  ["loanCurrent", "balance.loanCurrent"],
  ["otherCurrentDebt", "balance.otherCurrentDebt"],
  ["otherLongDebt", "balance.otherLongDebt"],
] as const satisfies readonly (readonly [keyof YearEnd, string])[]

function AmountField({
  id,
  label,
  cents,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  cents: number
  disabled: boolean
  onCommit: (cents: number) => void
}) {
  const f = useFormatters()
  const [text, setText] = React.useState(cents ? formatMoneyPlain(cents) : "")
  const [bad, setBad] = React.useState(false)

  const commit = () => {
    const parsed = text.trim() === "" ? 0 : parseAmount(text)
    if (parsed == null || parsed < 0) {
      setBad(true)
      return
    }
    setBad(false)
    if (parsed !== cents) onCommit(parsed)
  }

  return (
    <Field data-invalid={bad}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="decimal"
        disabled={disabled}
        className="tabular text-right"
        aria-invalid={bad}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {bad ? <FieldError>{f.t("balance.badAmount")}</FieldError> : null}
    </Field>
  )
}

/** What the book does not hold: the year-end figures and the opening loans. */
function YearEndPanel({ year }: { year: number }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const setYearEnd = useBookStore((s) => s.setYearEnd)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const setLoanOpening = useBookStore((s) => s.setLoanOpening)
  const values = yearEnds[year] ?? EMPTY_YEAR_END
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])
  const openDialog = useBookStore((s) => s.openDialog)

  return (
    <Panel
      title={f.t("balance.yearEndTitle", { d: f.date(`${year}-12-31`) })}
      description={f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
      bodyClassName="grid gap-4 p-4 min-[560px]:grid-cols-2"
      footer={
        <Button
          variant="outline"
          className="print-hidden"
          onClick={() => openDialog({ kind: "year-end" })}
        >
          {f.t("balance.openForm5")}
        </Button>
      }
    >
      {FIELDS.map(([key, label]) => (
        <AmountField
          key={key}
          id={`year-end-${key}`}
          label={f.t(label)}
          cents={values[key]}
          disabled={filed}
          onCommit={(cents) => setYearEnd(year, { ...values, [key]: cents })}
        />
      ))}
      <AmountField
        id="loan-opening"
        label={f.t("balance.loanOpening", {
          y: loanOpening?.year ?? year,
        })}
        cents={loanOpening?.amount ?? 0}
        disabled={filed}
        onCommit={(amount) =>
          setLoanOpening(
            amount ? { year: loanOpening?.year ?? year, amount } : null
          )
        }
      />
    </Panel>
  )
}

/** Books the year's change in stock on line 333, through the entry dialog (§8.8). */
function InventoryPanel({ year }: { year: number }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const entries = useBookStore((s) => s.entries)
  const openDialog = useBookStore((s) => s.openDialog)
  const ctx = useCommandCtx()
  const memoVoucher = useMemoVoucher()
  const [busy, setBusy] = React.useState(false)
  const opening = yearEnds[year - 1] ?? EMPTY_YEAR_END
  const closing = yearEnds[year] ?? EMPTY_YEAR_END
  const change = inventoryChange(opening, closing)
  const description = f.t("balance.inventoryEntry", { y: year })
  const booked = entries.some(
    (e) => e.catId === "333" && e.description === description
  )
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])

  return (
    <Panel
      title={f.t("balance.inventoryTitle")}
      description={f.t("balance.inventoryHint", {
        a: f.money(change),
      })}
      bodyClassName="p-4"
    >
      {booked ? (
        <p className="text-sm text-muted-foreground">
          {f.t("balance.inventoryBooked")}
        </p>
      ) : (
        <Button
          variant="outline"
          disabled={change === 0 || filed || busy}
          onClick={async () => {
            const prefill = {
              date: `${year}-12-31`,
              description,
              type: "expense" as const,
              catId: "333",
              amount: change,
              vatRate: 0,
              amountMode: "gross" as const,
            }
            setBusy(true)
            /*
             * The memo is made before the dialog opens, which then holds it
             * like any attached receipt. A user who changes the amount there
             * leaves the calculation on the memo as it was worked out.
             */
            const memo = memoVoucher(
              f.t("memo.inventoryHeading", { y: year }),
              { id: "", ...prefill },
              [
                {
                  label: f.t("memo.stockOn", { y: year - 1 }),
                  value: f.money(opening.goods + opening.otherCurrent),
                },
                {
                  label: f.t("memo.stockOn", { y: year }),
                  value: f.money(closing.goods + closing.otherCurrent),
                },
                {
                  label: f.t("memo.stockChange"),
                  value: f.money(change),
                  strong: true,
                },
              ],
              [f.t("memo.inventoryRule"), f.t("memo.keepCount")]
            )
            const att = await storeMemo(ctx, memo)
            setBusy(false)
            openDialog({
              kind: "entry",
              mode: "new",
              prefill: { ...prefill, ...(att ? { atts: [att] } : {}) },
            })
          }}
        >
          {f.t("balance.inventoryBook")}
        </Button>
      )}
    </Panel>
  )
}
