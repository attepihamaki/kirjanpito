"use client"

import { MINUS } from "@/lib/domain/money"
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
  /** Prefix a minus sign, for expense rows shown as negative. */
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
      {signed && !zero ? MINUS : ""}
      {f.money(cents)}
    </span>
  )
}

/** An em dash for a zero line on the income statement (§6.3). */
export function ZeroDash() {
  return <span className="text-muted-foreground">–</span>
}
