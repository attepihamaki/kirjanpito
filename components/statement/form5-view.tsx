"use client"

import * as React from "react"

import { TaxForm } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { form5Sections } from "@/lib/domain/form5"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"
import { useTaxBasisEntries } from "@/hooks/use-tax-basis"
import { useBookStore } from "@/stores/book-store"

/**
 * The year's figures as Form 5's fields (§8.8), in the form's order and with
 * its labels, so each one can be copied into OmaVero by its code. The sheet
 * groups the same figures by heading instead; the codes are what match.
 */
export function Form5View() {
  const f = useFormatters()
  const basis = useTaxBasisEntries()
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const sections = React.useMemo(
    () => form5Sections(incomeStatement(basis, indexCategories(cats), year)),
    [basis, cats, year]
  )

  return (
    <TaxForm
      kicker={f.t("statement.form5Kicker", { y: String(year) })}
      title={f.t("statement.form5Title")}
      intro={f.t("statement.form5Intro")}
      nothing={f.t("statement.form5Nothing")}
      sections={sections}
      notes={[
        f.t("statement.form5Assumed"),
        f.t("statement.form5Missing"),
        f.t("statement.form5Payroll"),
      ]}
    />
  )
}
