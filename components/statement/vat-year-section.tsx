"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { vatYear } from "@/lib/domain/vat-year"
import { periodLabel } from "@/lib/i18n/period-label"
import { useBookStore } from "@/stores/book-store"

/**
 * The selected year's VAT by filing period (§8.8), under the income statement:
 * the tax, the deductible tax (307), the tax payable or refundable (308) and
 * the filed mark or due date, with a year total. Renders nothing when no period
 * of the year has a voucher on the return.
 */
export function VatYearSection() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)

  const vat = React.useMemo(
    () => vatYear({ entries, cats, year, vatPeriod, bookStart, vatFiled }),
    [entries, cats, year, vatPeriod, bookStart, vatFiled]
  )
  if (!vat.rows.length) return null

  return (
    <section aria-labelledby="statement-vat" className="mt-6">
      <h3
        id="statement-vat"
        className="pb-1 text-left font-heading text-[0.95rem] font-semibold"
      >
        {f.t("statement.vatYear")}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-1 text-left font-normal">
              {f.t("statement.vatYearPeriod")}
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              {f.t("statement.vatYearTax")}
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              {f.t("statement.vatYearDeductible")}
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              {f.t("statement.vatYearDue")}
            </th>
            <th scope="col" className="py-1 pl-4 text-left font-normal">
              {f.t("statement.vatYearStatus")}
            </th>
          </tr>
        </thead>
        <tbody>
          {vat.rows.map((row) => (
            <tr
              key={row.period.key}
              className="border-b border-dashed border-sheet-edge/60"
            >
              <td className="py-1">{periodLabel(f, row.period)}</td>
              <td className="py-1 text-right">
                <Money cents={row.tax} />
              </td>
              <td className="py-1 text-right">
                <Money cents={row.deductible} />
              </td>
              <td className="py-1 text-right">
                <Money cents={row.due} />
              </td>
              <td className="py-1 pl-4 text-xs text-muted-foreground">
                {row.filed
                  ? f.t("statement.vatYearFiledOn", { d: f.date(row.filed) })
                  : f.t("statement.vatYearNotFiled", {
                      d: f.date(row.period.due),
                    })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="py-1.5 text-left">
              {f.t("common.total")}
            </th>
            <td className="py-1.5 text-right">
              <Money cents={vat.total.tax} />
            </td>
            <td className="py-1.5 text-right">
              <Money cents={vat.total.deductible} />
            </td>
            <td className="py-1.5 text-right">
              <Money cents={vat.total.due} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        {f.t("statement.vatYearNote")}
      </p>
    </section>
  )
}
