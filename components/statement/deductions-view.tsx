"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { TotalCard } from "@/components/common/total-card"
import { useFormatters } from "@/components/lang-provider"
import {
  CAT_354,
  CAT_CAR,
  CAT_TRAVEL,
} from "@/components/statement/deduction-dialog"
import { Button } from "@/components/ui/button"
import { useShownFeatures } from "@/hooks/use-shown-features"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { homeOfficeAmounts, travelRates } from "@/lib/domain/deductions"
import { useBookStore } from "@/stores/book-store"

/** The categories the calculators book on, which the list of booked vouchers reads. */
const CALCULATED = new Set([CAT_354, CAT_TRAVEL, CAT_CAR])

type Which = "mileage" | "per-diem" | "home-office"

/**
 * The calculators for lines 354 and 364, for the selected year (§8.8), in
 * three parts that each hold one kind of thing: the totals booked, the
 * calculators as a list of actions, and the vouchers they made. Each
 * calculator opens in a dialog (`DeductionDialog`).
 */
export function DeductionsView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)
  const openDialog = useBookStore((s) => s.openDialog)
  const shown = useShownFeatures()
  const rates = travelRates(year)
  const homeOffice = homeOfficeAmounts(year)
  const booked = React.useMemo(
    () =>
      entries.filter((e) => CALCULATED.has(e.catId) && yearOf(e.date) === year),
    [entries, year]
  )
  const total = (list: typeof booked) =>
    list.reduce((sum, e) => sum + calcEntry(e).net, 0)

  /* A calculator with no rates for the year still shows, with the reason. */
  const calculators: {
    which: Which
    catId: string
    title: string
    hint: string
    missing: string | null
  }[] = []
  if (shown.has("car")) {
    calculators.push({
      which: "mileage",
      catId: CAT_CAR,
      title: f.t("deductions.mileageTitle"),
      hint: f.t("deductions.mileageCard"),
      missing: rates ? null : f.t("deductions.noTravelRates", { y: year }),
    })
  }
  calculators.push({
    which: "per-diem",
    catId: CAT_TRAVEL,
    title: f.t("deductions.perDiemTitle"),
    hint: f.t("deductions.perDiemCard"),
    missing: rates ? null : f.t("deductions.noTravelRates", { y: year }),
  })
  if (shown.has("homeOffice")) {
    calculators.push({
      which: "home-office",
      catId: CAT_354,
      title: f.t("deductions.homeTitle"),
      hint: f.t("deductions.homeCard"),
      missing: homeOffice ? null : f.t("deductions.noHomeRates", { y: year }),
    })
  }

  return (
    <div key={year} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <TotalCard label={f.t("deductions.statBooked")}>
          <Money cents={total(booked)} />
        </TotalCard>
        <TotalCard label={f.t("deductions.statVouchers")}>
          <span className="tabular">{booked.length}</span>
        </TotalCard>
      </div>

      <Panel
        title={f.t("deductions.calculatorsTitle")}
        description={f.t("deductions.intro", { y: year })}
      >
        <ul className="divide-y">
          {calculators.map((c) => {
            const own = booked.filter((e) => e.catId === c.catId)
            return (
              <li
                key={c.which}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-0 flex-[1_1_16rem]">
                  <h3 className="font-medium">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {c.missing ?? c.hint}
                  </p>
                </div>
                {own.length ? (
                  <p className="text-sm text-muted-foreground">
                    {f.t("deductions.bookedSoFar", {
                      s: f.money(total(own)),
                      n: own.length,
                    })}
                  </p>
                ) : null}
                {c.missing ? null : (
                  <Button
                    variant="outline"
                    className="print-hidden"
                    aria-label={`${f.t("deductions.calculate")}: ${c.title}`}
                    onClick={() =>
                      openDialog({ kind: "deduction", which: c.which })
                    }
                  >
                    {f.t("deductions.calculate")}
                  </Button>
                )}
              </li>
            )
          })}
          <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-[1_1_16rem]">
              <h3 className="font-medium">{f.t("deductions.detailsCard")}</h3>
              <p className="text-sm text-muted-foreground">
                {f.t("deductions.detailsCardInfo")}
              </p>
            </div>
            <Button
              variant="outline"
              className="print-hidden"
              onClick={() => openDialog({ kind: "form5-details" })}
            >
              {f.t("deductions.detailsOpen")}
            </Button>
          </li>
        </ul>
      </Panel>

      <Panel title={f.t("deductions.bookedTitle", { y: year })}>
        {booked.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {f.t("deductions.noneBooked")}
          </p>
        ) : (
          <ul className="divide-y">
            {booked.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-4 px-4 py-3 text-sm"
              >
                <span className="tabular shrink-0 text-muted-foreground">
                  {f.date(e.date)}
                </span>
                <button
                  type="button"
                  className="focus-ring min-w-0 flex-1 truncate rounded-sm text-left underline-offset-2 hover:underline"
                  onClick={() =>
                    openDialog({ kind: "entry", mode: "edit", entryId: e.id })
                  }
                >
                  {e.description}
                </button>
                <Money cents={calcEntry(e).net} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
