"use client"

import * as React from "react"
import { DateInput } from "@/components/common/date-input"
import { FileArchiveIcon } from "lucide-react"

import { BusyButton } from "@/components/common/busy-button"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useCommandCtx } from "@/hooks/use-commands"
import { useToday } from "@/hooks/use-today"
import { auditEntries, exportAuditPackage } from "@/lib/commands/audit-commands"
import { auditQuickRanges, validAuditRange } from "@/lib/domain/audit-range"
import type { DateRange } from "@/lib/domain/books"
import { useBookStore } from "@/stores/book-store"

/**
 * The audit package (§8.25): a range of days in, one ZIP out. The dialog only
 * picks the range and says how many vouchers it holds; the command makes the
 * package.
 */
export function AuditDialog() {
  const open = useBookStore((s) => s.dialog.kind === "audit-package")
  if (!open) return null
  return <AuditForm />
}

function AuditForm() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const today = useToday()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const entries = useBookStore((s) => s.entries)
  const saving = useBookStore((s) => s.saving)
  const quick = auditQuickRanges(today)
  const [range, setRange] = React.useState<DateRange>(quick.lastYear)

  const valid = validAuditRange(range)
  const count = valid ? auditEntries(entries, range).length : 0

  const picks: [string, DateRange][] = [
    [f.t("io.auditThisYear"), quick.thisYear],
    [f.t("io.auditLastYear"), quick.lastYear],
    [f.t("io.auditLastQuarter"), quick.lastQuarter],
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{f.t("io.auditTitle")}</DialogTitle>
          <DialogDescription>{f.t("io.auditIntro")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!valid}>
            <FieldLabel htmlFor="audit-from">{f.t("io.auditFrom")}</FieldLabel>
            <DateInput
              id="audit-from"
              value={range.from}
              aria-invalid={!valid}
              onValueChange={(iso) => setRange({ ...range, from: iso })}
            />
          </Field>
          <Field data-invalid={!valid}>
            <FieldLabel htmlFor="audit-to">{f.t("io.auditTo")}</FieldLabel>
            <DateInput
              id="audit-to"
              value={range.to}
              aria-invalid={!valid}
              onValueChange={(iso) => setRange({ ...range, to: iso })}
            />
          </Field>
        </div>
        {!valid ? <FieldError>{f.t("io.auditInvalid")}</FieldError> : null}

        <div
          role="group"
          aria-label={f.t("io.auditQuick")}
          className="flex flex-wrap gap-2"
        >
          {picks.map(([label, r]) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={r.from === range.from && r.to === range.to}
              onClick={() => setRange(r)}
            >
              {label}
            </Button>
          ))}
        </div>

        <p className="text-sm font-medium" aria-live="polite">
          {valid
            ? count
              ? f.t("io.auditCount", { n: count })
              : f.t("io.auditNone")
            : ""}
        </p>
        <p className="text-xs text-muted-foreground">{f.t("io.auditNote")}</p>

        <DialogFooter>
          <Button variant="ghost" onClick={closeDialog}>
            {f.t("common.cancel")}
          </Button>
          <BusyButton
            icon={FileArchiveIcon}
            busy={saving}
            disabled={!valid || count === 0}
            onClick={async () => {
              await exportAuditPackage(ctx, range)
              closeDialog()
            }}
          >
            {f.t("io.auditMake")}
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
