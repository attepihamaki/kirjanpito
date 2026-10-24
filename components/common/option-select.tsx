"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Option {
  value: string
  label: string
}

/**
 * A single-choice select built from one list of options.
 *
 * Base UI's `Select` needs an `items` map to render the trigger's label
 * rather than the raw value, *and* the same labels again as `SelectItem`
 * children. Every call site used to spell both out, so each one carried its
 * options twice — the VAT view wrote its quarter labels out twice in the one
 * component. Taking one `options` array and deriving the map removes that.
 */
export function OptionSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  className,
  size,
}: {
  options: readonly Option[]
  value: string
  onChange: (value: string) => void
  /** Shown when `value` matches no option. */
  placeholder?: string
  /** Accessible name for the trigger. */
  label?: string
  className?: string
  size?: "sm" | "default"
}) {
  return (
    <Select
      items={Object.fromEntries(options.map((o) => [o.value, o.label]))}
      value={value}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger className={className} aria-label={label} size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
