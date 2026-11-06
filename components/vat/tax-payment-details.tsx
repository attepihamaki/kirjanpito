"use client"

import * as React from "react"
import { CopyIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useBookStore } from "@/stores/book-store"

/**
 * Where the tax is paid (§8.7): the tax account's IBAN and the reference
 * number from OmaVero, kept in the book's settings so they can be copied into
 * the bank when a payment is due. The app only stores the text. A refund is
 * paid to the trader's own account, so it shows none of this.
 */
export function TaxPaymentDetails({ due }: { due: number }) {
  const f = useFormatters()
  const payment = useBookStore((s) => s.taxPayment)
  const setTaxPayment = useBookStore((s) => s.setTaxPayment)
  const empty = !payment.iban && !payment.reference
  const [editing, setEditing] = React.useState(false)
  const [iban, setIban] = React.useState(payment.iban)
  const [reference, setReference] = React.useState(payment.reference)

  if (due <= 0) return null

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      toast.add({ title: f.t("common.formCopyFailed") })
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    setTaxPayment({ iban: iban.trim(), reference: reference.trim() })
    setEditing(false)
  }

  return (
    <section
      aria-label={f.t("vat.payTitle")}
      className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium">{f.t("vat.payTitle")}</h4>
        {editing ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIban(payment.iban)
              setReference(payment.reference)
              setEditing(true)
            }}
          >
            {f.t("vat.payEdit")}
          </Button>
        )}
      </div>

      {editing ? (
        <form className="flex flex-col gap-3" onSubmit={save}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tax-iban" className="font-medium">
              {f.t("vat.payIban")}
            </label>
            <Input
              id="tax-iban"
              value={iban}
              maxLength={64}
              autoComplete="off"
              onChange={(event) => setIban(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tax-reference" className="font-medium">
              {f.t("vat.payReference")}
            </label>
            <Input
              id="tax-reference"
              value={reference}
              maxLength={64}
              autoComplete="off"
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{f.t("vat.payHint")}</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {f.t("common.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {f.t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : empty ? (
        <p className="text-muted-foreground">{f.t("vat.payNone")}</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1">
          {(
            [
              ["vat.payIban", payment.iban],
              ["vat.payReference", payment.reference],
            ] as const
          ).map(([key, value]) =>
            value ? (
              <React.Fragment key={key}>
                <dt className="text-muted-foreground">{f.t(key)}</dt>
                <dd className="font-mono tabular-nums">{value}</dd>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${f.t("vat.payCopy")}: ${f.t(key)}`}
                  onClick={() => void copy(value)}
                >
                  <CopyIcon />
                </Button>
              </React.Fragment>
            ) : null
          )}
        </dl>
      )}
    </section>
  )
}
