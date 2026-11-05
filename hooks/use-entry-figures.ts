import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import {
  form5Figure,
  vatFieldPart,
  vatFigure,
  type FigureEnv,
} from "@/hooks/use-figure-drill"
import { useStatementOptions, useTaxBasisEntries } from "@/hooks/use-tax-basis"
import {
  entryFigureRefs,
  vatFieldSelector,
  type FigureRef,
} from "@/lib/domain/figure-vouchers"
import { form5Sections } from "@/lib/domain/form5"
import {
  EMPTY_YEAR_END,
  form5Balance,
  form5BalanceSections,
} from "@/lib/domain/form5-balance"
import { incomeStatement } from "@/lib/domain/income-statement"
import { filterPeriod } from "@/lib/domain/period"
import type { TaxFormSection } from "@/lib/domain/tax-form"
import { indexCategories, type Cents } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { periodContaining } from "@/lib/domain/vat-deadline"
import { vatReturnSections } from "@/lib/domain/vat-return"
import { periodLabel } from "@/lib/i18n/period-label"
import { useBookStore } from "@/stores/book-store"

export interface EntryFigureItem {
  key: string
  code: string
  label: string
  /** What this voucher adds to the field. */
  amount: Cents
  open: () => void
}

export interface EntryFigureGroup {
  heading: string
  items: EntryFigureItem[]
}

type Fields = Map<string, { label: string; value: Cents }>

/** The label and value of every field in `sections`, by code. */
function fieldsOf(
  sections: readonly TaxFormSection[],
  lang: "fi" | "en"
): Fields {
  const out: Fields = new Map()
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind === "field") {
        out.set(row.code, { label: row.label[lang], value: row.value })
      }
    }
  }
  return out
}

/**
 * Where a saved voucher counts (§8.18): the VAT return field and Form 5 fields
 * it adds to, found with the same contributions as the lists they open. This is
 * the way back that KPL 2:6 asks for beside the list behind a figure.
 */
export function useEntryFigures(entryId: string | undefined) {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const trader = useBookStore((s) => s.traderType)
  const yearEnd = useBookStore((s) => s.yearEnd)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const openFigure = useBookStore((s) => s.openFigure)
  const basis = useTaxBasisEntries()
  const options = useStatementOptions()
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const entry = React.useMemo(
    () => entries.find((e) => e.id === entryId),
    [entries, entryId]
  )

  return React.useMemo((): EntryFigureGroup[] => {
    if (!entry) return []
    const env: FigureEnv = { f, entries, basis, cats: catMap }
    const refs = entryFigureRefs(entry, catMap, {
      vatPeriod,
      trader,
      years: [year],
    })

    const groups = new Map<string, EntryFigureGroup>()
    const group = (heading: string) => {
      let g = groups.get(heading)
      if (!g) groups.set(heading, (g = { heading, items: [] }))
      return g
    }
    const vatFields = new Map<string, Fields>()
    const form5Fields = new Map<number, Fields>()

    const vatItem = (ref: Extract<FigureRef, { kind: "vat" }>) => {
      const p = periodContaining(vatPeriod, entry.date)
      const heading = f.t("entry.figuresVat", { p: periodLabel(f, p) })
      let fields = vatFields.get(p.key)
      if (!fields) {
        const report = vatReport(filterPeriod(entries, ref.period), catMap)
        fields = fieldsOf(vatReturnSections(report), f.lang)
        vatFields.set(p.key, fields)
      }
      const field = fields.get(ref.code)
      const label = field?.label ?? ref.code
      group(heading).items.push({
        key: `${p.key}-${ref.code}`,
        code: ref.code,
        label,
        amount: ref.amount,
        open: () =>
          openFigure(
            vatFigure(env, {
              title: `${ref.code} ${label}`,
              period: ref.period,
              periodLabel: periodLabel(f, p),
              part: vatFieldPart(ref.code),
              figure: field?.value ?? ref.amount,
              select: vatFieldSelector(ref.code),
            })
          ),
      })
    }

    const form5Item = (ref: Extract<FigureRef, { kind: "form5" }>) => {
      let fields = form5Fields.get(ref.year)
      if (!fields) {
        const ye = yearEnd[ref.year] ?? EMPTY_YEAR_END
        const statement = incomeStatement(basis, catMap, ref.year, options)
        const balance = form5Balance({
          entries,
          cats: catMap,
          year: ref.year,
          yearEnd: ye,
          assetOpening,
          loanOpening,
        })
        fields = fieldsOf(
          [...form5Sections(statement), ...form5BalanceSections(balance, ye)],
          f.lang
        )
        form5Fields.set(ref.year, fields)
      }
      const code = String(ref.code)
      const field = fields.get(code)
      const label = field?.label ?? code
      group(f.t("entry.figuresForm5", { y: ref.year })).items.push({
        key: `${ref.year}-${code}`,
        code,
        label,
        amount: ref.amount,
        open: () => {
          const drill = form5Figure(env, {
            code: ref.code,
            title: `${code} ${label}`,
            figure: field?.value ?? ref.amount,
            year: ref.year,
          })
          if (drill) openFigure(drill)
        },
      })
    }

    for (const ref of refs) {
      if (ref.kind === "vat") vatItem(ref)
      else form5Item(ref)
    }
    return [...groups.values()]
  }, [
    entry,
    entries,
    basis,
    catMap,
    f,
    year,
    vatPeriod,
    trader,
    yearEnd,
    assetOpening,
    loanOpening,
    options,
    openFigure,
  ])
}
