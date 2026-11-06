import type { Cents } from "@/lib/domain/types"
import type { VatReport } from "@/lib/domain/vat"
import { vatReturnSections } from "@/lib/domain/vat-return"

/**
 * What the book keeps about a VAT return when it is marked filed (§6.5): the
 * figures it held on that day, so a later change to a voucher can be seen
 * against what OmaVero was given, and where the tax is to be paid.
 */

/** Field code → amount, as the return had it on the day it was marked filed. */
export type FiledFigures = Readonly<Record<string, Cents>>

/**
 * Where VAT is paid, from OmaVero: the tax account's IBAN and the reference
 * number. Both are the user's own text; the book never checks or sends them.
 */
export interface TaxPayment {
  iban: string
  reference: string
}

export const NO_TAX_PAYMENT: TaxPayment = { iban: "", reference: "" }

/**
 * The non-zero fields of a report, by code. 308 is the signed balance, so a
 * refund keeps its minus and a change from payable to refundable shows.
 */
export function filingFigures(report: VatReport): FiledFigures {
  const out: Record<string, Cents> = {}
  for (const section of vatReturnSections(report)) {
    for (const row of section.rows) {
      if (row.kind === "field" && row.value !== 0) out[row.code] = row.value
    }
  }
  if (report.due !== 0) out["308"] = report.due
  else delete out["308"]
  return out
}

export interface FigureChange {
  code: string
  /** Both languages, as the return names the field. */
  label: { fi: string; en: string }
  filed: Cents
  now: Cents
}

/**
 * The fields whose amount differs from what was filed, in the order of the
 * return. Empty when the book still agrees with the return as it was sent.
 */
export function figureChanges(
  filed: FiledFigures,
  report: VatReport
): FigureChange[] {
  const now = filingFigures(report)
  const out: FigureChange[] = []
  const seen = new Set<string>()
  for (const section of vatReturnSections(report)) {
    for (const row of section.rows) {
      if (row.kind !== "field") continue
      seen.add(row.code)
      const before = filed[row.code] ?? 0
      const after = now[row.code] ?? 0
      if (before !== after) {
        out.push({
          code: row.code,
          label: row.label,
          filed: before,
          now: after,
        })
      }
    }
  }
  /* A field that held an amount and is no longer on the return at all. */
  for (const [code, before] of Object.entries(filed)) {
    if (!seen.has(code) && before !== 0) {
      out.push({ code, label: { fi: code, en: code }, filed: before, now: 0 })
    }
  }
  return out
}
