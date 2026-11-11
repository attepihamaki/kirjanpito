"use client"

import * as React from "react"
import { HistoryIcon } from "lucide-react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import type { DescriptionSuggestion } from "@/lib/domain/entry-suggest"

/**
 * The description field with the book's earlier descriptions under it (§8.5),
 * as an ARIA combobox: the arrow keys move through the list, `Enter` or a
 * click picks, `Escape` closes the list before it closes the dialog. Typing
 * stays free; the list only offers.
 */
export function DescriptionInput({
  id,
  value,
  placeholder,
  suggestions,
  listLabel,
  detail,
  onChange,
  onPick,
  onBlur,
}: {
  id: string
  value: string
  placeholder: string
  /** Matches for `value`, computed by the caller. */
  suggestions: readonly DescriptionSuggestion[]
  /** Accessible name of the list. */
  listLabel: string
  /** The muted second line of a suggestion: category and amount. */
  detail: (s: DescriptionSuggestion) => string
  onChange: (value: string) => void
  onPick: (s: DescriptionSuggestion) => void
  /** Called when the field loses focus without a pick. */
  onBlur?: () => void
}) {
  const listId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const shown = open ? suggestions : []
  const expanded = shown.length > 0
  const current = active < shown.length ? active : -1

  const pick = (s: DescriptionSuggestion) => {
    setOpen(false)
    setActive(-1)
    onPick(s)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open) {
        setOpen(true)
        return
      }
      if (!expanded) return
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      // Past either end the highlight returns to the field itself.
      setActive((i) => {
        const next = i + step
        if (next >= shown.length) return -1
        return next < -1 ? shown.length - 1 : next
      })
      return
    }
    if (!expanded) return
    if (event.key === "Escape") {
      // The list closes first; the dialog stays open.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setActive(-1)
      return
    }
    if (
      event.key === "Enter" &&
      current >= 0 &&
      !(event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault()
      event.stopPropagation()
      pick(shown[current])
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          current >= 0 ? `${listId}-${current}` : undefined
        }
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false)
          setActive(-1)
          onBlur?.()
        }}
      />
      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute inset-x-0 top-full z-10 mt-1 flex max-h-64 flex-col overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          {shown.map((s, i) => (
            <li
              key={s.description}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              /* Picking on mouse down keeps the focus in the field, so blur does not close the list first. */
              onMouseDown={(e) => {
                e.preventDefault()
                pick(s)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-default items-start gap-2 rounded-md px-2 py-1.5",
                i === current && "bg-accent text-accent-foreground"
              )}
            >
              <HistoryIcon
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{s.description}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {detail(s)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
