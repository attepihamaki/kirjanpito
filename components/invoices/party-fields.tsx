"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  invalidName,
}: {
  value: Party
  onChange: (party: Party) => void
  disabled?: boolean
  /** Marks the name as the field an error line is about. */
  invalidName?: boolean
}) {
  const f = useFormatters()
  const id = React.useId()
  const set = (patch: Partial<Party>) => onChange({ ...value, ...patch })

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {f.t("invoice.customerName")}
        </FieldLabel>
        <Input
          id={`${id}-name`}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={invalidName || undefined}
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field>
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
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-32">
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
        <Field className="min-w-40 flex-1">
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
        <Field className="w-24">
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
      </div>
      <div className="flex flex-wrap gap-3">
        <Field className="w-44">
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
        <Field className="min-w-48 flex-1">
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
      </div>
    </FieldGroup>
  )
}
