"use client"

import { ListOrderedIcon, Trash2Icon } from "lucide-react"
import * as React from "react"

import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { clearAllEntries, renumberVouchers } from "@/lib/commands/book-commands"
import type { Lang } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { renumberYear } from "@/lib/domain/voucher"
import { useBookStore } from "@/stores/book-store"
import { LANGS, LANG_NAMES } from "@/stores/lang-store"

/** The first settings page (§8.10): how the book is filed and saved. */
export function GeneralSettings() {
  return (
    <div className="flex flex-col gap-6">
      <ExportLanguageSetting />
      <VatPeriodSetting />
      <BookStartSetting />
      <AutosaveSetting />
      <VoucherNumbers />
      <ClearEntries />
    </div>
  )
}

/**
 * The language the bookkeeping is written out in (§7.1, §7.2). It comes first
 * because it decides the shape of the file, where the VAT period only decides
 * what goes in it. The options are endonyms, as in the language picker, so
 * each reads the same whichever language the UI is in.
 */
export function ExportLanguageSetting() {
  const f = useFormatters()
  const exportLang = useBookStore((s) => s.exportLang)
  const setExportLang = useBookStore((s) => s.setExportLang)

  return (
    <Panel
      title={f.t("settings.exportLang")}
      description={f.t("settings.exportLangHint")}
      bodyClassName="p-4"
    >
      <ExportLanguageToggle value={exportLang} onChange={setExportLang} />
    </Panel>
  )
}

/** The control alone, so the setup dialog (§8.3) shows the same one. */
export function ExportLanguageToggle({
  value,
  onChange,
}: {
  value: Lang
  onChange: (lang: Lang) => void
}) {
  const f = useFormatters()

  return (
    <ToggleGroup
      aria-label={f.t("settings.exportLang")}
      value={[value]}
      onValueChange={(next) => {
        const lang = next[0] as Lang | undefined
        if (lang) onChange(lang)
      }}
    >
      {LANGS.map((code) => (
        <ToggleGroupItem key={code} value={code} lang={code}>
          {LANG_NAMES[code]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
      <VatPeriodToggle value={vatPeriod} onChange={setVatPeriod} />
    </Panel>
  )
}

/** The control alone, so the setup dialog (§8.3) shows the same one. */
export function VatPeriodToggle({
  value,
  onChange,
}: {
  value: VatPeriodKind
  onChange: (kind: VatPeriodKind) => void
}) {
  const f = useFormatters()

  return (
    <ToggleGroup
      aria-label={f.t("settings.vatPeriod")}
      value={[value]}
      onValueChange={(next) => {
        const kind = next[0] as VatPeriodKind | undefined
        if (kind) onChange(kind)
      }}
    >
      <ToggleGroupItem value="month">{f.t("vat.month")}</ToggleGroupItem>
      <ToggleGroupItem value="quarter">{f.t("vat.quarter")}</ToggleGroupItem>
      <ToggleGroupItem value="year">{f.t("vat.year")}</ToggleGroupItem>
    </ToggleGroup>
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

  return (
    <Panel
      title={f.t("settings.bookStart")}
      description={f.t("settings.bookStartHint")}
      bodyClassName="flex flex-wrap gap-2 p-4"
    >
      <BookStartSelects value={bookStart} onChange={setBookStart} />
    </Panel>
  )
}

/** The two selects alone, so the setup dialog (§8.3) shows the same ones. */
export function BookStartSelects({
  value,
  onChange,
}: {
  value: string | null
  onChange: (month: string | null) => void
}) {
  const f = useFormatters()
  const selectedYear = useBookStore((s) => s.year)

  const startYear = value ? Number(value.slice(0, 4)) : selectedYear
  const startMonth = value ? value.slice(5, 7) : NO_START
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
    <>
      <OptionSelect
        label={f.t("settings.bookStartMonth")}
        options={monthOptions}
        value={startMonth}
        onChange={(m) => onChange(m === NO_START ? null : `${startYear}-${m}`)}
        className="w-56"
      />
      {value ? (
        <OptionSelect
          label={f.t("settings.bookStartYear")}
          options={yearOptions}
          value={String(startYear)}
          onChange={(y) => onChange(`${y}-${startMonth}`)}
          className="w-28"
        />
      ) : null}
    </>
  )
}

/**
 * Opt-in autosave (§7.5). Absent where the browser cannot write to a file,
 * like the file menu's save row: a switch that can never work is worse than
 * none.
 */
function AutosaveSetting() {
  const f = useFormatters()
  const autosave = useBookStore((s) => s.autosave)
  const setAutosave = useBookStore((s) => s.setAutosave)
  if (!useCanSaveToFile()) return null

  return (
    <Panel
      title={f.t("settings.saving")}
      description={f.t("settings.autosaveHint")}
      bodyClassName="p-4"
    >
      <AutosaveCheckbox
        id="settings-autosave"
        value={autosave}
        onChange={setAutosave}
      />
    </Panel>
  )
}

/**
 * The checkbox alone, so the setup dialog (§8.3) shows the same one. It
 * renders nothing where the browser cannot write to a file, like the file
 * menu's save row: a switch that can never work is worse than none.
 */
export function AutosaveCheckbox({
  id,
  value,
  onChange,
}: {
  id: string
  value: boolean
  onChange: (on: boolean) => void
}) {
  const f = useFormatters()
  if (!useCanSaveToFile()) return null

  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        checked={value}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <FieldLabel htmlFor={id} className="font-normal">
        {f.t("settings.autosave")}
      </FieldLabel>
    </Field>
  )
}

/**
 * Renumbering the selected year (§4). The button is off while the numbers are
 * already in date order, and the count says how many a run would change.
 */
function VoucherNumbers() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)

  const changes = React.useMemo(() => {
    const after = renumberYear(entries, year)
    return after.filter((e, i) => e !== entries[i]).length
  }, [entries, year])

  return (
    <Panel
      title={f.t("settings.vouchers")}
      description={f.t("settings.vouchersHint")}
      bodyClassName="p-4 text-sm text-muted-foreground"
      footer={
        <Button
          variant="outline"
          disabled={changes === 0}
          onClick={() => void renumberVouchers(ctx, year)}
        >
          <ListOrderedIcon data-icon="inline-start" />
          {f.t("settings.renumber", { year })}
        </Button>
      }
    >
      {changes === 0
        ? f.t("settings.vouchersInOrder", { year })
        : f.t("settings.vouchersOutOfOrder", { year, n: changes })}
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
