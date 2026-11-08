"use client"

import * as React from "react"
import { LockIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { Pill } from "@/components/common/pill"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { useForm5 } from "@/components/statement/use-form5"
import { AmountField } from "@/components/statement/year-end-figures-dialog"
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
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookWithMemo } from "@/lib/commands/memo-commands"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso, yearOf } from "@/lib/domain/dates"
import { calculatedEntryDate } from "@/lib/domain/deductions"
import { EMPTY_YEAR_END, type YearEnd } from "@/lib/domain/form5-balance"
import { carUse } from "@/lib/domain/form5-extra"
import { uid } from "@/lib/domain/id"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/** The category the private use of a car is booked on. */
const CAT_CAR_USE = "313"

/**
 * The details Form 5 asks for that the book cannot work out (§8.8): the
 * driving behind the private use of a car, the base rate for interest that
 * negative equity makes non-deductible, and the form's choices. They are kept
 * in the year's `YearEnd`. Each field commits on blur.
 */
export function Form5DetailsDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "form5-details") return null
  return <DetailsForm />
}

function DetailsForm() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const setYearEnd = useBookStore((s) => s.setYearEnd)
  const stored = useBookStore((s) => s.yearEnd[year])
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])
  const { balance } = useForm5()
  const values = stored ?? EMPTY_YEAR_END
  const set = (key: keyof YearEnd) => (n: number) =>
    setYearEnd(year, { ...values, [key]: n })
  const { interest } = balance

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {f.t("deductions.detailsTitle", { y: year })}
            {filed ? (
              <Pill>
                <LockIcon className="mr-1 size-3" aria-hidden />
                {f.t("balance.locked")}
              </Pill>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {f.t(filed ? "deductions.detailsFiled" : "deductions.detailsHint")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-8 overflow-y-auto pr-1">
          <CarSection values={values} disabled={filed} set={set} />

          {interest.active ? (
            <section className="flex flex-col gap-4">
              <Heading
                title={f.t("deductions.detailsInterestTitle")}
                hint={f.t("deductions.detailsInterestHint")}
              />
              <div className="grid gap-4 min-[700px]:grid-cols-2">
                <RateField
                  id="details-rate"
                  label={f.t("deductions.detailsRate")}
                  hundredths={values.interestRate}
                  disabled={filed}
                  onCommit={set("interestRate")}
                />
                <AmountField
                  id="details-revaluations"
                  label={f.t("deductions.detailsRevaluations")}
                  help={f.t("deductions.detailsRevaluations")}
                  cents={values.revaluations}
                  disabled={filed}
                  onCommit={set("revaluations")}
                />
                <AmountField
                  id="details-year-loss"
                  label={f.t("deductions.detailsYearLoss")}
                  help={f.t("deductions.detailsYearLoss")}
                  cents={values.yearLoss}
                  disabled={filed}
                  onCommit={set("yearLoss")}
                />
                <AmountField
                  id="details-prior-losses"
                  label={f.t("deductions.detailsPriorLosses")}
                  help={f.t("deductions.detailsPriorLosses")}
                  cents={values.priorLosses}
                  disabled={filed}
                  onCommit={set("priorLosses")}
                />
              </div>
              <dl className="grid gap-1 text-sm min-[700px]:grid-cols-3">
                <Figure
                  label={f.t("deductions.detailsNegativeEquity")}
                  cents={interest.negativeEquity}
                />
                <Figure
                  label={f.t("deductions.detailsAdjusted")}
                  cents={interest.adjusted}
                />
                <Figure
                  label={f.t("deductions.detailsDisallowed")}
                  cents={interest.disallowed}
                />
              </dl>
              {interest.rateMissing ? (
                <p className="text-sm text-destructive">
                  {f.t("deductions.detailsRateMissing")}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <Heading title={f.t("deductions.detailsOtherTitle")} />
            <div className="grid gap-4 min-[700px]:grid-cols-2">
              <AmountField
                id="details-reserve"
                label={f.t("deductions.detailsReserve")}
                help={f.t("deductions.detailsReserve")}
                cents={values.operatingReserve}
                disabled={filed}
                onCommit={set("operatingReserve")}
              />
              <AmountField
                id="details-loss-capital"
                label={f.t("deductions.detailsLossToCapital")}
                help={f.t("deductions.detailsLossToCapital")}
                cents={values.lossToCapital}
                disabled={filed}
                onCommit={set("lossToCapital")}
              />
              <ChoiceField
                id="details-split"
                label={f.t("deductions.detailsSplit")}
                value={values.incomeSplit}
                disabled={filed}
                options={[
                  [0, f.t("deductions.detailsSplit0")],
                  [1, f.t("deductions.detailsSplit1")],
                  [2, f.t("deductions.detailsSplit2")],
                ]}
                onCommit={set("incomeSplit")}
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

function CarSection({
  values,
  disabled,
  set,
}: {
  values: YearEnd
  disabled: boolean
  set: (key: keyof YearEnd) => (n: number) => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const memoVoucher = useMemoVoucher()
  const [busy, setBusy] = React.useState(false)

  const car = carUse(values)
  const booked = entries
    .filter((e) => e.catId === CAT_CAR_USE && yearOf(e.date) === year)
    .reduce((sum, e) => sum + calcEntry(e).net, 0)

  async function book() {
    if (!car) return
    setBusy(true)
    const entry: Entry = {
      id: `e-${uid()}`,
      date: calculatedEntryDate(year, todayIso()),
      description: f.t("deductions.detailsCarEntry", {
        y: year,
        k: car.private,
        t: car.total,
      }),
      type: "income",
      catId: CAT_CAR_USE,
      amount: car.privateShare,
      vatRate: 0,
      amountMode: "net",
    }
    await bookWithMemo(
      ctx,
      entry,
      memoVoucher(
        f.t("deductions.detailsCarHeading", { y: year }),
        entry,
        [
          {
            label: f.t("deductions.detailsKmBusiness"),
            value: String(car.business),
          },
          {
            label: f.t("deductions.detailsKmPrivate"),
            value: String(car.private),
          },
          { label: f.t("deductions.detailsTotalKm"), value: String(car.total) },
          {
            label: f.t("deductions.detailsCarCosts"),
            value: f.money(car.costs),
          },
          { label: f.t("deductions.detailsPerKm"), value: f.money(car.perKm) },
          {
            label: f.t("deductions.detailsShare"),
            value: f.money(car.privateShare),
            strong: true,
          },
        ],
        [f.t("deductions.detailsCarRule")]
      ),
      f.t("deductions.detailsCarDone")
    )
    setBusy(false)
  }

  return (
    <section className="flex flex-col gap-4">
      <Heading
        title={f.t("deductions.detailsCarTitle")}
        hint={f.t("deductions.detailsCarHint")}
      />
      <div className="grid gap-4 min-[700px]:grid-cols-2">
        <CountField
          id="details-km-business"
          label={f.t("deductions.detailsKmBusiness")}
          value={values.carKmBusiness}
          disabled={disabled}
          onCommit={set("carKmBusiness")}
        />
        <CountField
          id="details-km-private"
          label={f.t("deductions.detailsKmPrivate")}
          value={values.carKmPrivate}
          disabled={disabled}
          onCommit={set("carKmPrivate")}
        />
        <AmountField
          id="details-car-costs"
          label={f.t("deductions.detailsCarCosts")}
          help={f.t("deductions.detailsCarCosts")}
          cents={values.carCosts}
          disabled={disabled}
          onCommit={set("carCosts")}
        />
        <ChoiceField
          id="details-vehicle"
          label={f.t("deductions.detailsVehicle")}
          value={values.carVehicle}
          disabled={disabled}
          options={[
            [0, f.t("deductions.detailsVehicle0")],
            [1, f.t("deductions.detailsVehicle1")],
            [2, f.t("deductions.detailsVehicle2")],
            [3, f.t("deductions.detailsVehicle3")],
            [4, f.t("deductions.detailsVehicle4")],
          ]}
          onCommit={set("carVehicle")}
        />
        <ChoiceField
          id="details-basis"
          label={f.t("deductions.detailsBasis")}
          value={values.carBasis}
          disabled={disabled}
          options={[
            [0, f.t("deductions.detailsBasis0")],
            [1, f.t("deductions.detailsBasis1")],
            [2, f.t("deductions.detailsBasis2")],
          ]}
          onCommit={set("carBasis")}
        />
      </div>
      {car ? (
        <dl className="grid gap-1 text-sm min-[700px]:grid-cols-3">
          <Figure label={f.t("deductions.detailsPerKm")} cents={car.perKm} />
          <Figure
            label={f.t("deductions.detailsShare")}
            cents={car.privateShare}
          />
          <Figure label={f.t("deductions.detailsBookedCar")} cents={booked} />
        </dl>
      ) : null}
      {car && booked === 0 ? (
        <div>
          <Button
            variant="outline"
            disabled={disabled || busy}
            onClick={() => void book()}
          >
            {f.t("deductions.detailsBookCar")}
          </Button>
        </div>
      ) : null}
      {car && booked !== 0 && booked !== car.privateShare ? (
        <p className="text-sm text-destructive">
          {f.t("deductions.detailsCarMismatch")}
        </p>
      ) : null}
    </section>
  )
}

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-b pb-3">
      <h3 className="font-medium">{title}</h3>
      {hint ? (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function Figure({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 min-[700px]:flex-col min-[700px]:items-start">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <Money cents={cents} className="font-medium" />
      </dd>
    </div>
  )
}

/** A whole, non-negative number such as kilometres. */
function CountField({
  id,
  label,
  value,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  value: number
  disabled: boolean
  onCommit: (n: number) => void
}) {
  const f = useFormatters()
  const [text, setText] = React.useState(value ? String(value) : "")
  const [bad, setBad] = React.useState(false)

  const commit = () => {
    const clean = text.replace(/\s/g, "")
    const n = clean === "" ? 0 : Number(clean)
    if (!Number.isInteger(n) || n < 0) {
      setBad(true)
      return
    }
    setBad(false)
    if (n !== value) onCommit(n)
  }

  return (
    <Field data-invalid={bad}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        className="tabular text-right"
        disabled={disabled}
        aria-invalid={bad}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {bad ? (
        <FieldError>{f.t("deductions.detailsBadNumber")}</FieldError>
      ) : null}
    </Field>
  )
}

/** A percentage typed as `3,15`, kept in hundredths. */
function RateField({
  id,
  label,
  hundredths,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  hundredths: number
  disabled: boolean
  onCommit: (n: number) => void
}) {
  const f = useFormatters()
  const [text, setText] = React.useState(
    hundredths ? (hundredths / 100).toFixed(2).replace(".", ",") : ""
  )
  const [bad, setBad] = React.useState(false)

  const commit = () => {
    const clean = text.replace(/\s/g, "").replace(",", ".")
    const n = clean === "" ? 0 : Number(clean)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setBad(true)
      return
    }
    setBad(false)
    const next = Math.round(n * 100)
    if (next !== hundredths) onCommit(next)
  }

  return (
    <Field data-invalid={bad}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="decimal"
        className="tabular text-right"
        disabled={disabled}
        aria-invalid={bad}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {bad ? <FieldError>{f.t("deductions.detailsBadRate")}</FieldError> : null}
    </Field>
  )
}

/** One of a few numbered choices, as the form lists them. */
function ChoiceField({
  id,
  label,
  value,
  options,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  value: number
  options: readonly (readonly [number, string])[]
  disabled: boolean
  onCommit: (n: number) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        disabled={disabled}
        value={value}
        onChange={(e) => onCommit(Number(e.target.value))}
        className="focus-ring h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
      >
        {options.map(([n, text]) => (
          <option key={n} value={n}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  )
}
