"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { InvoiceLang, InvoiceRow } from "@/lib/domain/invoice"
import {
  isMarkup,
  rebillCandidates,
  rebillCost,
  rebillRow,
} from "@/lib/domain/invoice-rebill"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/** How many expenses the list shows at once; the search narrows the rest. */
const SHOWN = 60

/**
 * Pick booked expenses to bill on to the customer (§8.27). Each becomes a row
 * at its cost without VAT plus the markup, on the invoice's sales category
 * and rate, since a re-billed cost is part of the sale's price. An expense
 * another invoice bills, or a row of this one already has, is not offered.
 */
export function RebillPicker({
  invoiceId,
  taken,
  sale,
  language,
  onAdd,
  onClose,
}: {
  invoiceId: string
  /** Entries a row of the open invoice already bills. */
  taken: ReadonlySet<string>
  /** The category and rate the rows start with. */
  sale: { id: string; vatRate: number }
  language: InvoiceLang
  onAdd: (rows: InvoiceRow[]) => void
  onClose: () => void
}) {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const invoices = useBookStore((s) => s.invoices)
  const [query, setQuery] = React.useState("")
  const [markup, setMarkup] = React.useState("")
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(new Set())
  const ids = { query: React.useId(), markup: React.useId() }

  const candidates = React.useMemo(
    () =>
      rebillCandidates(
        entries,
        indexCategories(cats),
        invoices,
        invoiceId
      ).filter((e) => !taken.has(e.id)),
    [entries, cats, invoices, invoiceId, taken]
  )
  const needle = query.trim().toLocaleLowerCase("fi")
  const matching = needle
    ? candidates.filter((e) =>
        e.description.toLocaleLowerCase("fi").includes(needle)
      )
    : candidates
  /* An empty field is no markup; a comma or a point is the decimal mark. */
  const markupValue =
    markup.trim() === "" ? 0 : Number(markup.trim().replace(",", "."))
  const markupBad = !isMarkup(markupValue)

  const toggle = (id: string, on: boolean) =>
    setPicked((now) => {
      const next = new Set(now)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const add = () => {
    if (markupBad) return
    const rows = candidates
      .filter((e) => picked.has(e.id))
      .reverse()
      .map((e) => rebillRow(e, sale, markupValue, language))
    onAdd(rows)
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-48 flex-1">
          <FieldLabel htmlFor={ids.query}>
            {f.t("invoice.rebillSearch")}
          </FieldLabel>
          <Input
            id={ids.query}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field className="w-28">
          <FieldLabel htmlFor={ids.markup}>
            {f.t("invoice.rebillMarkup")}
          </FieldLabel>
          <Input
            id={ids.markup}
            inputMode="decimal"
            className="tabular text-right"
            aria-invalid={markupBad || undefined}
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
          />
        </Field>
      </div>
      {markupBad ? (
        <FieldError>{f.t("invoice.rebillMarkupBad")}</FieldError>
      ) : null}
      {matching.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {f.t(
            candidates.length === 0
              ? "invoice.rebillNone"
              : "invoice.rebillNoMatch"
          )}
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col overflow-y-auto rounded-md border">
          {matching.slice(0, SHOWN).map((e) => (
            <li key={e.id} className="border-b last:border-b-0">
              <label className="flex items-center gap-3 px-3 py-2 text-sm">
                <Checkbox
                  checked={picked.has(e.id)}
                  onCheckedChange={(v) => toggle(e.id, v === true)}
                />
                <span className="tabular w-24 shrink-0 text-muted-foreground">
                  {f.date(e.date)}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.description}</span>
                <span className="tabular shrink-0">
                  <Money cents={rebillCost(e)} />
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <FieldDescription>{f.t("invoice.rebillHint")}</FieldDescription>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {f.t("common.cancel")}
        </Button>
        <Button
          size="sm"
          disabled={picked.size === 0 || markupBad}
          onClick={add}
        >
          {f.t("invoice.rebillAdd", { n: picked.size })}
        </Button>
      </div>
    </section>
  )
}
