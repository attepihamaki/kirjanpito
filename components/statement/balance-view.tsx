"use client"

import * as React from "react"
import { CheckIcon, FileTextIcon, LockIcon } from "lucide-react"

import { EuroInput } from "@/components/common/euro-input"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { StatStrip } from "@/components/common/stat-strip"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useCommandCtx } from "@/hooks/use-commands"
import { storeMemo } from "@/lib/commands/memo-commands"
import {
  EMPTY_YEAR_END,
  inventoryChange,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { useBookStore } from "@/stores/book-store"

const ASSET_FIELDS = [
  ["goods", "balance.goods"],
  ["otherCurrent", "balance.otherCurrent"],
  ["otherFixed", "balance.otherFixed"],
  ["cash", "balance.cash"],
  ["otherFinancial", "balance.otherFinancial"],
] as const satisfies readonly (readonly [keyof YearEnd, string])[]

const DEBT_FIELDS = [
  ["loanCurrent", "balance.loanCurrent"],
  ["otherCurrentDebt", "balance.otherCurrentDebt"],
  ["otherLongDebt", "balance.otherLongDebt"],
] as const satisfies readonly (readonly [keyof YearEnd, string])[]

function sum(values: YearEnd, keys: readonly (keyof YearEnd)[]): number {
  return keys.reduce((total, key) => total + values[key], 0)
}

/**
 * What Form 5's assets and liabilities need beyond the book (§8.8), year by
 * year. The year-end dialog lists the resulting fields for copying.
 */
export function BalanceView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const yearEnds = useBookStore((s) => s.yearEnd)
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])
  const openDialog = useBookStore((s) => s.openDialog)
  const values = yearEnds[year] ?? EMPTY_YEAR_END
  const opening = yearEnds[year - 1] ?? EMPTY_YEAR_END

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">
              {f.t("balance.yearEndTitle", { d: f.date(`${year}-12-31`) })}
            </h2>
            {filed ? (
              <Pill>
                <LockIcon className="mr-1 size-3" aria-hidden />
                {f.t("balance.locked")}
              </Pill>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
          </p>
        </div>
        <Button
          variant="outline"
          className="print-hidden"
          onClick={() => openDialog({ kind: "year-end" })}
        >
          <FileTextIcon data-icon="inline-start" />
          {f.t("balance.openForm5")}
        </Button>
      </div>

      <StatStrip
        className="lg:grid-cols-3"
        stats={[
          {
            label: f.t("balance.statAssets"),
            value: (
              <Money
                cents={sum(
                  values,
                  ASSET_FIELDS.map(([key]) => key)
                )}
              />
            ),
            hint: f.t("balance.statHint"),
          },
          {
            label: f.t("balance.statDebts"),
            value: (
              <Money
                cents={sum(
                  values,
                  DEBT_FIELDS.map(([key]) => key)
                )}
              />
            ),
            hint: f.t("balance.statHint"),
          },
          {
            label: f.t("balance.statStock"),
            value: <Money cents={inventoryChange(opening, values)} />,
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AssetsPanel key={`assets-${year}`} year={year} filed={filed} />
        <DebtsPanel key={`debts-${year}`} year={year} filed={filed} />
      </div>

      <InventoryPanel year={year} />
    </div>
  )
}

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

function TotalFooter({ cents }: { cents: number }) {
  const f = useFormatters()
  return (
    <div className="flex w-full items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{f.t("balance.total")}</span>
      <Money cents={cents} className="text-base font-semibold" />
    </div>
  )
}

/** The assets the book cannot know: stock, other property and cash in hand. */
function AssetsPanel({ year, filed }: { year: number; filed: boolean }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const setYearEnd = useBookStore((s) => s.setYearEnd)
  const values = yearEnds[year] ?? EMPTY_YEAR_END

  return (
    <Panel
      title={f.t("balance.assetsTitle")}
      description={f.t("balance.assetsHint")}
      bodyClassName="grid gap-4 p-4"
      footer={
        <TotalFooter
          cents={sum(
            values,
            ASSET_FIELDS.map(([key]) => key)
          )}
        />
      }
    >
      {ASSET_FIELDS.map(([key, label]) => (
        <AmountField
          key={key}
          id={`year-end-${key}`}
          label={f.t(label)}
          cents={values[key]}
          disabled={filed}
          onCommit={(cents) => setYearEnd(year, { ...values, [key]: cents })}
        />
      ))}
    </Panel>
  )
}

/** The debts the book cannot know, and the loans the year opened with. */
function DebtsPanel({ year, filed }: { year: number; filed: boolean }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const setYearEnd = useBookStore((s) => s.setYearEnd)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const setLoanOpening = useBookStore((s) => s.setLoanOpening)
  const values = yearEnds[year] ?? EMPTY_YEAR_END

  return (
    <Panel
      title={f.t("balance.debtsTitle")}
      description={f.t("balance.debtsHint")}
      bodyClassName="grid gap-4 p-4"
      footer={
        <TotalFooter
          cents={sum(
            values,
            DEBT_FIELDS.map(([key]) => key)
          )}
        />
      }
    >
      {DEBT_FIELDS.map(([key, label]) => (
        <AmountField
          key={key}
          id={`year-end-${key}`}
          label={f.t(label)}
          cents={values[key]}
          disabled={filed}
          onCommit={(cents) => setYearEnd(year, { ...values, [key]: cents })}
        />
      ))}
      <div className="border-t pt-4">
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
      </div>
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

  const figures: [string, number, boolean?][] = [
    [f.t("balance.stockOpening"), opening.goods + opening.otherCurrent],
    [f.t("balance.stockClosing"), closing.goods + closing.otherCurrent],
    [f.t("balance.stockCost"), change, true],
  ]

  return (
    <Panel
      title={f.t("balance.inventoryTitle")}
      description={f.t("balance.inventoryHint", {
        a: f.money(change),
      })}
      bodyClassName="p-4"
      footer={
        booked ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-primary" aria-hidden />
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
        )
      }
    >
      <dl className="grid gap-4 min-[560px]:grid-cols-3">
        {figures.map(([label, cents, strong]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd>
              <Money
                cents={cents}
                className={strong ? "text-lg font-semibold" : "text-lg"}
              />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
