"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { PANEL_ROWS, Panel } from "@/components/common/panel"
import { StatStrip } from "@/components/common/stat-strip"
import { useFormatters } from "@/components/lang-provider"
import {
  CAT_354,
  CAT_CAR,
  CAT_TRAVEL,
} from "@/components/statement/deduction-dialog"
import { Button } from "@/components/ui/button"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { homeOfficeAmounts, travelRates } from "@/lib/domain/deductions"
import { cn } from "@/lib/utils"
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
  const rates = travelRates(year)
  const homeOffice = homeOfficeAmounts(year)
  const booked = React.useMemo(
    () =>
      entries.filter((e) => CALCULATED.has(e.catId) && yearOf(e.date) === year),
    [entries, year]
  )

  const bookedTotal = booked.reduce((sum, e) => sum + calcEntry(e).net, 0)

  const card = (
    which: "mileage" | "per-diem" | "home-office",
    title: string,
    hint: string
  ) => (
    <Panel
      title={title}
      description={hint}
      footer={
        <Button
          variant="outline"
          onClick={() => openDialog({ kind: "deduction", which })}
        >
          {f.t("deductions.calculate")}
        </Button>
      }
    />
  )

  return (
    <div className="flex flex-col gap-6" key={year}>
      <p className="max-w-prose text-sm text-muted-foreground">
        {f.t("deductions.intro", { y: year })}
      </p>

      <StatStrip
        stats={[
          {
            label: f.t("deductions.statBooked"),
            value: <Money cents={bookedTotal} />,
          },
          { label: f.t("deductions.statVouchers"), value: booked.length },
        ]}
      />

      <div className={cn("grid gap-x-6 xl:grid-cols-2", PANEL_ROWS)}>
        {rates ? (
          <>
            {card(
              "mileage",
              f.t("deductions.mileageTitle"),
              f.t("deductions.mileageCard")
            )}
            {card(
              "per-diem",
              f.t("deductions.perDiemTitle"),
              f.t("deductions.perDiemCard")
            )}
          </>
        ) : (
          <Panel bodyClassName="p-4 text-sm text-muted-foreground">
            {f.t("deductions.noTravelRates", { y: year })}
          </Panel>
        )}
        {homeOffice ? (
          card(
            "home-office",
            f.t("deductions.homeTitle"),
            f.t("deductions.homeCard")
          )
        ) : (
          <Panel bodyClassName="p-4 text-sm text-muted-foreground">
            {f.t("deductions.noHomeRates", { y: year })}
          </Panel>
        )}
      </div>

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
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() =>
                    openDialog({ kind: "entry", mode: "edit", entryId: e.id })
                  }
                >
                  <span className="flex min-w-0 flex-col">
                    <span>{e.description}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {f.date(e.date)}
                    </span>
                  </span>
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
