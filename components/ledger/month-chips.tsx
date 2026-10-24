"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { monthCounts } from "@/stores/selectors"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** Kaikki + Tammi…Joulu with entry counts; empty months are greyed (§8.4). */
export function MonthChips() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const year = useBookStore((s) => s.year)
  const month = useBookStore((s) => s.month)
  const setMonth = useBookStore((s) => s.setMonth)

  const counts = React.useMemo(
    () => monthCounts(entries, year),
    [entries, year]
  )

  const chips = [
    { value: 0, label: f.t("all"), count: counts[0] },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: f.month(i, true),
      count: counts[i + 1],
    })),
  ]

  return (
    <div
      className="scroll-strip -mx-1 gap-1.5 px-1 pb-1"
      role="group"
      aria-label={f.t("period")}
    >
      {chips.map((chip) => {
        const selected = month === chip.value
        const empty = chip.count === 0
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setMonth(chip.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
              "focus-ring",
              selected
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : empty
                  ? "border-transparent text-muted-foreground/60 hover:bg-muted"
                  : "border-transparent text-foreground hover:bg-muted"
            )}
          >
            {chip.label}
            {chip.count > 0 ? (
              <span
                className={cn(
                  "tabular ml-1.5 text-xs",
                  selected ? "opacity-80" : "text-muted-foreground"
                )}
              >
                {chip.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
