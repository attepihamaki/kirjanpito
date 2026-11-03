"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  AutosaveCheckbox,
  BookStartSelects,
  ExportLanguageToggle,
  VatPeriodToggle,
} from "@/components/settings/general-settings"
import { useFormatters } from "@/components/lang-provider"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import type { Lang } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/**
 * What a new bookkeeping is started with (§8.3).
 *
 * It opens on "Aloita uusi kirjanpito" and never when a file is opened, since
 * a file brings its own settings.json. Nothing here is unrecoverable — all
 * four live on Asetukset, Yleiset — so skipping it keeps the defaults.
 */
export function SetupDialog() {
  const dialog = useBookStore((s) => s.dialog)
  const closeDialog = useBookStore((s) => s.closeDialog)
  if (dialog.kind !== "setup") return null
  /*
   * Keyed on its own mount: opening it reads the defaults as initial state
   * rather than through an effect.
   */
  return <SetupDialogForm onClose={closeDialog} />
}

function SetupDialogForm({ onClose }: { onClose: () => void }) {
  const f = useFormatters()
  const startBook = useBookStore((s) => s.startBook)
  const canSave = useCanSaveToFile()

  const initial = useBookStore.getState()
  const [exportLang, setExportLang] = React.useState<Lang>(initial.exportLang)
  const [vatPeriod, setVatPeriod] = React.useState<VatPeriodKind>(
    initial.vatPeriod
  )
  const [bookStart, setBookStart] = React.useState<string | null>(
    initial.bookStart
  )
  const [autosave, setAutosave] = React.useState(initial.autosave)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.t("settings.setupTitle")}</DialogTitle>
          <DialogDescription>{f.t("settings.setupIntro")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Field>
            <FieldLabel>{f.t("settings.exportLang")}</FieldLabel>
            <ExportLanguageToggle value={exportLang} onChange={setExportLang} />
            <FieldDescription>
              {f.t("settings.exportLangHint")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.vatPeriod")}</FieldLabel>
            <VatPeriodToggle value={vatPeriod} onChange={setVatPeriod} />
            <FieldDescription>{f.t("settings.vatPeriodHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.bookStart")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <BookStartSelects value={bookStart} onChange={setBookStart} />
            </div>
            <FieldDescription>{f.t("settings.bookStartHint")}</FieldDescription>
          </Field>

          {/* Absent where no file can be written, as on Asetukset (§8.2). */}
          {canSave ? (
            <Field>
              <FieldLabel>{f.t("settings.saving")}</FieldLabel>
              <AutosaveCheckbox
                id="setup-autosave"
                value={autosave}
                onChange={setAutosave}
              />
              <FieldDescription>
                {f.t("settings.autosaveHint")}
              </FieldDescription>
            </Field>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("settings.setupSkip")}
          </Button>
          <Button
            onClick={() =>
              startBook({ exportLang, vatPeriod, bookStart, autosave })
            }
          >
            {f.t("settings.setupStart")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
