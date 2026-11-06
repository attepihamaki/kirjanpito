"use client"

import { ArchiveIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { exportRetentionPackage } from "@/lib/commands/retention-commands"
import { useCommandCtx } from "@/hooks/use-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * Shown while an archived year is open (§8.19). The book is a reference: the
 * store refuses every change to it, so the banner says so and offers the way
 * out.
 */
export function ArchiveBanner() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.archiveYear)
  const closeBook = useBookStore((s) => s.closeBook)
  if (year === null) return null

  return (
    <div
      role="status"
      className="print-hidden flex items-center gap-3 border-b bg-muted px-4 py-2 text-sm lg:px-6"
    >
      <ArchiveIcon className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">
        {f.t("app.archiveBanner", { y: year })}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={() => void exportRetentionPackage(ctx, year)}
      >
        {f.t("overview.yearPackage")}
      </Button>
      <Button variant="outline" size="sm" onClick={closeBook}>
        {f.t("app.archiveClose")}
      </Button>
    </div>
  )
}
