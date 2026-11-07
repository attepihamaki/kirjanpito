"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
 * children. This takes one `options` array and derives both, so a call site
 * never spells its options out twice.
 */
export function OptionSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  invalid,
  disabled,
  className,
  size,
  featured,
}: {
  options: readonly Option[]
  /**
   * A short group listed above `options`, which stay whole and in their own
   * order below it. The same value appears in both places.
   */
  featured?: {
    options: readonly Option[]
    label: string
    allLabel: string
  }
  value: string
  onChange: (value: string) => void
  /** Shown when `value` matches no option. */
  placeholder?: string
  /** Accessible name for the trigger. */
  label?: string
  /** Marks the trigger as the field an error line is about. */
  invalid?: boolean
  disabled?: boolean
  className?: string
  size?: "sm" | "default"
}) {
  return (
    <Select
      items={Object.fromEntries(options.map((o) => [o.value, o.label]))}
      value={value}
      disabled={disabled}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger
        className={className}
        aria-label={label}
        aria-invalid={invalid}
        size={size}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {featured && featured.options.length > 0 ? (
          <>
            <SelectGroup>
              <SelectLabel>{featured.label}</SelectLabel>
              {featured.options.map((o) => (
                <SelectItem key={`featured:${o.value}`} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
          </>
        ) : null}
        <SelectGroup>
          {featured && featured.options.length > 0 ? (
            <SelectLabel>{featured.allLabel}</SelectLabel>
          ) : null}
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
