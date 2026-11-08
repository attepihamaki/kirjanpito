"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseDateInput } from "@/lib/domain/date-input"
import { todayIso } from "@/lib/domain/dates"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

type Props = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "min" | "max"
> & {
  /** ISO date, or "" for none. */
  value: string
  onValueChange: (iso: string) => void
  /** Called when the text starts or stops being rejected (unreadable or out of range). */
  onBadChange?: (bad: boolean) => void
  min?: string
  max?: string
}

/**
 * A date field that takes typed text (§8.4): `15.3.`, `15.3.26`, `15032026`,
 * `eilen` and the like. A date without a year gets the open year. The text is
 * parsed on blur or Enter and shown as the resolved date, so the user sees
 * what was understood. The button beside it opens the browser's date picker.
 * `value` is always ISO, so callers keep their own state unchanged.
 */
export function DateInput({
  value,
  onValueChange,
  onBadChange,
  min,
  max,
  onBlur,
  onKeyDown,
  className,
  "aria-invalid": ariaInvalid,
  ...props
}: Props) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const picker = React.useRef<HTMLInputElement>(null)
  const shown = value ? f.date(value) : ""
  const [text, setText] = React.useState(shown)
  const [bad, setBad] = React.useState(false)

  React.useEffect(() => {
    onBadChange?.(bad)
  }, [bad, onBadChange])

  /* Follow the value when it changes from outside, such as the picker. */
  const [seen, setSeen] = React.useState(shown)
  if (seen !== shown) {
    setSeen(shown)
    setText(shown)
    setBad(false)
  }

  const commit = () => {
    if (text.trim() === "") {
      setBad(false)
      if (value) onValueChange("")
      return
    }
    const iso = parseDateInput(text, year, todayIso())
    if (iso == null || (min && iso < min) || (max && iso > max)) {
      setBad(true)
      return
    }
    setBad(false)
    setText(f.date(iso))
    if (iso !== value) onValueChange(iso)
  }

  return (
    <div className={cn("relative flex gap-1", className)}>
      <Input
        {...props}
        value={text}
        autoComplete="off"
        placeholder={props.placeholder ?? f.t("common.datePlaceholder")}
        aria-invalid={bad || ariaInvalid ? true : undefined}
        onChange={(e) => {
          setText(e.target.value)
          setBad(false)
        }}
        onBlur={(e) => {
          commit()
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.key === "Enter" && !e.defaultPrevented) commit()
        }}
      />
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        min={min}
        max={max}
        value={value}
        className="pointer-events-none absolute size-0 opacity-0"
        onChange={(e) => {
          if (e.target.value) onValueChange(e.target.value)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={f.t("common.openCalendar")}
        onClick={() => picker.current?.showPicker?.()}
      >
        <CalendarIcon aria-hidden />
      </Button>
    </div>
  )
}
