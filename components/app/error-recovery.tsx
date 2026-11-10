"use client"

import * as React from "react"
import { DownloadIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useCommandCtx } from "@/hooks/use-commands"
import { downloadStoredBook } from "@/lib/browser/stored-book"
import { exportBook } from "@/lib/commands/io-commands"
import { suggestedBaseName } from "@/lib/domain/receipt-path"
import { useBookStore } from "@/stores/book-store"

/**
 * What the user sees when a page fails to render (§8.1): that the work is
 * safe and where it is, a way to try again, a copy of the bookkeeping as a
 * file, and the error itself for a bug report. The entries and receipts live
 * in the browser's storage, which a rendering error does not touch.
 */
export function ErrorRecovery({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const open = useBookStore((s) => s.open)
  const dirty = useBookStore((s) => s.dirty)
  const fileName = useBookStore((s) => s.fileName)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    console.error(error)
    headingRef.current?.focus()
  }, [error])

  const download = async () => {
    setBusy(true)
    try {
      const s = useBookStore.getState()
      await exportBook(ctx, suggestedBaseName(s.fileName, s.exportLang))
    } catch {
      downloadStoredBook()
    } finally {
      setBusy(false)
    }
  }

  const where = !open
    ? f.t("app.errorNoBook")
    : dirty
      ? f.t("app.errorUnsaved")
      : fileName
        ? f.t("app.errorSaved", { f: fileName })
        : f.t("app.errorInBrowser")

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10"
    >
      <TriangleAlertIcon aria-hidden className="size-8 text-destructive" />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-2xl font-semibold tracking-tight outline-none"
      >
        {f.t("app.errorTitle")}
      </h1>
      <p className="text-muted-foreground">{f.t("app.errorSafe")}</p>
      <p>{where}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RotateCcwIcon data-icon="inline-start" />
          {f.t("app.errorRetry")}
        </Button>
        {open ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void download()}
          >
            <DownloadIcon data-icon="inline-start" />
            {f.t("app.errorDownload")}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => window.location.reload()}>
          {f.t("app.errorReload")}
        </Button>
      </div>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{f.t("app.errorDetails")}</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
          {error.message || String(error)}
          {error.digest ? `\n${error.digest}` : ""}
        </pre>
        {open ? (
          <Button
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => downloadStoredBook()}
          >
            {f.t("app.errorRawData")}
          </Button>
        ) : null}
      </details>
    </div>
  )
}
