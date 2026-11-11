"use client"

import * as React from "react"

import { EuroInput } from "@/components/common/euro-input"
import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookWithMemo } from "@/lib/commands/memo-commands"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso, yearOf } from "@/lib/domain/dates"
import {
  additionalDeduction,
  calculatedEntryDate,
  homeOfficeAmounts,
  HOME_OFFICE_TIERS,
  mileageAllowance,
  perDiemAllowance,
  travelRates,
  type HomeOfficeTier,
  type TravelRates,
} from "@/lib/domain/deductions"
import { uid } from "@/lib/domain/id"
import type { MemoRow } from "@/lib/domain/memo-voucher"
import { formatMoneyPlain } from "@/lib/domain/money"
import { evalAmount } from "@/lib/domain/amount-expr"
import type { Cents, Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

export const CAT_354 = "354"
export const CAT_TRAVEL = "364-travel"
export const CAT_CAR = "364-car"

/** Whole, non-negative numbers: kilometres and days. Anything else is zero. */
function count(text: string): number {
  const n = Number(text.replace(",", ".").replace(/\s/g, ""))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * The calculators for lines 354 and 364 (§8.8), one per `which`. Each one
 * books its result as an entry with a memo voucher and closes.
 */
export function DeductionDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "deduction") return null
  return <DeductionForm which={dialog.which} />
}

function DeductionForm({
  which,
}: {
  which: "mileage" | "per-diem" | "home-office"
}) {
  const year = useBookStore((s) => s.year)
  const rates = travelRates(year)
  if (which === "mileage" && rates) return <MileageBody rates={rates} />
  if (which === "per-diem" && rates) return <PerDiemBody rates={rates} />
  if (which === "home-office") return <HomeOfficeBody />
  return null
}

/** What a calculator worked out, for the memo voucher of its entry (§8.8). */
interface DeductionMemo {
  heading: string
  calculation: MemoRow[]
  notes: string[]
}

/** Books an amount on a category as an entry of the selected year, with its memo voucher. */
function useBookDeduction() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const memoVoucher = useMemoVoucher()
  return (
    catId: string,
    description: string,
    amount: Cents,
    memo: DeductionMemo
  ) => {
    const entry: Entry = {
      id: `e-${uid()}`,
      date: calculatedEntryDate(year, todayIso()),
      description,
      type: "expense",
      catId,
      amount,
      vatRate: 0,
      amountMode: "net",
    }
    return bookWithMemo(
      ctx,
      entry,
      memoVoucher(memo.heading, entry, memo.calculation, memo.notes),
      f.t("deductions.booked")
    )
  }
}

function CalculatorDialog({
  title,
  description,
  amount,
  ready,
  onBook,
  children,
}: {
  title: string
  description: string
  amount: Cents
  /** Whether anything has been filled in yet. */
  ready: boolean
  /** Resolves true when the entry was booked, which closes the dialog. */
  onBook: () => Promise<boolean>
  children: React.ReactNode
}) {
  const f = useFormatters()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const [busy, setBusy] = React.useState(false)
  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 min-[560px]:grid-cols-2">
          {children}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {ready && amount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {f.t("deductions.nothing")}
            </p>
          ) : (
            <p className="flex flex-col">
              <span className="text-sm text-muted-foreground">
                {f.t("deductions.result")}
              </span>
              <Money cents={amount} className="text-lg font-semibold" />
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeDialog}>
              {f.t("common.cancel")}
            </Button>
            <Button
              disabled={amount === 0 || busy}
              onClick={async () => {
                setBusy(true)
                const done = await onBook()
                setBusy(false)
                if (done) closeDialog()
              }}
            >
              {f.t("deductions.book")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MileageBody({ rates }: { rates: TravelRates }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const book = useBookDeduction()

  // The usual case filled in, on the side that can only lower the deduction.
  const vehicleCosts = entries
    .filter((e) => e.catId === "344-vehicle" && yearOf(e.date) === year)
    .reduce((sum, e) => sum + calcEntry(e).net, 0)
  const [km, setKm] = React.useState("")
  const [costs, setCosts] = React.useState(
    vehicleCosts ? formatMoneyPlain(vehicleCosts) : ""
  )

  const kilometres = count(km)
  const bookedCosts = evalAmount(costs) ?? 0
  const amount = additionalDeduction(
    mileageAllowance(kilometres, rates),
    bookedCosts
  )

  return (
    <CalculatorDialog
      title={f.t("deductions.mileageTitle")}
      description={f.t("deductions.mileageHint", { r: f.money(rates.km) })}
      amount={amount}
      ready={kilometres > 0}
      onBook={() =>
        book(
          CAT_CAR,
          f.t("deductions.mileageEntry", {
            y: year,
            k: kilometres,
            r: f.money(rates.km),
            b: f.money(bookedCosts),
          }),
          amount,
          {
            heading: f.t("memo.mileageHeading", { y: year }),
            calculation: [
              { label: f.t("deductions.km"), value: String(kilometres) },
              { label: f.t("memo.rate"), value: f.money(rates.km) },
              {
                label: f.t("memo.allowance"),
                value: f.money(mileageAllowance(kilometres, rates)),
              },
              {
                label: f.t("deductions.bookedCar"),
                value: f.money(bookedCosts),
              },
              {
                label: f.t("memo.deduction"),
                value: f.money(amount),
                strong: true,
              },
            ],
            notes: [f.t("memo.travelRule", { y: year }), f.t("memo.keepLog")],
          }
        )
      }
    >
      <Field>
        <FieldLabel htmlFor="ded-km">{f.t("deductions.km")}</FieldLabel>
        <Input
          id="ded-km"
          inputMode="numeric"
          className="tabular text-right"
          value={km}
          onChange={(event) => setKm(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="ded-car">{f.t("deductions.bookedCar")}</FieldLabel>
        <EuroInput
          id="ded-car"
          value={costs}
          onChange={(event) => setCosts(event.target.value)}
        />
        <FieldDescription>{f.t("deductions.bookedCarHint")}</FieldDescription>
      </Field>
      {/* The sum as it is worked out, so the result never comes as a surprise. */}
      <dl
        className="grid gap-1.5 rounded-lg bg-muted/50 p-3 text-sm min-[560px]:col-span-2"
        aria-live="polite"
      >
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {f.t("deductions.kmTimesRate", {
              k: kilometres,
              r: f.money(rates.km),
            })}
          </dt>
          <dd>
            <Money cents={mileageAllowance(kilometres, rates)} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {f.t("deductions.lessCarCosts")}
          </dt>
          <dd>
            <Money cents={bookedCosts} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1.5 font-medium">
          <dt>{f.t("deductions.result")}</dt>
          <dd>
            <Money cents={amount} />
          </dd>
        </div>
      </dl>
    </CalculatorDialog>
  )
}

function PerDiemBody({ rates }: { rates: TravelRates }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const book = useBookDeduction()
  const [full, setFull] = React.useState("")
  const [partial, setPartial] = React.useState("")
  const [costs, setCosts] = React.useState("")

  const fullDays = Math.trunc(count(full))
  const partialDays = Math.trunc(count(partial))
  const bookedCosts = evalAmount(costs) ?? 0
  const allowance = perDiemAllowance(fullDays, partialDays, rates)
  const amount = additionalDeduction(allowance, bookedCosts)

  return (
    <CalculatorDialog
      title={f.t("deductions.perDiemTitle")}
      description={f.t("deductions.perDiemHint", {
        a: f.money(rates.partialPerDiem),
        b: f.money(rates.fullPerDiem),
      })}
      amount={amount}
      ready={fullDays + partialDays > 0}
      onBook={() =>
        book(
          CAT_TRAVEL,
          f.t("deductions.perDiemEntry", {
            y: year,
            a: fullDays,
            x: f.money(rates.fullPerDiem),
            b: partialDays,
            z: f.money(rates.partialPerDiem),
            c: f.money(bookedCosts),
          }),
          amount,
          {
            heading: f.t("memo.perDiemHeading", { y: year }),
            calculation: [
              {
                label: f.t("deductions.fullDays"),
                value: `${fullDays} × ${f.money(rates.fullPerDiem)}`,
              },
              {
                label: f.t("deductions.partialDays"),
                value: `${partialDays} × ${f.money(rates.partialPerDiem)}`,
              },
              { label: f.t("memo.allowance"), value: f.money(allowance) },
              {
                label: f.t("deductions.bookedLiving"),
                value: f.money(bookedCosts),
              },
              {
                label: f.t("memo.deduction"),
                value: f.money(amount),
                strong: true,
              },
            ],
            notes: [f.t("memo.travelRule", { y: year }), f.t("memo.keepTrips")],
          }
        )
      }
    >
      <Field>
        <FieldLabel htmlFor="ded-full">{f.t("deductions.fullDays")}</FieldLabel>
        <Input
          id="ded-full"
          inputMode="numeric"
          className="tabular text-right"
          value={full}
          onChange={(event) => setFull(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="ded-partial">
          {f.t("deductions.partialDays")}
        </FieldLabel>
        <Input
          id="ded-partial"
          inputMode="numeric"
          className="tabular text-right"
          value={partial}
          onChange={(event) => setPartial(event.target.value)}
        />
      </Field>
      <Field className="min-[560px]:col-span-2">
        <FieldLabel htmlFor="ded-living">
          {f.t("deductions.bookedLiving")}
        </FieldLabel>
        <EuroInput
          id="ded-living"
          value={costs}
          onChange={(event) => setCosts(event.target.value)}
        />
      </Field>
    </CalculatorDialog>
  )
}

function HomeOfficeBody() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const book = useBookDeduction()
  const amounts = homeOfficeAmounts(year)
  const [tier, setTier] = React.useState<HomeOfficeTier>("full")
  if (!amounts) return null

  const tierLabel: Record<HomeOfficeTier, string> = {
    full: f.t("deductions.tierFull"),
    part: f.t("deductions.tierPart"),
    occasional: f.t("deductions.tierOccasional"),
  }
  const description = f.t("deductions.homeEntry", { y: year })
  // One a year: the amount is a yearly total, whatever the tier.
  const exists = entries.some(
    (e) =>
      e.catId === CAT_354 &&
      yearOf(e.date) === year &&
      e.description === description
  )

  return (
    <CalculatorDialog
      title={f.t("deductions.homeTitle")}
      description={f.t("deductions.homeHint", { x: f.money(amounts.full) })}
      amount={exists ? 0 : amounts[tier]}
      ready={false}
      onBook={() =>
        book(CAT_354, description, amounts[tier], {
          heading: f.t("memo.homeHeading", { y: year }),
          calculation: [
            { label: f.t("deductions.tier"), value: tierLabel[tier] },
            {
              label: f.t("memo.deduction"),
              value: f.money(amounts[tier]),
              strong: true,
            },
          ],
          notes: [f.t("memo.homeRule", { y: year })],
        })
      }
    >
      <fieldset className="grid gap-2 min-[560px]:col-span-2">
        <legend className="mb-1 text-sm font-medium">
          {f.t("deductions.tier")}
        </legend>
        {HOME_OFFICE_TIERS.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="home-office-tier"
              className="mt-0.5 accent-primary"
              checked={tier === value}
              onChange={() => setTier(value)}
            />
            <span className="min-w-0 flex-1">{tierLabel[value]}</span>
            <Money cents={amounts[value]} className="font-medium" />
          </label>
        ))}
        {exists ? (
          <FieldDescription className="text-warning">
            {f.t("deductions.homeExists", { y: year })}
          </FieldDescription>
        ) : null}
      </fieldset>
    </CalculatorDialog>
  )
}
