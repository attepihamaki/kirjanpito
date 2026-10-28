"use client"

import { Trash2Icon } from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { clearAllEntries } from "@/lib/commands/book-commands"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/** The first settings page (§8.10): how the book is filed and saved. */
export function GeneralSettings() {
  return (
    <div className="flex flex-col gap-6">
      <VatPeriodSetting />
      <BookStartSetting />
      <AutosaveSetting />
      <ClearEntries />
    </div>
  )
}

/**
 * How often the user files VAT (§6.5). It decides the due dates the overview
 * counts down to and the period the VAT view opens on.
 */
function VatPeriodSetting() {
  const f = useFormatters()
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const setVatPeriod = useBookStore((s) => s.setVatPeriod)

  return (
    <Panel
      title={f.t("settings.vatPeriod")}
      description={f.t("settings.vatPeriodHint")}
      bodyClassName="p-4"
    >
      <ToggleGroup
        aria-label={f.t("settings.vatPeriod")}
        value={[vatPeriod]}
        onValueChange={(value) => {
          const next = value[0] as VatPeriodKind | undefined
          if (next) setVatPeriod(next)
        }}
      >
        <ToggleGroupItem value="month">{f.t("vat.month")}</ToggleGroupItem>
        <ToggleGroupItem value="quarter">{f.t("vat.quarter")}</ToggleGroupItem>
        <ToggleGroupItem value="year">{f.t("vat.year")}</ToggleGroupItem>
      </ToggleGroup>
    </Panel>
  )
}

/** Sentinel for "no start month": a `Select` value cannot be null. */
const NO_START = "none"

/**
 * The month the business began (§8.10). A period that ended before it owes
 * no return, so a company founded in October sees no overdue January.
 */
function BookStartSetting() {
  const f = useFormatters()
  const bookStart = useBookStore((s) => s.bookStart)
  const setBookStart = useBookStore((s) => s.setBookStart)
  const selectedYear = useBookStore((s) => s.year)

  const startYear = bookStart ? Number(bookStart.slice(0, 4)) : selectedYear
  const startMonth = bookStart ? bookStart.slice(5, 7) : NO_START
  const thisYear = new Date().getFullYear()
  const years = new Set([startYear, selectedYear])
  for (let y = thisYear - 10; y <= thisYear + 1; y++) years.add(y)

  const monthOptions = [
    { value: NO_START, label: f.t("settings.bookStartNone") },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, "0"),
      label: f.month(i),
    })),
  ]
  const yearOptions = [...years]
    .sort((a, b) => b - a)
    .map((y) => ({ value: String(y), label: String(y) }))

  return (
    <Panel
      title={f.t("settings.bookStart")}
      description={f.t("settings.bookStartHint")}
      bodyClassName="flex flex-wrap gap-2 p-4"
    >
      <OptionSelect
        label={f.t("settings.bookStartMonth")}
        options={monthOptions}
        value={startMonth}
        onChange={(m) =>
          setBookStart(m === NO_START ? null : `${startYear}-${m}`)
        }
        className="w-56"
      />
      {bookStart ? (
        <OptionSelect
          label={f.t("settings.bookStartYear")}
          options={yearOptions}
          value={String(startYear)}
          onChange={(y) => setBookStart(`${y}-${startMonth}`)}
          className="w-28"
        />
      ) : null}
    </Panel>
  )
}

/**
 * Opt-in autosave (§7.5). Absent where the browser cannot write to a file,
 * like the file menu's save row: a switch that can never work is worse than
 * none.
 */
function AutosaveSetting() {
  const f = useFormatters()
  const canSave = useCanSaveToFile()
  const autosave = useBookStore((s) => s.autosave)
  const setAutosave = useBookStore((s) => s.setAutosave)
  if (!canSave) return null

  return (
    <Panel
      title={f.t("settings.saving")}
      description={f.t("settings.autosaveHint")}
      bodyClassName="p-4"
    >
      <Field orientation="horizontal">
        <Checkbox
          id="settings-autosave"
          checked={autosave}
          onCheckedChange={(checked) => setAutosave(checked === true)}
        />
        <FieldLabel htmlFor="settings-autosave" className="font-normal">
          {f.t("settings.autosave")}
        </FieldLabel>
      </Field>
    </Panel>
  )
}

/**
 * Clearing the entries erases the bookkeeping from this browser, so it sits
 * last on the page in a destructive panel of its own.
 */
function ClearEntries() {
  const f = useFormatters()
  const ctx = useCommandCtx()

  return (
    <Panel
      variant="destructive"
      title={f.t("settings.clearEntries")}
      description={f.t("settings.clearHint")}
      footer={
        <Button variant="destructive" onClick={() => void clearAllEntries(ctx)}>
          <Trash2Icon data-icon="inline-start" />
          {f.t("confirm.clearConfirm")}
        </Button>
      }
    />
  )
}
