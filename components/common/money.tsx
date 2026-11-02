"use client"

import type { Cents } from "@/lib/domain/types"
import { useFormatters } from "@/components/lang-provider"
import { cn } from "@/lib/utils"

/**
 * A money amount with tabular figures. Always Finnish formatting, in both
 * languages (§9).
 */
export function Money({
  cents,
  tone,
  signed,
  className,
}: {
  cents: Cents
  /** Colour the amount as income or expense. */
  tone?: "income" | "expense" | "muted"
  /**
   * Show the amount as negative, for expense rows. A refund, already negative,
   * then reads as positive.
   */
  signed?: boolean
  className?: string
}) {
  const f = useFormatters()
  const zero = cents === 0

  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        tone === "income" && !zero && "text-income",
        tone === "expense" && !zero && "text-expense",
        (tone === "muted" || zero) && "text-muted-foreground",
        className
      )}
    >
      {f.money(signed ? -cents : cents)}
    </span>
  )
}

/** The en dash that stands in for a zero or absent amount. */
export function ZeroDash() {
  return <span className="text-muted-foreground">–</span>
}
