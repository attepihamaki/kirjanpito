"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { cn } from "@/lib/utils"

/**
 * A figure that opens the vouchers behind it (§8.18). With no `onOpen` it is
 * the figure alone, so a caller can pass `null` for one that has no vouchers
 * without branching. The dotted underline is the only sign of it on screen and
 * it is gone on paper, so a printed return reads as before.
 */
export function FigureLink({
  onOpen,
  label,
  className,
  children,
}: {
  onOpen: (() => void) | null | undefined
  /** Names the figure for the accessible name: "Show the vouchers behind {label}". */
  label: string
  className?: string
  children: React.ReactNode
}) {
  const f = useFormatters()
  if (!onOpen) return <>{children}</>
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={f.t("common.figureShow", { x: label })}
      title={f.t("common.figureShow", { x: label })}
      className={cn(
        "focus-ring cursor-pointer rounded-sm underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 hover:decoration-solid print:no-underline",
        className
      )}
    >
      {children}
    </button>
  )
}
