"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface VoucherOption {
  value: string
  label: string
  /** Lower-case text the search looks in. */
  haystack: string
}

/** The most rows listed at once, so a book of thousands stays quick to open. */
const MAX_ROWS = 50

/**
 * A select with a search box, for choosing one voucher out of a whole book
 * (§8.4). Every word typed must appear somewhere in an option's `haystack`.
 * `Enter` picks the first match.
 */
export function VoucherPicker({
  options,
  value,
  onChange,
  label,
  noneLabel,
  searchPlaceholder,
  emptyText,
  moreText,
}: {
  options: readonly VoucherOption[]
  /** The chosen option's value, or "" for none. */
  value: string
  onChange: (value: string) => void
  /** Accessible name for the trigger. */
  label: string
  noneLabel: string
  searchPlaceholder: string
  emptyText: string
  /** Shown under a list cut at `MAX_ROWS`; `{n}` is the number left out. */
  moreText: (n: number) => string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const matches = React.useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return options.filter((o) => words.every((w) => o.haystack.includes(w)))
  }, [options, query])
  const shown = matches.slice(0, MAX_ROWS)
  const chosen = options.find((o) => o.value === value)

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setQuery("")
      }}
    >
      <PopoverTrigger
        aria-label={label}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2.5 pl-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      >
        <span
          className={cn("line-clamp-1", !chosen && "text-muted-foreground")}
        >
          {chosen ? chosen.label : noneLabel}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-72 gap-2 p-2"
      >
        <Input
          autoFocus
          value={query}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // The dialog's own Enter would save the entry.
            if (e.key === "Enter") {
              e.preventDefault()
              e.stopPropagation()
              if (shown[0]) pick(shown[0].value)
            }
          }}
        />
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          <li>
            <PickerRow
              selected={!chosen}
              label={noneLabel}
              muted
              onPick={() => pick("")}
            />
          </li>
          {shown.map((o) => (
            <li key={o.value}>
              <PickerRow
                selected={o.value === value}
                label={o.label}
                onPick={() => pick(o.value)}
              />
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">{emptyText}</li>
          ) : null}
          {matches.length > MAX_ROWS ? (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              {moreText(matches.length - MAX_ROWS)}
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function PickerRow({
  selected,
  label,
  muted,
  onPick,
}: {
  selected: boolean
  label: string
  muted?: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        muted && "text-muted-foreground"
      )}
    >
      <span>{label}</span>
      {selected ? <CheckIcon className="size-4 shrink-0" /> : null}
    </button>
  )
}
