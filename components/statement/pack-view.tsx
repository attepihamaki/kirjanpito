"use client"

import * as React from "react"

import { useDescribeFinding } from "@/components/check/use-describe-finding"
import { BusinessLine } from "@/components/common/business-line"
import { CheckRow } from "@/components/common/check-row"
import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { useForm5 } from "@/components/statement/use-form5"
import { useToday } from "@/hooks/use-today"
import { bookCheck } from "@/lib/domain/book-check"
import { filledSections, packFindings, vatYear } from "@/lib/domain/tax-pack"
import { indexCategories } from "@/lib/domain/types"
import { periodLabel } from "@/lib/i18n/period-label"
import { useBookStore } from "@/stores/book-store"

const HEADING = "pt-5 pb-1 text-left font-heading text-[0.95rem] font-semibold"

/**
 * The yearly tax return pack (§8.8): Form 5's filled fields, the year's VAT by
 * filing period and the open questions, as one sheet that prints without the
 * app's chrome.
 */
export function PackView() {
  const f = useFormatters()
  const today = useToday()
  const describe = useDescribeFinding()
  const { year, sections } = useForm5()

  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const dirty = useBookStore((s) => s.dirty)
  const traderType = useBookStore((s) => s.traderType)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const changeLog = useBookStore((s) => s.changeLog)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const yearEnd = useBookStore((s) => s.yearEnd)
  const filed = useBookStore((s) => s.form5Filed[String(year)])

  const form5 = React.useMemo(() => filledSections(sections), [sections])
  const vat = React.useMemo(
    () => vatYear({ entries, cats, year, vatPeriod, bookStart, vatFiled }),
    [entries, cats, year, vatPeriod, bookStart, vatFiled]
  )
  const findings = React.useMemo(
    () =>
      packFindings(
        bookCheck({
          entries,
          cats: indexCategories(cats),
          today,
          dirty,
          traderType,
          vatPeriod,
          bookStart,
          vatFiled,
          changeLog,
          assetOpening,
          loanOpening,
          yearEnd,
        }),
        year
      ),
    [
      entries,
      cats,
      today,
      dirty,
      traderType,
      vatPeriod,
      bookStart,
      vatFiled,
      changeLog,
      assetOpening,
      loanOpening,
      yearEnd,
      year,
    ]
  )

  return (
    <div className="print-sheet max-w-3xl rounded-lg border border-sheet-edge bg-sheet p-6 shadow-sm md:p-8">
      <header className="mb-4">
        <h2 className="font-heading text-xl font-semibold">
          {f.t("statement.packTitle", { y: year })}
        </h2>
        <BusinessLine />
        <p className="tabular text-sm text-muted-foreground">
          {f.t("overview.range", {
            a: f.date(`${year}-01-01`),
            b: f.date(`${year}-12-31`),
          })}
          {filed
            ? ` · ${f.t("statement.packForm5Filed", { d: f.date(filed) })}`
            : ""}
        </p>
      </header>

      <section aria-labelledby="pack-form5">
        <h3 id="pack-form5" className={HEADING}>
          {f.t("statement.packForm5")}
        </h3>
        {form5.length ? (
          <table className="w-full text-sm">
            <tbody>
              {form5.map((section) => (
                <React.Fragment key={`${section.number}-${section.title.fi}`}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={3}
                      className="pt-3 pb-1 text-left text-xs font-normal tracking-wide text-muted-foreground"
                    >
                      {section.number ? `${section.number} ` : ""}
                      {section.title[f.lang]}
                    </th>
                  </tr>
                  {section.rows.map((row) =>
                    row.kind === "field" ? (
                      <tr
                        key={row.code}
                        className="border-b border-dashed border-sheet-edge/60"
                      >
                        <td
                          className={
                            row.portion
                              ? "tabular w-14 py-1 pl-3 text-muted-foreground"
                              : "tabular w-14 py-1 text-muted-foreground"
                          }
                        >
                          {row.code}
                        </td>
                        <td
                          className={row.total ? "py-1 font-semibold" : "py-1"}
                        >
                          {row.label[f.lang]}
                        </td>
                        <td
                          className={
                            row.total
                              ? "py-1 text-right font-semibold"
                              : "py-1 text-right"
                          }
                        >
                          <Money cents={row.value} />
                        </td>
                      </tr>
                    ) : null
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("statement.packNoForm5")}
          </p>
        )}
      </section>

      <section aria-labelledby="pack-vat">
        <h3 id="pack-vat" className={HEADING}>
          {f.t("statement.packVat")}
        </h3>
        {vat.rows.length ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="py-1 text-left font-normal">
                    {f.t("statement.packVatPeriod")}
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    {f.t("statement.packVatTax")}
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    {f.t("statement.packVatDeductible")}
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    {f.t("statement.packVatDue")}
                  </th>
                  <th scope="col" className="py-1 pl-4 text-left font-normal">
                    {f.t("statement.packVatStatus")}
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
                        ? f.t("statement.packVatFiledOn", {
                            d: f.date(row.filed),
                          })
                        : f.t("statement.packVatNotFiled", {
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
              {f.t("statement.packVatNote")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("statement.packNoVat")}
          </p>
        )}
      </section>

      <section aria-labelledby="pack-open">
        <h3 id="pack-open" className={HEADING}>
          {f.t("statement.packOpen")}
        </h3>
        {findings.length ? (
          <ul className="divide-y rounded-lg border border-sheet-edge">
            {findings.map((b, i) => {
              const d = describe(b)
              return (
                <CheckRow
                  key={`${b.set}-${b.finding.ruleId}-${i}`}
                  severity={b.finding.severity}
                  title={d.title}
                  sub={d.sub}
                  action={<span className="print-hidden">{d.action}</span>}
                />
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("statement.packNoOpen")}
          </p>
        )}
      </section>

      <p className="mt-6 border-t border-sheet-edge pt-3 text-xs text-muted-foreground">
        {f.t("landing.footer")}
      </p>
    </div>
  )
}
