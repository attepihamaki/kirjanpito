"use client"

import { SearchIcon } from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"
import type { EntryType } from "@/lib/domain/types"
import type { TypeFilter } from "@/stores/book-store"

/**
 * The controls that pick a type or narrow a list: the ledger toolbar (§8.4),
 * the categories table and the new-category form (§8.10), and the entry
 * dialog (§8.5).
 *
 * Income always comes before expense, and the two always carry their colours.
 * Two of these sit a click apart in the same app, so an order or a tone that
 * differed between them would read as a different control.
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
    /* A fixed box rather than one that grows into the row: the queries here
       are a word or two, and a search field stretched across a toolbar reads
       as the page's main control. */
    <div className={cn("relative w-[20rem] max-w-full", className)}>
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

/**
 * Income or expense, coloured when selected: the type of an entry (§8.5) and
 * the side of a new category (§8.10).
 */
export function EntryTypeToggle({
  value,
  onChange,
}: {
  value: EntryType
  onChange: (value: EntryType) => void
}) {
  const t = useT()

  return (
    <ToggleGroup
      aria-label={t("common.type")}
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0] as EntryType | undefined
        if (picked && picked !== value) onChange(picked)
      }}
    >
      <ToggleGroupItem
        value="income"
        className="data-pressed:bg-income-subtle data-pressed:text-income"
      >
        {t("common.income")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="expense"
        className="data-pressed:bg-expense-subtle data-pressed:text-expense"
      >
        {t("common.expense")}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * All / income / expenses, as a select.
 *
 * A segmented control here would be the one toolbar control shaped unlike the
 * filters beside it, and it grows with the language: "Expenses" is wider than
 * "Kulut". `EntryTypeToggle` stays segmented because it is a form field with
 * two choices, not a filter.
 */
export function TypeFilterSelect({
  value,
  onChange,
  className,
}: {
  value: TypeFilter
  onChange: (value: TypeFilter) => void
  className?: string
}) {
  const t = useT()

  return (
    <OptionSelect
      options={[
        { value: "all", label: t("common.allTypes") },
        { value: "income", label: t("common.incomePlural") },
        { value: "expense", label: t("common.expensePlural") },
      ]}
      value={value}
      onChange={(next) => onChange(next as TypeFilter)}
      label={t("common.typeFilter")}
      className={cn("w-[10rem]", className)}
    />
  )
}
