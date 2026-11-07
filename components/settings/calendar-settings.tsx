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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatMoneyPlain, parseRate } from "@/lib/domain/money"
import { evalAmount } from "@/lib/domain/amount-expr"
import { useBookStore } from "@/stores/book-store"

/**
 * The calendar's inputs (§8.10, §8.22): the months the YEL and advance tax
 * instalments fall due in, and the advance tax decision for the open year.
 */
export function CalendarSettings() {
  return (
    <SettingGrid>
      <PayMonthsSetting kind="yel" />
      <PayMonthsSetting kind="advanceTax" />
      <AdvanceTaxDecisionSetting />
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
