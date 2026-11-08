"use client"

import * as React from "react"

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
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { uid } from "@/lib/domain/id"
import {
  emptyParty,
  type Customer,
  type InvoiceLang,
  type Party,
} from "@/lib/domain/invoice"
import { useBookStore } from "@/stores/book-store"

/** Add a customer to the register, or change one (§8.27). */
export function CustomerDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "customer") return null
  return <CustomerForm customerId={dialog.customerId} />
}

function CustomerForm({ customerId }: { customerId: string | null }) {
  const f = useFormatters()
  const customers = useBookStore((s) => s.customers)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const existing = customers.find((c) => c.id === customerId)

  const [party, setParty] = React.useState<Party>(() =>
    existing ? { ...existing } : emptyParty()
  )
  const [language, setLanguage] = React.useState<InvoiceLang>(
    existing?.language ?? f.lang
  )
  const [term, setTerm] = React.useState(
    existing?.termDays == null ? "" : String(existing.termDays)
  )
  const [showErrors, setShowErrors] = React.useState(false)
  const termId = React.useId()

  const nameMissing = party.name.trim() === ""
  const termValue = term.trim() === "" ? null : Number(term)
  const termBad =
    termValue !== null &&
    (!Number.isInteger(termValue) || termValue < 0 || termValue > 365)

  const save = () => {
    if (nameMissing || termBad) {
      setShowErrors(true)
      return
    }
    const customer: Customer = {
      ...party,
      name: party.name.trim(),
      country: party.country.trim().toUpperCase() || "FI",
      vatId: party.vatId.replace(/\s/g, "").toUpperCase(),
      id: existing?.id ?? uid(),
      language,
      termDays: termValue,
    }
    setCustomers(
      existing
        ? customers.map((c) => (c.id === existing.id ? customer : c))
        : [...customers, customer]
    )
    closeDialog()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing
              ? f.t("invoice.editCustomer")
              : f.t("invoice.newCustomer")}
          </DialogTitle>
        </DialogHeader>
        <PartyFields
          value={party}
          onChange={setParty}
          invalidName={showErrors && nameMissing}
        />
        {showErrors && nameMissing ? (
          <FieldError>{f.t("invoice.customerNeedsName")}</FieldError>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Field className="w-44">
            <FieldLabel>{f.t("invoice.customerLanguage")}</FieldLabel>
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
          <Field className="w-40">
            <FieldLabel htmlFor={termId}>
              {f.t("invoice.customerTerm")}
            </FieldLabel>
            <Input
              id={termId}
              inputMode="numeric"
              className="tabular"
              aria-invalid={(showErrors && termBad) || undefined}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <FieldDescription>
              {f.t("invoice.customerTermHint")}
            </FieldDescription>
          </Field>
        </div>
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
