"use client"

import * as React from "react"

import { InfoPopover } from "@/components/common/info-popover"
import { OptionSelect } from "@/components/common/option-select"
import { useFormatters } from "@/components/lang-provider"
import { PartyFields } from "@/components/invoices/party-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { looksLikeVatId } from "@/lib/domain/ec-sales"
import { billIban } from "@/lib/domain/bill-payment"
import { formatIban } from "@/lib/domain/iban"
import { uid } from "@/lib/domain/id"
import {
  emptyParty,
  PARTY_ROLES,
  type Customer,
  type InvoiceLang,
  type Party,
  type PartyRole,
} from "@/lib/domain/invoice"
import { todayIso } from "@/lib/domain/dates"
import type { EntryType } from "@/lib/domain/types"
import { validRates } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"

const ROLE_TEXT = {
  customer: "party.roleCustomer",
  supplier: "party.roleSupplier",
  both: "party.roleBoth",
} as const

/** Add a counterparty to the register, or change one (§8.27, §8.29). */
export function CustomerDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "customer") return null
  return (
    <CustomerForm
      customerId={dialog.customerId}
      role={dialog.role ?? "customer"}
    />
  )
}

function CustomerForm({
  customerId,
  role: newRole,
}: {
  customerId: string | null
  role: PartyRole
}) {
  const f = useFormatters()
  const customers = useBookStore((s) => s.customers)
  const cats = useBookStore((s) => s.cats)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const existing = customers.find((c) => c.id === customerId)

  const [party, setParty] = React.useState<Party>(() =>
    existing ? { ...existing } : emptyParty()
  )
  const [role, setRole] = React.useState<PartyRole>(existing?.role ?? newRole)
  const [language, setLanguage] = React.useState<InvoiceLang>(
    existing?.language ?? f.lang
  )
  const [term, setTerm] = React.useState(
    existing?.termDays == null ? "" : String(existing.termDays)
  )
  const [incomeCat, setIncomeCat] = React.useState(existing?.incomeCat ?? "")
  const [expenseCat, setExpenseCat] = React.useState(existing?.expenseCat ?? "")
  const [rate, setRate] = React.useState(
    existing?.vatRate == null ? "" : String(existing.vatRate)
  )
  const [iban, setIban] = React.useState(
    existing?.iban ? formatIban(existing.iban) : ""
  )
  const [showErrors, setShowErrors] = React.useState(false)
  const termId = React.useId()
  const ibanId = React.useId()

  const sells = role !== "supplier"
  const buys = role !== "customer"
  const nameMissing = party.name.trim() === ""
  const termValue = term.trim() === "" ? null : Number(term)
  const termBad =
    termValue !== null &&
    (!Number.isInteger(termValue) || termValue < 0 || termValue > 365)
  const ibanValue = iban.trim() === "" ? null : billIban(iban)
  const ibanBad = buys && iban.trim() !== "" && ibanValue === null

  /* Enabled categories on one side, plus the one already chosen. */
  const catOptions = (side: EntryType, chosen: string) => [
    { value: "", label: f.t("party.catNone") },
    ...cats
      .filter(
        (c) =>
          LINE_BY_KEY.get(c.line)?.side === side &&
          (c.enabled || c.id === chosen)
      )
      .map((c) => ({ value: c.id, label: f.catLabel(c) })),
  ]
  const rates = validRates(todayIso())
  const rateOptions = [
    { value: "", label: f.t("party.rateFromCategory") },
    ...[...new Set([...rates, ...(rate ? [Number(rate)] : [])])].map((r) => ({
      value: String(r),
      label: f.rate(r),
    })),
  ]

  const save = () => {
    if (nameMissing || termBad || ibanBad) {
      setShowErrors(true)
      return
    }
    const customer: Customer = {
      ...party,
      name: party.name.trim(),
      country: party.country.trim().toUpperCase() || "FI",
      vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
      id: existing?.id ?? uid(),
      role,
      language,
      termDays: termValue,
      incomeCat: sells && incomeCat ? incomeCat : null,
      expenseCat: buys && expenseCat ? expenseCat : null,
      vatRate: rate === "" ? null : Number(rate),
      ...(buys && ibanValue ? { iban: ibanValue } : {}),
    }
    setCustomers(
      existing
        ? customers.map((c) => (c.id === existing.id ? customer : c))
        : [...customers, customer]
    )
    closeDialog()
  }

  const vatIdBad = party.vatId.trim() !== "" && !looksLikeVatId(party.vatId)

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {f.t(
              role === "customer"
                ? existing
                  ? "invoice.editCustomer"
                  : "invoice.newCustomer"
                : role === "supplier"
                  ? existing
                    ? "party.editSupplier"
                    : "party.newSupplier"
                  : existing
                    ? "party.edit"
                    : "party.new"
            )}
          </DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>{f.t("party.role")}</FieldLabel>
          <OptionSelect
            label={f.t("party.role")}
            value={role}
            onChange={(v) => setRole(v as PartyRole)}
            options={PARTY_ROLES.map((r) => ({
              value: r,
              label: f.t(ROLE_TEXT[r]),
            }))}
          />
        </Field>
        <PartyFields
          value={party}
          onChange={setParty}
          nameError={
            showErrors && nameMissing
              ? f.t(
                  role === "customer"
                    ? "invoice.customerNeedsName"
                    : "party.needsName"
                )
              : undefined
          }
        />
        {vatIdBad ? (
          <p className="-mt-2 text-sm text-warning">{f.t("party.vatIdBad")}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {sells ? (
            <Field>
              <div className="flex min-h-6 items-center">
                <FieldLabel>{f.t("invoice.customerLanguage")}</FieldLabel>
              </div>
              <OptionSelect
                label={f.t("invoice.customerLanguage")}
                value={language}
                onChange={(v) => setLanguage(v as InvoiceLang)}
                options={[
                  { value: "fi", label: "Suomi" },
                  { value: "en", label: "English" },
                ]}
              />
            </Field>
          ) : null}
          <Field>
            <div className="flex min-h-6 items-center gap-1">
              <FieldLabel htmlFor={termId}>
                {f.t("invoice.customerTerm")}
              </FieldLabel>
              <InfoPopover label={f.t("invoice.customerTerm")}>
                {f.t(
                  role === "supplier"
                    ? "party.supplierTermHint"
                    : role === "both"
                      ? "party.bothTermHint"
                      : "invoice.customerTermHint"
                )}
              </InfoPopover>
            </div>
            <Input
              id={termId}
              inputMode="numeric"
              className="tabular"
              aria-invalid={(showErrors && termBad) || undefined}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </Field>
          {buys ? (
            <Field data-invalid={(showErrors && ibanBad) || undefined}>
              <div className="flex min-h-6 items-center">
                <FieldLabel htmlFor={ibanId}>{f.t("party.iban")}</FieldLabel>
              </div>
              <Input
                id={ibanId}
                autoComplete="off"
                spellCheck={false}
                className="tabular"
                aria-invalid={(showErrors && ibanBad) || undefined}
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
              />
              {showErrors && ibanBad ? (
                <FieldDescription className="text-destructive">
                  {f.t("entry.ibanBad")}
                </FieldDescription>
              ) : null}
            </Field>
          ) : null}
        </div>
        <FieldSet>
          <FieldLegend variant="label">{f.t("party.defaults")}</FieldLegend>
          <FieldDescription>{f.t("party.defaultsHint")}</FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2">
            {sells ? (
              <Field>
                <FieldLabel>{f.t("party.incomeCat")}</FieldLabel>
                <OptionSelect
                  label={f.t("party.incomeCat")}
                  value={incomeCat}
                  onChange={setIncomeCat}
                  options={catOptions("income", incomeCat)}
                />
              </Field>
            ) : null}
            {buys ? (
              <Field>
                <FieldLabel>{f.t("party.expenseCat")}</FieldLabel>
                <OptionSelect
                  label={f.t("party.expenseCat")}
                  value={expenseCat}
                  onChange={setExpenseCat}
                  options={catOptions("expense", expenseCat)}
                />
              </Field>
            ) : null}
            <Field>
              <FieldLabel>{f.t("party.vatRate")}</FieldLabel>
              <OptionSelect
                label={f.t("party.vatRate")}
                value={rate}
                onChange={setRate}
                options={rateOptions}
              />
            </Field>
          </div>
        </FieldSet>
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {f.t("common.cancel")}
          </Button>
          <Button onClick={save}>{f.t("invoice.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
