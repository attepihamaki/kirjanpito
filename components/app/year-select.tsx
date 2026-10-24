"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useT } from "@/components/lang-provider"
import { yearsAvailable } from "@/stores/selectors"
import { useBookStore } from "@/stores/book-store"

/** Financial-year selector (§8.2). */
export function YearSelect({ className }: { className?: string }) {
  const t = useT()
  const entries = useBookStore((s) => s.entries)
  const year = useBookStore((s) => s.year)
  const setYear = useBookStore((s) => s.setYear)

  const years = React.useMemo(
    () => yearsAvailable(entries, year),
    [entries, year]
  )

  return (
    <Select
      value={String(year)}
      onValueChange={(value) => value && setYear(Number(value))}
    >
      <SelectTrigger className={className} aria-label={t("fiscal")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
