"use client"

import { FileCheckIcon, LockIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The way into the year-end dialog (§8.8). While the year's Form 5 is open it
 * is a button that starts the checks; once marked as filed it states the lock
 * and offers the dialog again, where the amounts stay readable and the mark can
 * be removed.
 */
export function YearEndButton({ className }: { className?: string }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const filedOn = useBookStore((s) => s.form5Filed[String(year)])
  const openDialog = useBookStore((s) => s.openDialog)

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <Button
        variant={filedOn ? "outline" : "default"}
        size="sm"
        onClick={() => openDialog({ kind: "year-end" })}
      >
        {filedOn ? (
          <LockIcon data-icon="inline-start" />
        ) : (
          <FileCheckIcon data-icon="inline-start" />
        )}
        {f.t(filedOn ? "statement.yearEndOpenFiled" : "statement.yearEndButton")}
      </Button>
      {filedOn ? (
        <p className="text-xs text-muted-foreground">
          {f.t("statement.form5FiledOn", { d: f.date(filedOn) })}
        </p>
      ) : null}
    </div>
  )
}
