import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * An amount input with a trailing euro sign, right-aligned with tabular
 * figures. The sign is decoration (`aria-hidden`); the label carries the
 * meaning, and the value stays a plain number the parsers already read.
 */
export function EuroInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        className={cn("tabular pr-8 text-right", className)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
      >
        €
      </span>
    </div>
  )
}
