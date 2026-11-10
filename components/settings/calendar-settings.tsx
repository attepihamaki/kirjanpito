"use client"

import * as React from "react"
import { AmountInput } from "@/components/common/amount-input"

import {
  SettingCard,
  SettingGrid,
  SettingHint,
  SettingValue,
} from "@/components/common/setting-card"
import { useFormatters } from "@/components/lang-provider"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatMoneyPlain, parseRate } from "@/lib/domain/money"
import { evalAmount } from "@/lib/domain/amount-expr"
import { incomeTaxRow, type TaxProfile } from "@/lib/domain/income-tax"
import { useBookStore } from "@/stores/book-store"

/**
 * The calendar's inputs (§8.10, §8.22): the months the YEL and advance tax
 * instalments fall due in, the advance tax decision for the open year, and
 * what the income tax and YEL estimate needs to know (§6.14).
 */
export function CalendarSettings() {
  return (
    <SettingGrid>
      <PayMonthsSetting kind="yel" />
      <PayMonthsSetting kind="advanceTax" />
      <AdvanceTaxDecisionSetting />
      <TaxProfileSetting />
    </SettingGrid>
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
    const cents = text === "" ? 0 : evalAmount(text)
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
            <AmountInput
              id="decision-amount"
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

const rateText = (rate: number | null) =>
  rate === null ? "" : String(rate).replace(".", ",")

const amountText = (cents: number | null) =>
  cents === null || cents === 0 ? "" : formatMoneyPlain(cents)

/**
 * What the income tax and YEL estimate needs to know about the user (§6.14):
 * the municipal and church rates from the tax card, the confirmed YEL work
 * income, the starter discount and the earned income outside the book. Each
 * field saves when it loses focus; an empty municipal rate turns the
 * estimate off.
 */
function TaxProfileSetting() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const payMonths = useBookStore((s) => s.payMonths)
  const setPayMonths = useBookStore((s) => s.setPayMonths)
  const profile = payMonths.taxProfile
  const [text, setText] = React.useState({
    municipalRate: rateText(profile.municipalRate),
    churchRate: rateText(profile.churchRate),
    yelIncome: amountText(profile.yelIncome),
    otherIncome: amountText(profile.otherIncome),
  })
  const [bad, setBad] = React.useState<
    Partial<Record<keyof typeof text, true>>
  >({})
  const label = f.t("calendar.profileTitle")

  const save = (change: Partial<TaxProfile>) =>
    setPayMonths({ ...payMonths, taxProfile: { ...profile, ...change } })

  const saveRate = (key: "municipalRate" | "churchRate") => {
    const raw = text[key].trim()
    const value = raw === "" ? null : parseRate(raw)
    if (raw !== "" && (value === null || value < 0 || value > 100)) {
      setBad((b) => ({ ...b, [key]: true }))
      return
    }
    setBad((b) => ({ ...b, [key]: undefined }))
    save({ [key]: value })
  }

  const saveAmount = (key: "yelIncome" | "otherIncome") => {
    const raw = text[key].trim()
    const cents = raw === "" ? 0 : evalAmount(raw)
    if (cents === null || cents < 0) {
      setBad((b) => ({ ...b, [key]: true }))
      return
    }
    setBad((b) => ({ ...b, [key]: undefined }))
    save(
      key === "yelIncome"
        ? { yelIncome: cents === 0 ? null : cents }
        : { otherIncome: cents }
    )
  }

  const field = (
    key: keyof typeof text,
    name: string,
    onBlur: () => void,
    money: boolean
  ) => {
    const id = `tax-profile-${key}`
    const Control = money ? AmountInput : Input
    return (
      <Field data-invalid={bad[key] === true}>
        <FieldLabel htmlFor={id}>{name}</FieldLabel>
        <Control
          id={id}
          inputMode="decimal"
          className="tabular text-right"
          value={text[key]}
          aria-invalid={bad[key] === true}
          onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
          onBlur={onBlur}
        />
      </Field>
    )
  }

  return (
    <SettingCard
      label={label}
      editor={
        <>
          {field(
            "municipalRate",
            f.t("calendar.profileMunicipal"),
            () => saveRate("municipalRate"),
            false
          )}
          {field(
            "churchRate",
            f.t("calendar.profileChurch"),
            () => saveRate("churchRate"),
            false
          )}
          {field(
            "yelIncome",
            f.t("calendar.profileYel"),
            () => saveAmount("yelIncome"),
            true
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={profile.yelStarter}
              onCheckedChange={(v) => save({ yelStarter: v === true })}
            />
            {f.t("calendar.profileStarter")}
          </label>
          {field(
            "otherIncome",
            f.t("calendar.profileOther"),
            () => saveAmount("otherIncome"),
            true
          )}
          <SettingHint>{f.t("calendar.profileHint")}</SettingHint>
        </>
      }
    >
      <SettingValue
        value={
          profile.municipalRate === null
            ? f.t("calendar.decisionNoRate")
            : f.t("calendar.profileValue", {
                r: rateText(profile.municipalRate),
              })
        }
        muted={profile.municipalRate === null}
        note={
          incomeTaxRow(year)
            ? f.t("calendar.profileNote")
            : f.t("calendar.profileNoYear", { y: year })
        }
      />
    </SettingCard>
  )
}
