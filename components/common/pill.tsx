import { cn } from "@/lib/utils"

/**
 * A small label: the income / expense badge, the VAT rate chips on the
 * landing page, the type column in the ledger and in the categories table.
 *
 * shadcn's `Badge` is not used. Its variants are default / secondary /
 * destructive / outline, and the tone that matters here is income versus
 * expense — `--destructive` means "error", not "expense" (§11) — so every
 * call site would have to override the variant it asked for.
 *
 * `size="sm"` is the printed-label form used inside the receipt motif: a
 * tighter box with square-ish corners, so it reads as stamped on paper rather
 * than as a UI chip.
 */
export function Pill({
  tone = "neutral",
  size = "default",
  className,
  children,
}: {
  tone?: "neutral" | "income" | "expense"
  size?: "default" | "sm"
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        size === "sm"
          ? "rounded-sm px-1.5 py-0.5 text-[0.65rem]"
          : "rounded-full px-2 py-0.5 text-xs",
        tone === "income" && "bg-income-subtle text-income",
        tone === "expense" && "bg-expense-subtle text-expense",
        tone === "neutral" && "bg-muted",
        className
      )}
    >
      {children}
    </span>
  )
}
