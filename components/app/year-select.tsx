"use client"

import * as React from "react"

import { OptionSelect } from "@/components/common/option-select"
import { useT } from "@/components/lang-provider"
import { yearsAvailable } from "@/stores/selectors"
import { useBookStore } from "@/stores/book-store"

/** Financial-year selector (§8.2). */
export function YearSelect({ className }: { className?: string }) {
  const t = useT()
  const entries = useBookStore((s) => s.entries)
  const year = useBookStore((s) => s.year)
  const setYear = useBookStore((s) => s.setYear)

  const options = React.useMemo(
    () =>
      yearsAvailable(entries, year).map((y) => ({
        value: String(y),
        label: String(y),
      })),
    [entries, year]
  )

  return (
    <OptionSelect
      options={options}
      value={String(year)}
      onChange={(value) => setYear(Number(value))}
      label={t("fiscal")}
      className={className}
    />
  )
}
