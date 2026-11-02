"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
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
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import type { Cents } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

const CAT_354 = "354"

/** Whole, non-negative numbers: kilometres and days. Anything else is zero. */
function count(text: string): number {
  const n = Number(text.replace(",", ".").replace(/\s/g, ""))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** The calculators for line 354, for the selected year (§8.8). */
export function DeductionsView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const openDialog = useBookStore((s) => s.openDialog)
  const rates = travelRates(year)
  const booked = React.useMemo(
    () => entries.filter((e) => e.catId === CAT_354 && yearOf(e.date) === year),
    [entries, year]
  )

  return (
    <div className="flex flex-col gap-6" key={year}>
      <p className="text-sm text-muted-foreground">
        {f.t("deductions.intro", { y: year })}
      </p>

      {rates ? (
        <>
          <MileageForm rates={rates} />
          <PerDiemForm rates={rates} />
        </>
      ) : (
        <Panel bodyClassName="p-4 text-sm text-muted-foreground">
          {f.t("deductions.noTravelRates", { y: year })}
        </Panel>
      )}
      <HomeOfficeForm />

      <Panel title={f.t("deductions.bookedTitle", { y: year })}>
        {booked.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {f.t("deductions.noneBooked")}
          </p>
        ) : (
          <ul className="divide-y">
            {booked.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() =>
                    openDialog({ kind: "entry", mode: "edit", entryId: e.id })
                  }
                >
                  <span className="min-w-0">{e.description}</span>
                  <Money cents={calcEntry(e).net} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

/** Book an amount on line 354 as an entry of the selected year. */
function useBookDeduction() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  return (description: string, amount: Cents) =>
    addEntriesWithUndo(
      ctx,
      [
        {
          id: `e-${uid()}`,
          date: calculatedEntryDate(year, todayIso()),
          description,
          type: "expense",
          catId: CAT_354,
          amount,
          vatRate: 0,
          amountMode: "net",
        },
      ],
      f.t("deductions.booked")
    )
}

function ResultFooter({
  amount,
  ready,
  onBook,
}: {
  amount: Cents
  /** Whether anything has been filled in yet. */
  ready: boolean
  onBook: () => void
}) {
  const f = useFormatters()
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <p className="text-sm">
        {ready && amount === 0 ? (
          <span className="text-muted-foreground">
            {f.t("deductions.nothing")}
          </span>
        ) : (
          <>
            <span className="text-muted-foreground">
              {f.t("deductions.result")}:{" "}
            </span>
            <Money cents={amount} className="font-medium" />
          </>
        )}
      </p>
      <Button variant="outline" disabled={amount === 0} onClick={onBook}>
        {f.t("deductions.book")}
      </Button>
    </div>
  )
}

function MileageForm({ rates }: { rates: TravelRates }) {
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
  const bookedCosts = parseAmount(costs) ?? 0
  const amount = additionalDeduction(
    mileageAllowance(kilometres, rates),
    bookedCosts
  )

  return (
    <Panel
      title={f.t("deductions.mileageTitle")}
      description={f.t("deductions.mileageHint", {
        r: f.money(rates.km),
      })}
      bodyClassName="grid gap-4 p-4 sm:grid-cols-2"
      footer={
        <ResultFooter
          amount={amount}
          ready={kilometres > 0}
          onBook={() =>
            void book(
              f.t("deductions.mileageEntry", {
                y: year,
                k: kilometres,
                r: f.money(rates.km),
                b: f.money(bookedCosts),
              }),
              amount
            ).then((done) => {
              if (done) setKm("")
            })
          }
        />
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
        <Input
          id="ded-car"
          inputMode="decimal"
          className="tabular text-right"
          value={costs}
          onChange={(event) => setCosts(event.target.value)}
        />
        <FieldDescription>{f.t("deductions.bookedCarHint")}</FieldDescription>
      </Field>
    </Panel>
  )
}

function PerDiemForm({ rates }: { rates: TravelRates }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const book = useBookDeduction()
  const [full, setFull] = React.useState("")
  const [partial, setPartial] = React.useState("")
  const [costs, setCosts] = React.useState("")

  const fullDays = Math.trunc(count(full))
  const partialDays = Math.trunc(count(partial))
  const bookedCosts = parseAmount(costs) ?? 0
  const amount = additionalDeduction(
    perDiemAllowance(fullDays, partialDays, rates),
    bookedCosts
  )

  return (
    <Panel
      title={f.t("deductions.perDiemTitle")}
      description={f.t("deductions.perDiemHint", {
        a: f.money(rates.partialPerDiem),
        b: f.money(rates.fullPerDiem),
      })}
      bodyClassName="grid gap-4 p-4 sm:grid-cols-3"
      footer={
        <ResultFooter
          amount={amount}
          ready={fullDays + partialDays > 0}
          onBook={() =>
            void book(
              f.t("deductions.perDiemEntry", {
                y: year,
                a: fullDays,
                x: f.money(rates.fullPerDiem),
                b: partialDays,
                z: f.money(rates.partialPerDiem),
                c: f.money(bookedCosts),
              }),
              amount
            ).then((done) => {
              if (done) {
                setFull("")
                setPartial("")
                setCosts("")
              }
            })
          }
        />
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
      <Field>
        <FieldLabel htmlFor="ded-living">
          {f.t("deductions.bookedLiving")}
        </FieldLabel>
        <Input
          id="ded-living"
          inputMode="decimal"
          className="tabular text-right"
          value={costs}
          onChange={(event) => setCosts(event.target.value)}
        />
      </Field>
    </Panel>
  )
}

function HomeOfficeForm() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const book = useBookDeduction()
  const amounts = homeOfficeAmounts(year)
  const [tier, setTier] = React.useState<HomeOfficeTier>("full")

  if (!amounts) {
    return (
      <Panel bodyClassName="p-4 text-sm text-muted-foreground">
        {f.t("deductions.noHomeRates", { y: year })}
      </Panel>
    )
  }

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
    <Panel
      title={f.t("deductions.homeTitle")}
      description={f.t("deductions.homeHint", { x: f.money(amounts.full) })}
      bodyClassName="p-4"
      footer={
        <ResultFooter
          amount={exists ? 0 : amounts[tier]}
          ready={false}
          onBook={() => void book(description, amounts[tier])}
        />
      }
    >
      <Field>
        <FieldLabel>{f.t("deductions.tier")}</FieldLabel>
        <OptionSelect
          label={f.t("deductions.tier")}
          options={HOME_OFFICE_TIERS.map((value) => ({
            value,
            label: `${tierLabel[value]} (${f.money(amounts[value])})`,
          }))}
          value={tier}
          onChange={(value) => setTier(value as HomeOfficeTier)}
        />
        {exists ? (
          <FieldDescription className="text-warning">
            {f.t("deductions.homeExists", { y: year })}
          </FieldDescription>
        ) : null}
      </Field>
    </Panel>
  )
}
