import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { useTaxBasisEntries, useVatBasisEntries } from "@/hooks/use-tax-basis"
import { useVatPeriod } from "@/hooks/use-vat-period"
import {
  balanceContribution,
  figureRows,
  form5Selection,
  resultContribution,
  statementContribution,
  vatContribution,
  vatFieldSelector,
  type LineSelection,
} from "@/lib/domain/figure-vouchers"
import { filterPeriod, type Period } from "@/lib/domain/period"
import type { TaxFormField } from "@/lib/domain/tax-form"
import {
  indexCategories,
  type CategoryMap,
  type Cents,
  type Entry,
} from "@/lib/domain/types"
import type { VatReport } from "@/lib/domain/vat"
import type { Formatters } from "@/lib/i18n/create-formatters"
import { useBookStore, type FigureDrill } from "@/stores/book-store"

/** Which of an entry's amounts a figure column holds. */
export type AmountPart = "net" | "vat" | "gross"

const PART_LABEL = {
  net: "ledger.colNet",
  vat: "common.vat",
  gross: "ledger.colGross",
} as const satisfies Record<AmountPart, string>

/** What the pure builders read: the book as the views see it. */
export interface FigureEnv {
  f: Formatters
  entries: readonly Entry[]
  /** The entries as the income statement reads them (§6.3). */
  basis: readonly Entry[]
  cats: CategoryMap
}

/** The list for a VAT figure of one period. */
export function vatFigure(
  env: FigureEnv,
  o: {
    title: string
    period: Period
    periodLabel: string
    part: AmountPart
    figure: Cents
    select: (report: VatReport) => Cents
  }
): FigureDrill {
  return {
    title: o.title,
    subtitle: o.periodLabel,
    amountLabel: env.f.t(PART_LABEL[o.part]),
    figure: o.figure,
    rows: figureRows(
      filterPeriod(env.entries, o.period),
      vatContribution(env.cats, o.select)
    ),
  }
}

/** Form 5's year-end figures hold amounts typed in by hand, which no voucher stands behind. */
const TYPED_IN_CODES: ReadonlySet<number> = new Set([725, 749])

/** Whether a Form 5 field has vouchers behind it, without building the list. */
function hasForm5Vouchers(
  code: number,
  cats: CategoryMap,
  year: number
): boolean {
  return (
    code === 358 ||
    code === 359 ||
    form5Selection(code) !== null ||
    balanceContribution(code, cats, year) !== null
  )
}

/**
 * The list for a Form 5 field of `year`, or null for one with no vouchers
 * behind it: a statement line or portion, a total of them, or one of the
 * balance fields that come from vouchers (`balanceContribution`).
 */
export function form5Figure(
  env: FigureEnv,
  o: { code: number; title: string; figure: Cents; year: number }
): FigureDrill | null {
  const { f, cats } = env
  const subtitle = f.t("overview.range", {
    a: f.date(`${o.year}-01-01`),
    b: f.date(`${o.year}-12-31`),
  })
  const base = { title: o.title, subtitle, figure: o.figure }

  if (o.code === 358 || o.code === 359) {
    return {
      ...base,
      amountLabel: f.t(PART_LABEL.net),
      rows: figureRows(
        env.basis,
        resultContribution(cats, o.year, o.code === 359)
      ),
      differenceNote: f.t("common.figurePartNote"),
    }
  }
  const selection = form5Selection(o.code)
  if (selection) {
    return {
      ...base,
      amountLabel: f.t(PART_LABEL.net),
      rows: figureRows(
        env.basis,
        statementContribution(cats, o.year, selection)
      ),
      differenceNote: f.t("common.figurePartNote"),
    }
  }
  const balance = balanceContribution(o.code, cats, o.year)
  if (!balance) return null
  const gross = o.code === 711 || o.code === 725 || o.code === 749
  return {
    ...base,
    amountLabel: f.t(PART_LABEL[gross ? "gross" : "net"]),
    rows: figureRows(env.entries, balance),
    differenceNote: TYPED_IN_CODES.has(o.code)
      ? f.t("common.figureTypedNote")
      : f.t("common.figurePartNote"),
  }
}

/**
 * Opens the vouchers behind a VAT figure of the period on screen (§8.18). The
 * VAT view and the return dialog share the period, so both get the same list.
 * `select` reads the figure from a report, and the vouchers are those whose
 * own one-entry report adds to it.
 */
export function useVatDrill() {
  const f = useFormatters()
  const { period, label } = useVatPeriod()
  const entries = useVatBasisEntries()
  const cats = useBookStore((s) => s.cats)
  const openFigure = useBookStore((s) => s.openFigure)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  /** A callback for the figure, or null when there is nothing behind it. */
  const drill = React.useCallback(
    (o: {
      title: string
      part: AmountPart
      figure: Cents
      select: (report: VatReport) => Cents
    }): (() => void) | null => {
      if (o.figure === 0) return null
      return () =>
        openFigure(
          vatFigure(
            { f, entries, basis: entries, cats: catMap },
            { ...o, period, periodLabel: label }
          )
        )
    },
    [f, label, entries, period, catMap, openFigure]
  )

  /** The same for a field of the return, by its code. */
  const fieldDrill = React.useCallback(
    (row: TaxFormField, signedDue: Cents): (() => void) | null =>
      drill({
        title: `${row.code} ${row.label[f.lang]}`,
        // 308 reads a report's due, which is tax; the others are net or tax by field.
        part: vatFieldPart(row.code),
        figure: row.code === "308" ? signedDue : row.value,
        select: vatFieldSelector(row.code),
      }),
    [drill, f.lang]
  )

  return { drill, fieldDrill }
}

/** Whether a field of the return holds tax or an amount without it. */
export function vatFieldPart(code: string): AmountPart {
  return code === "308" || TAX_FIELDS.has(code) ? "vat" : "net"
}

/** The return's fields that hold tax rather than a turnover or purchase amount. */
const TAX_FIELDS: ReadonlySet<string> = new Set([
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "318",
])

/**
 * Opens the vouchers behind a figure of the selected year's income statement
 * or Form 5 (§8.18). The statement reads the entries by payment date (§6.3),
 * so the lists do too; the balance fields read the raw entries.
 */
export function useStatementDrill() {
  const f = useFormatters()
  const basis = useTaxBasisEntries()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const openFigure = useBookStore((s) => s.openFigure)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const env = React.useMemo(
    () => ({ f, entries, basis, cats: catMap }),
    [f, entries, basis, catMap]
  )

  /** A line, a section or a total of the statement. */
  const selectionDrill = React.useCallback(
    (title: string, figure: Cents, selection: LineSelection) =>
      figure === 0
        ? null
        : () =>
            openFigure({
              title,
              subtitle: f.t("overview.range", {
                a: f.date(`${year}-01-01`),
                b: f.date(`${year}-12-31`),
              }),
              amountLabel: f.t(PART_LABEL.net),
              figure,
              rows: figureRows(
                basis,
                statementContribution(catMap, year, selection)
              ),
              differenceNote: f.t("common.figurePartNote"),
            }),
    [f, basis, catMap, year, openFigure]
  )

  /** The statement's result, 358 or 359. */
  const resultDrill = React.useCallback(
    (title: string, figure: Cents, loss: boolean) =>
      figure === 0
        ? null
        : () =>
            openFigure(
              form5Figure(env, { code: loss ? 359 : 358, title, figure, year })!
            ),
    [env, year, openFigure]
  )

  /** A Form 5 field by its code, or null when it has no vouchers behind it. */
  const form5Drill = React.useCallback(
    (row: TaxFormField): (() => void) | null => {
      const code = Number(row.code)
      if (!row.value || !Number.isInteger(code)) return null
      // The rows are built on the click: the form asks for this on every render.
      if (!hasForm5Vouchers(code, catMap, year)) return null
      return () =>
        openFigure(
          form5Figure(env, {
            code,
            title: `${row.code} ${row.label[f.lang]}`,
            figure: row.value,
            year,
          })!
        )
    },
    [env, f.lang, catMap, year, openFigure]
  )

  return { selectionDrill, resultDrill, form5Drill }
}
