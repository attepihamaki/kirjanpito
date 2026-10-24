"use client"

import * as React from "react"
import { DownloadIcon, UploadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { closeBook } from "@/lib/commands/book-commands"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** The yellow / green status dot and its label (§8.2). */
export function FileStatus({ className }: { className?: string }) {
  const t = useT()
  const dirty = useBookStore((s) => s.dirty)

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          dirty ? "bg-warning" : "bg-income"
        )}
      />
      <span className="text-muted-foreground">
        {dirty ? t("dirty") : t("clean")}
      </span>
    </div>
  )
}

/**
 * The sidebar's file box: name, status, and the open / close / export
 * buttons. "Vie" is highlighted while there are unexported changes.
 */
export function FileBox({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
  const t = useT()
  const ctx = useCommandCtx()
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">
          {fileName ? `${fileName}.csv` : t("newBook")}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("closeFile")}
          title={t("closeFile")}
          onClick={() => void closeBook(ctx)}
        >
          <XIcon />
        </Button>
      </div>

      <FileStatus />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onOpenFile}
        >
          <UploadIcon data-icon="inline-start" />
          {t("importShort")}
        </Button>
        <Button
          variant={dirty ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={onExport}
        >
          <DownloadIcon data-icon="inline-start" />
          {t("exportShort")}
        </Button>
      </div>
    </div>
  )
}
