"use client"

import * as React from "react"
import { PencilIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Party } from "@/lib/domain/invoice"

/**
 * The name, address and contact fields of a customer, shared by the customer
 * dialog and the invoice dialog (§8.27). It edits a `Party` and reports each
 * change whole, so both callers keep the party in their own state.
 */
export function PartyFields({
  value,
  onChange,
  disabled,
  nameError,
  wide,
}: {
  value: Party
  onChange: (party: Party) => void
  disabled?: boolean
  /** What is wrong with the name, shown under it, or nothing. */
  nameError?: string
  /** Lay the fields out in three rows across a wide dialog. */
  wide?: boolean
}) {
  const f = useFormatters()
  const id = React.useId()
  const set = (patch: Partial<Party>) => onChange({ ...value, ...patch })

  const name = (
    <Field className={wide ? "col-span-2 sm:col-span-3" : undefined}>
      <FieldLabel htmlFor={`${id}-name`}>
        {f.t("invoice.customerName")}
      </FieldLabel>
      <Input
        id={`${id}-name`}
        autoComplete="off"
        disabled={disabled}
        aria-invalid={nameError ? true : undefined}
        value={value.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <FieldError>{nameError}</FieldError>
    </Field>
  )
  const street = (
    <Field className={wide ? "col-span-2 sm:col-span-3" : undefined}>
      <FieldLabel htmlFor={`${id}-street`}>
        {f.t("invoice.customerStreet")}
      </FieldLabel>
      <Input
        id={`${id}-street`}
        autoComplete="off"
        disabled={disabled}
        value={value.street}
        onChange={(e) => set({ street: e.target.value })}
      />
    </Field>
  )
  const postcode = (
    <Field className={wide ? "sm:col-span-1" : undefined}>
      <FieldLabel htmlFor={`${id}-postcode`}>
        {f.t("invoice.customerPostcode")}
      </FieldLabel>
      <Input
        id={`${id}-postcode`}
        autoComplete="off"
        disabled={disabled}
        className="tabular"
        value={value.postcode}
        onChange={(e) => set({ postcode: e.target.value })}
      />
    </Field>
  )
  const city = (
    <Field className={wide ? "sm:col-span-2" : "col-span-2 sm:col-span-1"}>
      <FieldLabel htmlFor={`${id}-city`}>
        {f.t("invoice.customerCity")}
      </FieldLabel>
      <Input
        id={`${id}-city`}
        autoComplete="off"
        disabled={disabled}
        value={value.city}
        onChange={(e) => set({ city: e.target.value })}
      />
    </Field>
  )
  const country = (
    <Field className={wide ? "sm:col-span-1" : undefined}>
      <FieldLabel htmlFor={`${id}-country`}>
        {f.t("invoice.customerCountry")}
      </FieldLabel>
      <Input
        id={`${id}-country`}
        autoComplete="off"
        disabled={disabled}
        maxLength={2}
        placeholder="FI"
        className="uppercase"
        value={value.country}
        onChange={(e) => set({ country: e.target.value.toUpperCase() })}
      />
    </Field>
  )
  const vatId = (
    <Field className={wide ? "sm:col-span-2" : undefined}>
      <FieldLabel htmlFor={`${id}-vat`}>
        {f.t("invoice.customerVatId")}
      </FieldLabel>
      <Input
        id={`${id}-vat`}
        autoComplete="off"
        disabled={disabled}
        className="tabular"
        value={value.vatId}
        onChange={(e) => set({ vatId: e.target.value })}
      />
    </Field>
  )
  const email = (
    <Field className={wide ? "col-span-2 sm:col-span-3" : undefined}>
      <FieldLabel htmlFor={`${id}-email`}>
        {f.t("invoice.customerEmail")}
      </FieldLabel>
      <Input
        id={`${id}-email`}
        type="email"
        autoComplete="off"
        disabled={disabled}
        value={value.email}
        onChange={(e) => set({ email: e.target.value })}
      />
    </Field>
  )

  if (wide) {
    /* Six columns: name and street; postcode, city, country and VAT number; email. */
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-6">
        {name}
        {street}
        {postcode}
        {city}
        {country}
        {vatId}
        {email}
      </div>
    )
  }

  return (
    <FieldGroup>
      {name}
      {street}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[8rem_1fr_6rem]">
        {postcode}
        {city}
        {country}
      </div>
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
        {vatId}
        {email}
      </div>
    </FieldGroup>
  )
}

/**
 * A party as a few read-only lines, for an invoice whose customer comes from
 * the register or is already issued (§8.27). `onEdit` opens the fields for
 * this invoice only; without it the card cannot be changed.
 */
export function PartyCard({
  value,
  onEdit,
}: {
  value: Party
  onEdit?: () => void
}) {
  const f = useFormatters()
  const place = [value.postcode, value.city].filter(Boolean).join(" ")
  const country = value.country && value.country !== "FI" ? value.country : ""
  const lines = [
    value.street,
    [place, country].filter(Boolean).join(", "),
    [value.vatId, value.email].filter(Boolean).join(" · "),
  ].filter(Boolean)

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{value.name}</p>
        {lines.map((line, index) => (
          <p key={index} className="truncate text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
      {onEdit ? (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          {f.t("invoice.editOnInvoice")}
        </Button>
      ) : null}
    </div>
  )
}
