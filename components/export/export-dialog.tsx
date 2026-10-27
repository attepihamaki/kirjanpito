"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { BusyButton } from "@/components/common/busy-button"
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
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { availableReceiptCount } from "@/lib/commands/book-commands"
import { exportBook } from "@/lib/commands/io-commands"
import { suggestedBaseName } from "@/lib/domain/receipt-path"
import { useBookStore } from "@/stores/book-store"

/** §7.3: edit the base name; the extension is fixed and shown beside it. */
export function ExportDialog() {
  const dialog = useBookStore((s) => s.dialog)
  const closeDialog = useBookStore((s) => s.closeDialog)
  if (dialog.kind !== "export") return null
  /*
   * Keyed on nothing but its own mount: opening the dialog mounts a fresh
   * form, so the defaults are initial state rather than an effect.
   */
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

  // §7.3: the last file's name, or the dated default for a book with none.
  const [name, setName] = React.useState(() =>
    suggestedBaseName(useBookStore.getState().fileName, f.lang)
  )
  const [csvOnly, setCsvOnly] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  // A bookkeeping is a ZIP; a bare CSV is the one export that is not (§7.6).
  const extension = csvOnly ? ".csv" : ".zip"

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
        </FieldGroup>

        <p className="text-xs text-muted-foreground">
          {f.t("io.exportHint")}{" "}
          {csvOnly
            ? f.t("io.csvOnlyHint")
            : receiptCount > 0
              ? f.t("io.zipHint", { n: receiptCount })
              : f.t("io.zipHintNoReceipts")}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <BusyButton
            icon={DownloadIcon}
            busy={busy}
            busyLabel={f.t("io.exporting")}
            onClick={() => void run()}
          >
            {f.t("io.exportAction")}
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
