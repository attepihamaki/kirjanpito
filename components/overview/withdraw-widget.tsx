"use client"

import * as React from "react"
import { ArrowRightIcon, PencilIcon, WalletIcon } from "lucide-react"

import { AmountInput } from "@/components/common/amount-input"
import { ButtonLink } from "@/components/common/button-link"
import { HelpHint } from "@/components/common/help-hint"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { advanceTaxPaid } from "@/lib/domain/advance-tax"
import { evalAmount } from "@/lib/domain/amount-expr"
import { bankEstimate } from "@/lib/domain/bank-balance"
import { monthOf, yearOf } from "@/lib/domain/dates"
import { viewHelp } from "@/lib/domain/field-help"
import { incomeStatement } from "@/lib/domain/income-statement"
import { businessTaxFigures, incomeTaxRow } from "@/lib/domain/income-tax"
import { formatMoneyPlain } from "@/lib/domain/money"
import { payablesReport } from "@/lib/domain/payables"
import {
  safeToWithdraw,
  vatOwed,
  type WithdrawLine,
} from "@/lib/domain/safe-to-withdraw"
import type { MessageKey } from "@/lib/i18n/messages"
import { APP_ROUTES, INVOICE_ROUTES, SETTINGS_ROUTES } from "@/lib/site"
import { useLossInput } from "@/hooks/use-loss-input"
import { useStatementOptions, useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

const LABELS: Record<WithdrawLine["kind"], MessageKey> = {
  vat: "withdraw.vat",
  tax: "withdraw.tax",
  yel: "withdraw.yel",
  bills: "withdraw.bills",
  buffer: "withdraw.buffer",
}

const MISSING: Partial<Record<WithdrawLine["kind"], MessageKey>> = {
  tax: "withdraw.taxMissing",
  yel: "withdraw.yelMissing",
}

const LINKS: Partial<Record<WithdrawLine["kind"], string>> = {
  vat: APP_ROUTES.vat,
  bills: INVOICE_ROUTES.payables,
}

/**
 * What the owner can take out today (§8.12): the Pankkitili estimate less
 * the VAT still to pay, the income tax still to set aside this year, the next
 * YEL premium, the open bills and the buffer the user keeps. Each line says
 * what it is, so the figure can be checked by hand. The tax lines follow
 * today's year, not the selected one, since the money leaves the bank now.
 */
export function WithdrawWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const balance = useBookStore((s) => s.bankBalance)
  const buffer = useBookStore((s) => s.withdrawBuffer)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const profile = useBookStore((s) => s.payMonths.taxProfile)
  const openDialog = useBookStore((s) => s.openDialog)
  const basis = useTaxBasisEntries()
  const options = useStatementOptions()
  const losses = useLossInput()
  const [editing, setEditing] = React.useState(false)

  const { today, entries, catMap } = data
  const result = React.useMemo(() => {
    if (!balance) return null
    const thisYear = yearOf(today)
    const row = incomeTaxRow(thisYear)
    const tax = row
      ? businessTaxFigures({
          result: incomeStatement(basis, catMap, thisYear, options).result,
          elapsedMonths: monthOf(today),
          profile,
          row,
          paid: advanceTaxPaid(entries, thisYear),
          losses,
          year: thisYear,
        })
      : null
    const vat = vatOwed(
      data.timeline,
      data.vatEntries,
      entries,
      catMap,
      vatPeriod,
      balance.date
    )
    return {
      vatPeriods: vat.length,
      figure: safeToWithdraw({
        balance: bankEstimate(balance, entries, catMap, today).estimate,
        vat: vat.reduce((sum, p) => sum + p.amount, 0),
        tax: tax ? tax.left : null,
        yel: tax?.yel ? tax.yel.monthly : null,
        bills: payablesReport(entries, catMap, today).total,
        buffer,
      }),
    }
  }, [
    balance,
    today,
    basis,
    catMap,
    options,
    profile,
    entries,
    losses,
    data.timeline,
    data.vatEntries,
    vatPeriod,
    buffer,
  ])

  if (!result) {
    return (
      <Panel
        className="flex flex-1 flex-col"
        bodyClassName="flex flex-1 flex-col items-start gap-3 p-5"
      >
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <WalletIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {f.t("withdraw.noBalance")}
        </p>
      </Panel>
    )
  }

  const { figure, vatPeriods } = result

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-5"
    >
      <div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          {f.t("withdraw.amount")}
          <HelpHint topic={viewHelp("overview.withdraw")} />
        </p>
        <Money
          cents={figure.amount}
          className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
        />
        {figure.short > 0 ? (
          <p className="mt-1 text-sm text-expense">
            {f.t("withdraw.short", { x: f.money(figure.short) })}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-y-1.5 border-y py-3 text-sm">
        <Row label={f.t("withdraw.balance")}>
          <Money cents={figure.balance} />
        </Row>
        {figure.lines.map((line) => (
          <Row
            key={line.kind}
            label={
              line.kind === "vat" && vatPeriods > 0
                ? f.t("withdraw.vatPeriods", { n: vatPeriods })
                : f.t(LABELS[line.kind])
            }
            href={LINKS[line.kind]}
          >
            {line.missing ? (
              <ButtonLink
                variant="link"
                size="sm"
                className="h-auto px-0 font-normal"
                href={SETTINGS_ROUTES.calendar}
              >
                {f.t(MISSING[line.kind] ?? "withdraw.taxMissing")}
              </ButtonLink>
            ) : line.kind === "buffer" && !editing ? (
              <span className="flex items-center gap-1">
                <Money cents={-line.cents} />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={f.t("withdraw.bufferEdit")}
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon />
                </Button>
              </span>
            ) : (
              <Money cents={-line.cents} />
            )}
          </Row>
        ))}
      </dl>

      {editing ? (
        <BufferForm buffer={buffer} onDone={() => setEditing(false)} />
      ) : null}

      <div className="mt-auto flex flex-col items-start gap-3">
        <p className="text-xs text-muted-foreground">{f.t("withdraw.note")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            openDialog({
              kind: "entry",
              mode: "new",
              prefill: {
                date: today,
                type: "expense",
                catId: "owner-withdrawal",
                vatRate: 0,
                amountMode: "gross",
              },
            })
          }
        >
          {f.t("withdraw.book")}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </Panel>
  )
}

function Row({
  label,
  href,
  children,
}: {
  label: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">
        {href ? (
          <ButtonLink
            variant="link"
            size="sm"
            className="h-auto px-0 font-normal text-muted-foreground"
            href={href}
          >
            {label}
          </ButtonLink>
        ) : (
          label
        )}
      </dt>
      <dd className="tabular font-medium">{children}</dd>
    </div>
  )
}

function BufferForm({ buffer, onDone }: { buffer: number; onDone(): void }) {
  const f = useFormatters()
  const setBuffer = useBookStore((s) => s.setWithdrawBuffer)
  const [value, setValue] = React.useState(
    buffer ? formatMoneyPlain(buffer) : ""
  )
  const [error, setError] = React.useState(false)

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const cents = value.trim() === "" ? 0 : evalAmount(value)
    if (cents === null || cents < 0) {
      setError(true)
      return
    }
    setBuffer(cents)
    onDone()
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={save} noValidate>
      <Field data-invalid={error}>
        <FieldLabel htmlFor="withdraw-buffer">
          {f.t("withdraw.bufferLabel")}
        </FieldLabel>
        <AmountInput
          id="withdraw-buffer"
          value={value}
          aria-invalid={error}
          onChange={(event) => {
            setValue(event.target.value)
            setError(false)
          }}
        />
        {error ? <FieldError>{f.t("withdraw.bufferError")}</FieldError> : null}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          {f.t("withdraw.bufferSave")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {f.t("common.cancel")}
        </Button>
      </div>
    </form>
  )
}
