"use client"

import * as React from "react"

import {
  SettingCard,
  SettingGrid,
  SettingValue,
} from "@/components/common/setting-card"
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

/**
 * The calculators for lines 354 and 364, for the selected year (§8.8). Each
 * opens in a dialog (`DeductionDialog`); the page lists what they booked.
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

  const bookedTotal = booked.reduce((sum, e) => sum + calcEntry(e).net, 0)

  const calculator = (
    which: "mileage" | "per-diem" | "home-office",
    catId: string,
    title: string,
    hint: string
  ) => {
    const own = booked.filter((e) => e.catId === catId)
    return (
      <SettingCard key={which} label={title} info={hint}>
        <SettingValue
          value={f.money(own.reduce((sum, e) => sum + calcEntry(e).net, 0))}
          note={`${f.t("deductions.statVouchers")}: ${own.length}`}
        />
        <div className="print-hidden">
          <Button
            variant="outline"
            onClick={() => openDialog({ kind: "deduction", which })}
          >
            {f.t("deductions.calculate")}
          </Button>
        </div>
      </SettingCard>
    )
  }

  /* A calculator with no rates for the year still shows, at nothing. */
  const unavailable = (key: string, title: string, why: string) => (
    <SettingCard key={key} label={title} info={why}>
      <SettingValue
        value="–"
        muted
        note={f.t("deductions.noRates", { y: year })}
      />
    </SettingCard>
  )

  return (
    <SettingGrid key={year}>
      <SettingCard
        label={f.t("deductions.statBooked")}
        info={[
          f.t("deductions.intro", { y: year }),
          booked.length === 0 ? f.t("deductions.noneBooked") : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SettingValue
          value={f.money(bookedTotal)}
          note={`${f.t("deductions.statVouchers")}: ${booked.length}`}
        />
      </SettingCard>
      {shown.has("car")
        ? rates
          ? calculator(
              "mileage",
              CAT_CAR,
              f.t("deductions.mileageTitle"),
              f.t("deductions.mileageCard")
            )
          : unavailable(
              "mileage",
              f.t("deductions.mileageTitle"),
              f.t("deductions.noTravelRates", { y: year })
            )
        : null}
      {rates
        ? calculator(
            "per-diem",
            CAT_TRAVEL,
            f.t("deductions.perDiemTitle"),
            f.t("deductions.perDiemCard")
          )
        : unavailable(
            "per-diem",
            f.t("deductions.perDiemTitle"),
            f.t("deductions.noTravelRates", { y: year })
          )}
      {!shown.has("homeOffice")
        ? null
        : homeOffice
          ? calculator(
              "home-office",
              CAT_354,
              f.t("deductions.homeTitle"),
              f.t("deductions.homeCard")
            )
          : unavailable(
              "home-office",
              f.t("deductions.homeTitle"),
              f.t("deductions.noHomeRates", { y: year })
            )}
      {booked.map((e) => (
        <SettingCard key={e.id} label={f.date(e.date)}>
          <p className="text-base font-medium">
            <button
              type="button"
              className="min-w-0 truncate text-left underline-offset-2 hover:underline"
              onClick={() =>
                openDialog({ kind: "entry", mode: "edit", entryId: e.id })
              }
            >
              {e.description}
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            {f.money(calcEntry(e).net)}
          </p>
        </SettingCard>
      ))}
    </SettingGrid>
  )
}
