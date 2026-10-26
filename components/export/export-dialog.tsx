"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { availableReceiptCount } from "@/lib/commands/book-commands"
import { exportBook } from "@/lib/commands/io-commands"
import { defaultFileBaseName } from "@/lib/domain/receipt-path"
import { useBookStore } from "@/stores/book-store"

/** §7.3: edit the base name; the extension is fixed and shown beside it. */
export function ExportDialog() {
  const dialog = useBookStore((s) => s.dialog)
  const closeDialog = useBookStore((s) => s.closeDialog)
  if (dialog.kind !== "export") return null
  // Keyed on nothing but its own mount: opening the dialog mounts a fresh
  // form, so the defaults are initial state rather than an effect.
  return <ExportDialogForm onClose={closeDialog} />
}

function ExportDialogForm({ onClose }: { onClose: () => void }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const entries = useBookStore((s) => s.entries)

  const receiptCount = React.useMemo(
    () => availableReceiptCount(entries),
    [entries]
  )

  // §7.3: the default always uses today’s date — the last used name is
  // shown in the sidebar but deliberately not reused here.
  const [name, setName] = React.useState(() => defaultFileBaseName(f.lang))
  const [csvOnly, setCsvOnly] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const withReceipts = receiptCount > 0 && !csvOnly
  const extension = withReceipts ? ".zip" : ".csv"

  const run = async () => {
    setBusy(true)
    try {
      await exportBook(ctx, name, csvOnly)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.t("io.exportTitle")}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="export-name">
              {f.t("io.fileNameLabel")}
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="export-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void run()
                }}
              />
              <span className="tabular shrink-0 text-sm text-muted-foreground">
                {extension}
              </span>
            </div>
          </Field>

          {receiptCount > 0 ? (
            <Field orientation="horizontal">
              <Checkbox
                id="export-csv-only"
                checked={csvOnly}
                onCheckedChange={(checked) => setCsvOnly(checked === true)}
              />
              <FieldLabel htmlFor="export-csv-only" className="font-normal">
                {f.t("io.csvOnly")}
              </FieldLabel>
            </Field>
          ) : null}
        </FieldGroup>

        <p className="text-xs text-muted-foreground">
          {withReceipts
            ? f.t("io.zipHint", { n: receiptCount })
            : f.t("io.exportHint")}
          {receiptCount > 0 && csvOnly ? ` ${f.t("io.csvOnlyHint")}` : ""}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={() => void run()}>
            {busy ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            {busy ? f.t("io.exporting") : f.t("io.exportAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
