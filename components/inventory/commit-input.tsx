"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * A text field that keeps what is typed to itself and hands it over on blur or
 * Enter. `onCommit` returns false for text it cannot read, and the field then
 * goes back to `value`, so a typo never reaches the list.
 */
export function CommitInput({
  value,
  onCommit,
  label,
  disabled,
  right,
  invalid,
  placeholder,
  inputMode,
  className,
}: {
  value: string
  onCommit: (text: string) => boolean
  label: string
  disabled?: boolean
  right?: boolean
  invalid?: boolean
  placeholder?: string
  inputMode?: React.ComponentProps<typeof Input>["inputMode"]
  className?: string
}) {
  const [text, setText] = React.useState(value)
  /* A new value from outside replaces the draft, which is reset while rendering. */
  const [seen, setSeen] = React.useState(value)
  if (seen !== value) {
    setSeen(value)
    setText(value)
  }

  return (
    <Input
      aria-label={label}
      aria-invalid={invalid || undefined}
      autoComplete="off"
      inputMode={inputMode}
      disabled={disabled}
      placeholder={placeholder}
      value={text}
      className={cn(right && "tabular text-right", className)}
      onFocus={(e) => right && e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text === value) return
        if (!onCommit(text)) setText(value)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
      }}
    />
  )
}
