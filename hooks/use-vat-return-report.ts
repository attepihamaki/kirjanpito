"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { vatReturnReport, type ReportDoc } from "@/lib/domain/year-reports"
import { useBookStore } from "@/stores/book-store"

/**
 * The VAT return of the period on screen as a document (§8.7, §8.21): its
 * fields and the vouchers behind them. It is made on demand, since only the
 * buttons that attach or download it need it.
 */
export function useVatReturnReport(): () => ReportDoc {
  const f = useFormatters()
  const { current } = useVatPeriod()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const vatFiledFigures = useBookStore((s) => s.vatFiledFigures)
  const vatCash = useBookStore((s) => s.vatCash)

  return React.useCallback(
    () =>
      vatReturnReport(
        f,
        {
          entries,
          cats,
          businessName: businessName ?? "",
          businessId: businessId ?? "",
          vatFiled,
          vatFiledFigures,
          vatCash,
        },
        current
      ),
    [
      f,
      entries,
      cats,
      businessName,
      businessId,
      vatFiled,
      vatFiledFigures,
      vatCash,
      current,
    ]
  )
}
