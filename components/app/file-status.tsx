"use client"

import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The amber / green status dot and its label (§8.2).
 *
 * `labelClassName` lets the top bar drop the text on narrow screens while the
 * dot stays; the accessible name carries it either way.
 */
export function FileStatus({
  className,
  labelClassName,
}: {
  className?: string
  labelClassName?: string
}) {
  const t = useT()
  const dirty = useBookStore((s) => s.dirty)
  const text = dirty ? t("file.dirty") : t("file.clean")

  return (
    <div
      role="status"
      aria-label={text}
      title={text}
      className={cn("flex items-center gap-2 text-xs", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          dirty ? "bg-warning" : "bg-income"
        )}
      />
      <span
        aria-hidden="true"
        className={cn("truncate text-muted-foreground", labelClassName)}
      >
        {text}
      </span>
    </div>
  )
}
