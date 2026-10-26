import { Pill } from "@/components/common/pill"
import { cn } from "@/lib/utils"

/**
 * The paper receipt shape (§11) — the design's one bold element.
 *
 * The perforations are masked out of the paper itself rather than drawn as a
 * strip underneath it, so the torn edge *is* the bottom of the sheet. That
 * rules out a border: a mask clips the element's own border and box shadow, so
 * an outlined receipt would lose its outline exactly along the tear. The paper
 * is told apart from its surface by its warm tone and by the shadow, which has
 * to be a `drop-shadow` filter on the wrapper to follow the notches.
 */
export function ReceiptPaper({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("drop-shadow-sm", className)} {...props}>
      <div
        className={cn(
          "paper-surface rounded-t-md bg-paper px-4 pt-4 pb-6 text-paper-foreground",
          "[mask-image:radial-gradient(circle_5px_at_50%_100%,transparent_98%,black)]",
          "[mask-size:12px_100%] [mask-repeat:repeat-x]"
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * The parts a receipt is printed from. Both receipts in the app are built
 * from these: the live preview in the entry dialog, and the pair in the
 * landing hero.
 */

/** The type badge and date across the top of a receipt. */
export function ReceiptHead({
  label,
  date,
  tone,
}: {
  label: string
  date: string
  tone: "income" | "expense"
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Pill
        tone={tone}
        size="sm"
        className="font-heading font-semibold tracking-wide"
      >
        {label}
      </Pill>
      <span className="tabular text-xs text-paper-foreground/70">{date}</span>
    </div>
  )
}

/** A dashed tear line between sections of a receipt. */
export function ReceiptRule({ className }: { className?: string }) {
  return (
    <div
      className={cn("my-3 border-t border-dashed border-paper-edge", className)}
    />
  )
}

/** A quiet label / amount pair. */
export function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-paper-foreground/70">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}

/** The bold bottom line. */
export function ReceiptTotal({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="tabular text-lg font-semibold">{value}</span>
    </div>
  )
}
