"use client"

import * as React from "react"

import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isFinnishIban, parseIban, formatIban } from "@/lib/domain/iban"
import type { InvoiceSettings } from "@/lib/domain/invoice"
import { useBookStore } from "@/stores/book-store"

type TextKey = "street" | "postcode" | "city" | "email"

/**
 * The seller details and terms every invoice is written with (§8.27). Each
 * field is stored when it loses focus, and the IBAN and the numbers only if
 * valid, so the store and the file never hold a half-typed value.
 */
export function InvoiceSettingsForm() {
  const f = useFormatters()
  const settings = useBookStore((s) => s.invoiceSettings)
  const setSettings = useBookStore((s) => s.setInvoiceSettings)
  const issued = useBookStore((s) => s.invoices.some((i) => i.number !== null))

  const [drafts, setDrafts] = React.useState({
    street: settings.street,
    postcode: settings.postcode,
    city: settings.city,
    email: settings.email,
    iban: settings.iban ? formatIban(settings.iban) : "",
    termDays: String(settings.termDays),
    termsFi: settings.terms.fi,
    termsEn: settings.terms.en,
    firstNumber: String(settings.firstNumber),
  })
  const [ibanInvalid, setIbanInvalid] = React.useState(false)
  const set = (patch: Partial<typeof drafts>) =>
    setDrafts((d) => ({ ...d, ...patch }))
  const save = (patch: Partial<InvoiceSettings>) => {
    const next = { ...settings, ...patch }
    if (JSON.stringify(next) !== JSON.stringify(settings)) setSettings(next)
  }

  const ids = {
    street: React.useId(),
    postcode: React.useId(),
    city: React.useId(),
    email: React.useId(),
    iban: React.useId(),
    term: React.useId(),
    termsFi: React.useId(),
    termsEn: React.useId(),
    first: React.useId(),
  }

  const commitText = (key: TextKey) => {
    const value = drafts[key].trim()
    set({ [key]: value })
    save({ [key]: value })
  }
  const commitIban = () => {
    const text = drafts.iban.trim()
    if (text === "") {
      setIbanInvalid(false)
      save({ iban: "" })
      return
    }
    const iban = parseIban(text)
    if (!iban) {
      setIbanInvalid(true)
      return
    }
    set({ iban: formatIban(iban) })
    save({ iban })
  }
  const commitTerm = () => {
    const days = Number(drafts.termDays)
    if (Number.isInteger(days) && days >= 0 && days <= 365)
      save({ termDays: days })
    else set({ termDays: String(settings.termDays) })
  }
  const commitFirst = () => {
    const n = Number(drafts.firstNumber)
    if (Number.isInteger(n) && n >= 100 && n <= 999_999_999)
      save({ firstNumber: n })
    else set({ firstNumber: String(settings.firstNumber) })
  }

  return (
    <Panel
      title={f.t("invoice.settingsTitle")}
      description={f.t("invoice.settingsHint")}
      bodyClassName="p-4"
    >
      <FieldGroup className="max-w-xl">
        <Field>
          <FieldLabel htmlFor={ids.street}>
            {f.t("invoice.settingsStreet")}
          </FieldLabel>
          <Input
            id={ids.street}
            autoComplete="street-address"
            value={drafts.street}
            onChange={(e) => set({ street: e.target.value })}
            onBlur={() => commitText("street")}
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field className="w-32">
            <FieldLabel htmlFor={ids.postcode}>
              {f.t("invoice.settingsPostcode")}
            </FieldLabel>
            <Input
              id={ids.postcode}
              autoComplete="postal-code"
              className="tabular"
              value={drafts.postcode}
              onChange={(e) => set({ postcode: e.target.value })}
              onBlur={() => commitText("postcode")}
            />
          </Field>
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor={ids.city}>
              {f.t("invoice.settingsCity")}
            </FieldLabel>
            <Input
              id={ids.city}
              autoComplete="address-level2"
              value={drafts.city}
              onChange={(e) => set({ city: e.target.value })}
              onBlur={() => commitText("city")}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={ids.email}>
            {f.t("invoice.settingsEmail")}
          </FieldLabel>
          <Input
            id={ids.email}
            type="email"
            autoComplete="email"
            value={drafts.email}
            onChange={(e) => set({ email: e.target.value })}
            onBlur={() => commitText("email")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.iban}>
            {f.t("invoice.settingsIban")}
          </FieldLabel>
          <Input
            id={ids.iban}
            autoComplete="off"
            aria-invalid={ibanInvalid || undefined}
            className="tabular"
            placeholder="FI21 1234 5600 0007 85"
            value={drafts.iban}
            onChange={(e) => {
              set({ iban: e.target.value })
              setIbanInvalid(false)
            }}
            onBlur={commitIban}
          />
          <FieldError>
            {ibanInvalid ? f.t("invoice.settingsIbanInvalid") : undefined}
          </FieldError>
          {settings.iban !== "" && !isFinnishIban(settings.iban) ? (
            <FieldDescription>
              {f.t("invoice.settingsIbanForeign")}
            </FieldDescription>
          ) : null}
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor={ids.term}>
            {f.t("invoice.settingsTerm")}
          </FieldLabel>
          <Input
            id={ids.term}
            inputMode="numeric"
            className="tabular"
            value={drafts.termDays}
            onChange={(e) => set({ termDays: e.target.value })}
            onBlur={commitTerm}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.termsFi}>
            {f.t("invoice.settingsTermsFi")}
          </FieldLabel>
          <Input
            id={ids.termsFi}
            value={drafts.termsFi}
            onChange={(e) => set({ termsFi: e.target.value })}
            onBlur={() => {
              const fi = drafts.termsFi.trim()
              set({ termsFi: fi })
              save({ terms: { ...settings.terms, fi } })
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.termsEn}>
            {f.t("invoice.settingsTermsEn")}
          </FieldLabel>
          <Input
            id={ids.termsEn}
            value={drafts.termsEn}
            onChange={(e) => set({ termsEn: e.target.value })}
            onBlur={() => {
              const en = drafts.termsEn.trim()
              set({ termsEn: en })
              save({ terms: { ...settings.terms, en } })
            }}
          />
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor={ids.first}>
            {f.t("invoice.settingsFirst")}
          </FieldLabel>
          <Input
            id={ids.first}
            inputMode="numeric"
            className="tabular"
            disabled={issued}
            value={drafts.firstNumber}
            onChange={(e) => set({ firstNumber: e.target.value })}
            onBlur={commitFirst}
          />
          <FieldDescription>
            {f.t("invoice.settingsFirstHint")}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </Panel>
  )
}
