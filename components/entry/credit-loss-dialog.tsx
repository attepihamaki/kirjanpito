"use client"

import * as React from "react"

import { DateInput } from "@/components/common/date-input"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  creditLossRefusal,
  creditLossTargets,
  writeOffCreditLoss,
} from "@/lib/commands/credit-loss-commands"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso } from "@/lib/domain/dates"
import { useBookStore } from "@/stores/book-store"

const REFUSAL_TEXT = {
  nothing: "entry.creditLossNothing",
  badDate: "entry.creditLossBadDate",
  locked: "entry.creditLossLocked",
} as const

/**
 * "Kirjaa luottotappioksi" (§6.18): asks for the day the loss was found and
 * writes off what is still open of the sale, or of its whole invoice.
 */
export function CreditLossDialog() {
  const entryId = useBookStore((s) =>
    s.dialog.kind === "credit-loss" ? s.dialog.entryId : null
  )
  if (entryId === null) return null
  return <CreditLossForm key={entryId} entryId={entryId} />
}

function CreditLossForm({ entryId }: { entryId: string }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const invoices = useBookStore((s) => s.invoices)
  const targets = React.useMemo(
    () => creditLossTargets(entryId, { entries, cats, invoices }),
    [entryId, entries, cats, invoices]
  )
  const [on, setOn] = React.useState(todayIso())
  const [badText, setBadText] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const refusal = badText ? null : creditLossRefusal(targets, on)
  const gross = targets.reduce((sum, e) => sum + calcEntry(e).gross, 0)

  const submit = async () => {
    if (badText || refusal) return
    setBusy(true)
    try {
      if (await writeOffCreditLoss(ctx, targets, on)) closeDialog()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.t("entry.creditLossTitle")}</DialogTitle>
          <DialogDescription>{f.t("entry.creditLossHint")}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!refusal || badText}>
            <FieldLabel htmlFor="credit-loss-date">
              {f.t("entry.creditLossDate")}
            </FieldLabel>
            <DateInput
              id="credit-loss-date"
              value={on}
              onValueChange={setOn}
              onBadChange={setBadText}
              aria-invalid={!!refusal || badText}
            />
            {targets.length > 0 ? (
              <FieldDescription>
                {f.t("entry.creditLossAmount", { a: f.money(gross) })}
              </FieldDescription>
            ) : null}
            {refusal ? (
              <FieldError>{f.t(REFUSAL_TEXT[refusal])}</FieldError>
            ) : null}
          </Field>
          <p className="text-sm text-muted-foreground">
            {f.t("entry.creditLossEvidence")}
          </p>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {f.t("common.cancel")}
          </Button>
          <Button
            disabled={busy || badText || !!refusal}
            onClick={() => void submit()}
          >
            {f.t("entry.creditLossAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
