"use client"

import * as React from "react"
import { LandmarkIcon, PencilIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { bankEstimate, type BankBalance } from "@/lib/domain/bank-balance"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { useBookStore } from "@/stores/book-store"

/**
 * The bank account today (§8.12): the balance the user last read, carried
 * forward through the entries booked since. The app cannot see the bank, so
 * a figure that includes entries is labelled as an estimate, with the balance
 * it started from under it.
 */
export function BankWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const balance = useBookStore((s) => s.bankBalance)
  const [editing, setEditing] = React.useState(false)

  if (editing || !balance) {
    return (
      <Panel
        className="flex flex-1 flex-col"
        bodyClassName="flex flex-1 flex-col gap-4 p-5"
      >
        <BalanceForm
          balance={balance}
          today={data.today}
          onDone={() => setEditing(false)}
        />
      </Panel>
    )
  }

  const { count, movement, estimate } = bankEstimate(
    balance,
    data.entries,
    data.catMap,
    data.today
  )

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? f.t("overview.bankEstimate")
            : f.t("overview.bankOn", { d: f.date(balance.date) })}
        </p>
        <Money
          cents={estimate}
          tone={estimate < 0 ? "expense" : undefined}
          className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
        />
      </div>

      {count > 0 ? (
        <>
          <dl className="flex flex-col gap-2 border-y py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">
                {f.t("overview.bankOn", { d: f.date(balance.date) })}
              </dt>
              <dd>
                <Money cents={balance.amount} />
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">
                {f.t("overview.bankMovement", { n: count })}
              </dt>
              <dd>
                <Money
                  cents={movement}
                  tone={movement < 0 ? "expense" : "income"}
                />
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {f.t("overview.bankEstimateNote")}
          </p>
        </>
      ) : null}

      <div className="mt-auto">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <PencilIcon data-icon="inline-start" />
          {f.t("overview.bankUpdate")}
        </Button>
      </div>
    </Panel>
  )
}

function BalanceForm({
  balance,
  today,
  onDone,
}: {
  balance: BankBalance | null
  today: string
  onDone(): void
}) {
  const f = useFormatters()
  const setBankBalance = useBookStore((s) => s.setBankBalance)
  const [amount, setAmount] = React.useState(
    balance ? formatMoneyPlain(balance.amount) : ""
  )
  const [date, setDate] = React.useState(today)
  const [error, setError] = React.useState<{
    field: "amount" | "date"
    message: string
  } | null>(null)

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const cents = parseAmount(amount)
    if (cents === null) {
      setError({ field: "amount", message: f.t("overview.bankAmountError") })
      return
    }
    if (!date || date > today) {
      setError({ field: "date", message: f.t("overview.bankDateError") })
      return
    }
    setBankBalance({ amount: cents, date })
    onDone()
  }

  return (
    <form className="flex flex-1 flex-col gap-4" onSubmit={save} noValidate>
      {balance ? null : (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <LandmarkIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {f.t("overview.bankEmpty")}
        </p>
      )}
      <div className="grid gap-4 @sm:grid-cols-2">
        <Field data-invalid={error?.field === "amount"}>
          <FieldLabel htmlFor="bank-amount">
            {f.t("overview.bankAmount")}
          </FieldLabel>
          <Input
            id="bank-amount"
            inputMode="decimal"
            className="tabular text-right"
            value={amount}
            aria-invalid={error?.field === "amount"}
            onChange={(event) => {
              setAmount(event.target.value)
              if (error?.field === "amount") setError(null)
            }}
          />
        </Field>
        <Field data-invalid={error?.field === "date"}>
          <FieldLabel htmlFor="bank-date">
            {f.t("overview.bankDate")}
          </FieldLabel>
          <Input
            id="bank-date"
            type="date"
            max={today}
            value={date}
            aria-invalid={error?.field === "date"}
            onChange={(event) => {
              setDate(event.target.value)
              if (error?.field === "date") setError(null)
            }}
          />
        </Field>
      </div>
      {error ? <FieldError>{error.message}</FieldError> : null}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          {f.t("overview.bankSave")}
        </Button>
        {balance ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              {f.t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => {
                setBankBalance(null)
                onDone()
              }}
            >
              {f.t("overview.bankRemove")}
            </Button>
          </>
        ) : null}
      </div>
    </form>
  )
}
