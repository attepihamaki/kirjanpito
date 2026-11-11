"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { PrintButton } from "@/components/common/print-button"
import {
  SectionTabs,
  useSectionHeading,
} from "@/components/common/sub-page-tabs"
import { VatPeriodStrip } from "@/components/vat/vat-period-strip"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { ecSales } from "@/lib/domain/ec-sales"
import { indexCategories } from "@/lib/domain/types"
import { VAT_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The title, the sub-page tabs and the period strip (§8.7). The calculation
 * and the return dialog follow the one selected period.
 */
export function VatShell({ children }: { children: React.ReactNode }) {
  const setIndex = useBookStore((s) => s.setVatIndex)
  const { mode, label, periods, statuses, current } = useVatPeriod()
  const year = useBookStore((s) => s.year)
  const heading = useSectionHeading("vat")
  // The EC Sales List is monthly whatever the VAT period is (§8.7).
  const monthlyList = usePathname().replace(/\/$/, "") === VAT_ROUTES.ec
  // An empty list has nothing to print (§8.7).
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const customers = useBookStore((s) => s.customers)
  const ecEmpty = React.useMemo(
    () =>
      monthlyList &&
      ecSales(entries, indexCategories(cats), year, customers).length === 0,
    [monthlyList, entries, cats, year, customers]
  )

  return (
    <>
      <PageHeader
        {...heading}
        subtitle={monthlyList ? String(year) : label}
        actions={<PrintButton disabled={monthlyList && ecEmpty} />}
      />
      <div className="print-hidden">
        <SectionTabs section="vat" />
        {mode !== "year" && !monthlyList ? (
          <div className="mb-5">
            <VatPeriodStrip
              periods={periods}
              selected={current.index}
              statuses={statuses}
              onSelect={setIndex}
            />
          </div>
        ) : null}
      </div>
      {children}
    </>
  )
}
