"use client"

import * as React from "react"

import { ButtonLink } from "@/components/common/button-link"
import { TaxForm, TaxFormStep } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { Form5FiledControl } from "@/components/statement/form5-filed-control"
import { form5Sections } from "@/lib/domain/form5"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
} from "@/lib/domain/form5-balance"
import { incomeStatement } from "@/lib/domain/income-statement"
import { STATEMENT_ROUTES } from "@/lib/site"
import { indexCategories } from "@/lib/domain/types"
import { useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

/**
 * The year's figures as Form 5's fields (§8.8), in the form's order and with
 * its labels, so each one can be copied into OmaVero by its code. The sheet
 * groups the same figures by heading instead; the codes are what match.
 *
 * The form's assets, liabilities and wages follow the income and expenses, so
 * one checklist covers everything the app fills. Their year-end figures are
 * typed in on the Varat ja velat tab.
 */
export function Form5View() {
  const f = useFormatters()
  const basis = useTaxBasisEntries()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const yearEnd = useBookStore((s) => s.yearEnd[year]) ?? EMPTY_YEAR_END
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)

  const balance = React.useMemo(
    () =>
      form5Balance({
        entries,
        cats: indexCategories(cats),
        year,
        yearEnd,
        assetOpening,
        loanOpening,
      }),
    [entries, cats, year, yearEnd, assetOpening, loanOpening]
  )
  const sections = React.useMemo(
    () => [
      ...form5Sections(incomeStatement(basis, indexCategories(cats), year)),
      ...form5BalanceSections(balance, yearEnd),
    ],
    [basis, cats, year, balance, yearEnd]
  )

  return (
    <TaxForm
      key={year}
      kicker={f.t("statement.form5Kicker", { y: String(year) })}
      title={f.t("statement.form5Title")}
      intro={f.t("statement.form5Intro")}
      nothing={f.t("statement.form5Nothing")}
      sections={sections}
      notes={[
        f.t("statement.form5Assumed"),
        f.t("statement.form5Missing"),
        f.t("balance.notBank"),
        f.t("balance.missing"),
        f.t("statement.form5Payroll"),
      ]}
    >
      <section className="flex flex-col gap-3">
        <TaxFormStep step={3}>{f.t("balance.figuresTitle")}</TaxFormStep>
        <div className="ml-[2.125rem] flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            {f.t("balance.intro")}{" "}
            {f.t("balance.figures", {
              r: f.money(balance.receivables),
              p: f.money(balance.payables),
              l: f.money(balance.loans),
              m: f.money(balance.machinery),
            })}
          </p>
          <ButtonLink
            href={STATEMENT_ROUTES.balance}
            variant="outline"
            size="sm"
            className="print-hidden"
          >
            {f.t("balance.editFigures")}
          </ButtonLink>
        </div>
      </section>
      <Form5FiledControl step={4} />
    </TaxForm>
  )
}
