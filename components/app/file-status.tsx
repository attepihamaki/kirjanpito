"use client"

import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The one wording of the save status (§8.2), so the dot's label and the file
 * menu's accessible name can never drift apart.
 *
 * It says "saved", not "exported", because both ways of keeping the work end
 * in a file. Which file is what `dirty` encodes: a download clears it only
 * when there is no linked file left to go stale (§7.5).
 */
export function useFileStatusText() {
  const t = useT()
  const dirty = useBookStore((s) => s.dirty)
  return dirty ? t("file.dirty") : t("file.clean")
}

/**
 * The amber / green dot alone, for the menu trigger, which has no room for the
 * label and carries the wording in its accessible name instead.
 */
export function StatusDot({ className }: { className?: string }) {
  const dirty = useBookStore((s) => s.dirty)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        dirty ? "bg-warning" : "bg-income",
        className
      )}
    />
  )
}

/** The status dot with its label (§8.2). */
export function FileStatus({ className }: { className?: string }) {
  const text = useFileStatusText()

  return (
    <div
      role="status"
      aria-label={text}
      className={cn("flex items-center gap-2 text-xs", className)}
    >
      <StatusDot />
      <span aria-hidden="true" className="truncate text-muted-foreground">
        {text}
      </span>
    </div>
  )
}
