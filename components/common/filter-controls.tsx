"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"
import type { TypeFilter } from "@/stores/book-store"

/**
 * The two filter controls the ledger toolbar (§8.4) and the categories table
 * (§8.10) both need. They were duplicated between the two views, down to the
 * magnifier's offsets.
 */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn("relative min-w-[12rem] flex-1", className)}>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
      />
    </div>
  )
}

/** All / income / expenses. */
export function TypeFilterToggle({
  value,
  onChange,
}: {
  value: TypeFilter
  onChange: (value: TypeFilter) => void
}) {
  const t = useT()

  return (
    <ToggleGroup
      aria-label={t("typeFilter")}
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0]
        if (picked) onChange(picked as TypeFilter)
      }}
    >
      <ToggleGroupItem value="all">{t("all")}</ToggleGroupItem>
      <ToggleGroupItem value="income">{t("incomePlural")}</ToggleGroupItem>
      <ToggleGroupItem value="expense">{t("expensePlural")}</ToggleGroupItem>
    </ToggleGroup>
  )
}
