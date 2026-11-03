"use client"

import * as React from "react"

import { Panel } from "@/components/common/panel"
import { TaxForm, TaxFormStep } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
  inventoryChange,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * Form 5's assets, liabilities and wages paid (§8.8). The book supplies what it
 * knows, and the panel below takes the rest, year by year.
 */
export function BalanceView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const yearEnds = useBookStore((s) => s.yearEnd)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const yearEnd = yearEnds[year] ?? EMPTY_YEAR_END

  const balance = React.useMemo(
    () =>
      form5Balance({
        entries,
        cats: indexCategories(cats),
        year,
        yearEnd,
        assetOpening,
        loanOpening,
      }),
    [entries, cats, year, yearEnd, assetOpening, loanOpening]
  )
  const sections = React.useMemo(
    () => form5BalanceSections(balance, yearEnd),
    [balance, yearEnd]
  )

  return (
    <div className="flex flex-col gap-6">
      <YearEndPanel key={year} year={year} />
      <InventoryPanel year={year} />
      <TaxForm
        key={`balance-${year}`}
        kicker={f.t("balance.kicker", { y: String(year) })}
        title={f.t("balance.title")}
        intro={f.t("balance.intro")}
        nothing={f.t("balance.nothing")}
        sections={sections}
        notes={[f.t("balance.notBank"), f.t("balance.missing")]}
      >
        <TaxFormStep step={3}>{f.t("balance.figuresTitle")}</TaxFormStep>
        <p className="ml-[2.125rem] text-sm text-muted-foreground">
          {f.t("balance.figures", {
            r: f.money(balance.receivables),
            p: f.money(balance.payables),
            l: f.money(balance.loans),
            m: f.money(balance.machinery),
          })}
        </p>
      </TaxForm>
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

  return (
    <Panel
      title={f.t("balance.yearEndTitle", { d: f.date(`${year}-12-31`) })}
      description={f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
      bodyClassName="grid gap-4 p-4 min-[560px]:grid-cols-2"
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
  const change = inventoryChange(
    yearEnds[year - 1] ?? EMPTY_YEAR_END,
    yearEnds[year] ?? EMPTY_YEAR_END
  )
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
          disabled={change === 0 || filed}
          onClick={() =>
            openDialog({
              kind: "entry",
              mode: "new",
              prefill: {
                date: `${year}-12-31`,
                description,
                type: "expense",
                catId: "333",
                amount: change,
                vatRate: 0,
                amountMode: "gross",
              },
            })
          }
        >
          {f.t("balance.inventoryBook")}
        </Button>
      )}
    </Panel>
  )
}
