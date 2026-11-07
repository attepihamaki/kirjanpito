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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  AutosaveCheckbox,
  BookStartSelects,
  ExportLanguageToggle,
  FeatureChecklist,
  TraderTypeToggle,
  VatPeriodToggle,
} from "@/components/settings/general-settings"
import { useFormatters } from "@/components/lang-provider"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { parseBusinessId } from "@/lib/domain/business-id"
import type { Feature } from "@/lib/domain/features"
import type { TraderType } from "@/lib/domain/open-items"
import type { Lang } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/**
 * What a new bookkeeping is started with (§8.3).
 *
 * It opens on "Aloita uusi kirjanpito" and never when a file is opened, since
 * a file brings its own settings.json. Nothing here is unrecoverable — all
 * live on Asetukset, Yleiset — so skipping it keeps the defaults. It holds
 * every book-level setting: the business's name and ID, the export language,
 * the VAT period, the start month and autosave. The checklist on the overview
 * (§8.15) follows it.
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
  const [traderType, setTraderType] = React.useState<TraderType>(
    initial.traderType
  )
  const [hiddenFeatures, setHiddenFeatures] = React.useState<Feature[]>(
    initial.hiddenFeatures
  )
  const [bookStart, setBookStart] = React.useState<string | null>(
    initial.bookStart
  )
  const [autosave, setAutosave] = React.useState(initial.autosave)
  const [businessName, setBusinessName] = React.useState(
    initial.businessName ?? ""
  )
  const [businessId, setBusinessId] = React.useState(initial.businessId ?? "")
  const [idInvalid, setIdInvalid] = React.useState(false)
  const nameInputId = React.useId()
  const idInputId = React.useId()

  function start() {
    const parsedId = parseBusinessId(businessId)
    /* A typed ID that fails its check digit is corrected, never dropped. */
    if (businessId.trim() && !parsedId) {
      setIdInvalid(true)
      return
    }
    startBook({
      exportLang,
      businessName: businessName.trim() || null,
      businessId: parsedId,
      vatPeriod,
      traderType,
      hiddenFeatures,
      bookStart,
      autosave,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/*
       * Wider than the default dialog: four labelled settings, each with a
       * sentence explaining it, and a segmented control whose longest option
       * is "Neljännesvuosi". At the default width every description runs to
       * three lines and the form reads as a column of text.
       */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{f.t("settings.setupTitle")}</DialogTitle>
          <DialogDescription>{f.t("settings.setupIntro")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto px-0.5">
          <Field>
            <FieldLabel htmlFor={nameInputId}>
              {f.t("settings.businessName")}
            </FieldLabel>
            <Input
              id={nameInputId}
              autoComplete="organization"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={idInputId}>
              {f.t("common.businessId")}
            </FieldLabel>
            <Input
              id={idInputId}
              aria-invalid={idInvalid || undefined}
              className="tabular w-40"
              placeholder="1234567-1"
              autoComplete="off"
              value={businessId}
              onChange={(e) => {
                setBusinessId(e.target.value)
                setIdInvalid(false)
              }}
            />
            <FieldError>
              {idInvalid ? f.t("settings.businessIdInvalid") : undefined}
            </FieldError>
            <FieldDescription>{f.t("settings.businessHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.exportLang")}</FieldLabel>
            <ExportLanguageToggle value={exportLang} onChange={setExportLang} />
            <FieldDescription>
              {f.t("settings.exportLangHint")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.traderType")}</FieldLabel>
            <TraderTypeToggle value={traderType} onChange={setTraderType} />
            <FieldDescription>
              {f.t("settings.traderTypeHint")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{f.t("settings.featuresQuestion")}</FieldLabel>
            <FeatureChecklist
              idPrefix="setup-feature"
              hidden={hiddenFeatures}
              onChange={setHiddenFeatures}
            />
            <FieldDescription>{f.t("settings.featuresHint")}</FieldDescription>
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
          <Button onClick={start}>{f.t("settings.setupStart")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
