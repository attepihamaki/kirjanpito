"use client"

import { CheckIcon } from "lucide-react"
import * as React from "react"

import { OptionSelect } from "@/components/common/option-select"
import {
  SettingCard,
  SettingGrid,
  SettingHint,
  SettingValue,
} from "@/components/common/setting-card"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { BusinessSetting } from "@/components/settings/business-setting"
import { useRenumberChanges } from "@/components/settings/general-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCommandCtx } from "@/hooks/use-commands"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { renumberVouchers } from "@/lib/commands/book-commands"
import {
  removeBookEncryption,
  setBookPassword,
} from "@/lib/commands/encryption-commands"
import { formatMoneyPlain, parseAmount, parseRate } from "@/lib/domain/money"
import { RULES } from "@/lib/domain/rule-tables"
import type { TraderType } from "@/lib/domain/open-items"
import type { Lang } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"
import { LANGS, LANG_NAMES } from "@/stores/lang-store"

/**
 * The first settings page (§8.10): how the book is filed and saved, as a grid
 * of summaries that each open into their controls. The actions that are not
 * settings, opening a year and clearing the entries, are on the title row.
 */
export function GeneralSettings() {
  return (
    <>
      <SettingGrid>
        <BusinessSetting />
        <TraderTypeSetting />
        <VatPeriodSetting />
        <BookStartSetting />
        <PayMonthsSetting kind="yel" />
        <PayMonthsSetting kind="advanceTax" />
        <AdvanceTaxDecisionSetting />
        <ExportLanguageSetting />
        <AutosaveSetting />
        <EncryptionSetting />
        <VoucherNumbers />
      </SettingGrid>
      <ArchivedYears />
      <RulesChecked />
    </>
  )
}

/** The years that live in ZIP files of their own (§8.19). Absent until there is one. */
function ArchivedYears() {
  const f = useFormatters()
  const archives = useBookStore((s) => s.archives)
  const years = Object.keys(archives).sort()
  if (years.length === 0) return null
  return (
    <Panel
      title={f.t("settings.archivesTitle")}
      description={f.t("settings.archivesDesc")}
      className="mt-4"
    >
      <ul className="divide-y">
        {years.map((y) => (
          <li key={y} className="px-4 py-3 text-sm">
            {f.t("settings.archivesRow", {
              y,
              f: archives[y].file,
              n: archives[y].entries,
              d: f.date(archives[y].on),
            })}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** When the rate and limit tables were last compared with their sources (§6.11). */
function RulesChecked() {
  const f = useFormatters()
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      {f.t("settings.rulesChecked", { d: f.date(RULES.checkedOn) })}
    </p>
  )
}

/**
 * The language the bookkeeping is written out in (§7.1, §7.2). The options
 * are endonyms, as in the language picker, so each reads the same whichever
 * language the UI is in.
 */
function ExportLanguageSetting() {
  const f = useFormatters()
  const exportLang = useBookStore((s) => s.exportLang)
  const setExportLang = useBookStore((s) => s.setExportLang)

  return (
    <SettingCard
      label={f.t("settings.exportLang")}
      editor={
        <>
          <ExportLanguageToggle value={exportLang} onChange={setExportLang} />
          <SettingHint>{f.t("settings.exportLangHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        lang={exportLang}
        value={LANG_NAMES[exportLang]}
        note={f.t("settings.exportLangNote")}
      />
    </SettingCard>
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

/** The control alone, so the setup dialog (§8.3) shows the same one. */
export function TraderTypeToggle({
  value,
  onChange,
}: {
  value: TraderType
  onChange: (kind: TraderType) => void
}) {
  const f = useFormatters()

  return (
    <ToggleGroup
      aria-label={f.t("settings.traderType")}
      value={[value]}
      onValueChange={(next) => {
        const kind = next[0] as TraderType | undefined
        if (kind) onChange(kind)
      }}
    >
      <ToggleGroupItem value="professional">
        {f.t("settings.traderProfessional")}
      </ToggleGroupItem>
      <ToggleGroupItem value="business">
        {f.t("settings.traderBusiness")}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * Which kind of sole trader keeps the book (§6.3). It decides whether the
 * income statement and Form 5 read entries by payment date or by their own.
 */
function TraderTypeSetting() {
  const f = useFormatters()
  const traderType = useBookStore((s) => s.traderType)
  const setTraderType = useBookStore((s) => s.setTraderType)

  return (
    <SettingCard
      label={f.t("settings.traderType")}
      editor={
        <>
          <TraderTypeToggle value={traderType} onChange={setTraderType} />
          <SettingHint>{f.t("settings.traderTypeHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={f.t(
          traderType === "business"
            ? "settings.traderBusiness"
            : "settings.traderProfessional"
        )}
        note={f.t(
          traderType === "business"
            ? "settings.traderBusinessNote"
            : "settings.traderProfessionalNote"
        )}
      />
    </SettingCard>
  )
}

/**
 * The months a YEL or advance tax instalment falls due in (§8.22). The days
 * are fixed, the 20th and the 23rd, but the months come from the pension
 * company's invoice and the advance tax decision, which the app cannot see.
 */
function PayMonthsSetting({ kind }: { kind: "yel" | "advanceTax" }) {
  const f = useFormatters()
  const payMonths = useBookStore((s) => s.payMonths)
  const setPayMonths = useBookStore((s) => s.setPayMonths)
  const label = f.t(
    kind === "yel" ? "calendar.yelMonths" : "calendar.taxMonths"
  )
  const months = payMonths[kind]

  return (
    <SettingCard
      label={label}
      editor={
        <>
          <ToggleGroup
            multiple
            spacing={1}
            aria-label={label}
            className="flex-wrap"
            value={months.map(String)}
            onValueChange={(next) =>
              setPayMonths({
                ...payMonths,
                [kind]: next.map(Number).sort((a, b) => a - b),
              })
            }
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <ToggleGroupItem key={m} value={String(m)} variant="outline">
                {f.month(m - 1, true)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <SettingHint>{f.t("calendar.payIntro")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={
          months.length
            ? months.map((m) => f.month(m - 1, true)).join(", ")
            : f.t("calendar.noMonths")
        }
        note={f.t("calendar.note")}
      />
    </SettingCard>
  )
}

/**
 * The advance tax decision for the open year (§8.22): its yearly amount, which
 * the calendar splits over the chosen months, and the flat rate the estimate
 * uses. Each field saves when it loses focus; empty clears it.
 */
function AdvanceTaxDecisionSetting() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const payMonths = useBookStore((s) => s.payMonths)
  const setPayMonths = useBookStore((s) => s.setPayMonths)
  const yearly = payMonths.advanceTaxYearly[String(year)] ?? 0
  const rate = payMonths.taxRate
  const label = f.t("calendar.decisionTitle", { y: year })
  const [amountText, setAmountText] = React.useState(
    yearly ? formatMoneyPlain(yearly) : ""
  )
  const [rateText, setRateText] = React.useState(
    rate === null ? "" : String(rate).replace(".", ",")
  )
  const [amountBad, setAmountBad] = React.useState(false)
  const [rateBad, setRateBad] = React.useState(false)

  const saveAmount = () => {
    const text = amountText.trim()
    const cents = text === "" ? 0 : parseAmount(text)
    if (cents === null || cents < 0) {
      setAmountBad(true)
      return
    }
    setAmountBad(false)
    const next = { ...payMonths.advanceTaxYearly }
    if (cents === 0) delete next[String(year)]
    else next[String(year)] = cents
    setPayMonths({ ...payMonths, advanceTaxYearly: next })
  }

  const saveRate = () => {
    const text = rateText.trim()
    const value = text === "" ? null : parseRate(text)
    if (text !== "" && (value === null || value < 0 || value > 100)) {
      setRateBad(true)
      return
    }
    setRateBad(false)
    setPayMonths({ ...payMonths, taxRate: value })
  }

  return (
    <SettingCard
      label={label}
      editor={
        <>
          <Field data-invalid={amountBad}>
            <FieldLabel htmlFor="decision-amount">
              {f.t("calendar.decisionAmount")}
            </FieldLabel>
            <Input
              id="decision-amount"
              inputMode="decimal"
              className="tabular text-right"
              value={amountText}
              aria-invalid={amountBad}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={saveAmount}
            />
          </Field>
          <Field data-invalid={rateBad}>
            <FieldLabel htmlFor="decision-rate">
              {f.t("calendar.decisionRate")}
            </FieldLabel>
            <Input
              id="decision-rate"
              inputMode="decimal"
              className="tabular text-right"
              value={rateText}
              aria-invalid={rateBad}
              onChange={(e) => setRateText(e.target.value)}
              onBlur={saveRate}
            />
          </Field>
          <SettingHint>{f.t("calendar.decisionHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={yearly ? f.money(yearly) : f.t("calendar.noMonths")}
        note={
          rate === null
            ? f.t("calendar.decisionNoRate")
            : f.t("calendar.decisionRateValue", {
                r: String(rate).replace(".", ","),
              })
        }
      />
    </SettingCard>
  )
}

/** Sentinel for "no start month": a `Select` value cannot be null. */
const NO_START = "none"

/**
 * How often the user files VAT (§6.5). It decides the due dates the overview
 * counts down to and the period the VAT view opens on.
 */
function VatPeriodSetting() {
  const f = useFormatters()
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const setVatPeriod = useBookStore((s) => s.setVatPeriod)
  const names = {
    month: "vat.month",
    quarter: "vat.quarter",
    year: "vat.year",
  } as const

  return (
    <SettingCard
      label={f.t("settings.vatPeriod")}
      editor={
        <>
          <VatPeriodToggle value={vatPeriod} onChange={setVatPeriod} />
          <SettingHint>{f.t("settings.vatPeriodHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={f.t(names[vatPeriod])}
        note={f.t("settings.vatPeriodNote")}
      />
    </SettingCard>
  )
}

/**
 * The month the business began (§8.10). A period that ended before it owes no
 * return, so a company founded in October sees no overdue January.
 */
function BookStartSetting() {
  const f = useFormatters()
  const bookStart = useBookStore((s) => s.bookStart)
  const setBookStart = useBookStore((s) => s.setBookStart)

  return (
    <SettingCard
      label={f.t("settings.bookStart")}
      editor={
        <>
          <div className="flex flex-wrap gap-2">
            <BookStartSelects value={bookStart} onChange={setBookStart} />
          </div>
          <SettingHint>{f.t("settings.bookStartHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={
          bookStart
            ? `${f.month(Number(bookStart.slice(5, 7)) - 1)} ${bookStart.slice(0, 4)}`
            : f.t("settings.bookStartNone")
        }
        note={f.t(
          bookStart ? "settings.bookStartNote" : "settings.bookStartNoteNone"
        )}
      />
    </SettingCard>
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
    <SettingCard
      label={f.t("settings.saving")}
      editor={
        <>
          <AutosaveCheckbox
            id="settings-autosave"
            value={autosave}
            onChange={setAutosave}
          />
          <SettingHint>{f.t("settings.autosaveHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        tone={autosave ? "ok" : "default"}
        lead={
          autosave ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null
        }
        value={f.t(autosave ? "settings.autosaveOn" : "settings.autosaveOff")}
        note={f.t(
          autosave ? "settings.autosaveOnNote" : "settings.autosaveOffNote"
        )}
      />
    </SettingCard>
  )
}

/**
 * Opt-in encryption of the saved file (§7.8). The password is asked in a
 * dialog and held in memory, never stored, so there is nothing to show of it
 * here beyond whether the file will be encrypted.
 */
function EncryptionSetting() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const encrypted = useBookStore((s) => s.encrypted)

  return (
    <SettingCard
      label={f.t("settings.encrypt")}
      editor={
        <>
          <div className="flex flex-wrap gap-2">
            {encrypted ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void setBookPassword(ctx)}
                >
                  {f.t("settings.encryptChange")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void removeBookEncryption(ctx)}
                >
                  {f.t("settings.encryptDisable")}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => void setBookPassword(ctx)}>
                {f.t("settings.encryptEnable")}
              </Button>
            )}
          </div>
          <SettingHint>{f.t("settings.encryptHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        tone={encrypted ? "ok" : "default"}
        lead={
          encrypted ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null
        }
        value={f.t(encrypted ? "settings.encryptOn" : "settings.encryptOff")}
        note={f.t(
          encrypted ? "settings.encryptOnNote" : "settings.encryptOffNote"
        )}
      />
    </SettingCard>
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
 * The state of the selected year's voucher numbers (§4). "Numeroi" is off
 * while they are already in date order, and the count says how many a run
 * would change.
 */
function VoucherNumbers() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const changes = useRenumberChanges()
  const inOrder = changes === 0

  return (
    <SettingCard
      label={f.t("settings.vouchers")}
      action={
        <button
          type="button"
          disabled={inOrder}
          aria-label={f.t("settings.renumber", { year })}
          className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-muted-foreground"
          onClick={() => void renumberVouchers(ctx, year)}
        >
          {f.t("settings.renumberShort")}
        </button>
      }
    >
      <SettingValue
        tone={inOrder ? "ok" : "default"}
        lead={inOrder ? <CheckIcon className="size-4 shrink-0" /> : null}
        value={
          inOrder
            ? f.t("settings.vouchersOk")
            : f.t("settings.vouchersOutValue", { n: changes })
        }
        note={f.t("settings.vouchersYear", { year })}
      />
    </SettingCard>
  )
}
