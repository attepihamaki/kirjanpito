"use client"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useFormatters } from "@/components/lang-provider"
import { VatPeriodStrip } from "@/components/vat/vat-period-strip"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { VAT_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The title, the sub-page tabs and the period strip shared by the calculation
 * and the return (§8.7), so both follow one selected period.
 */
export function VatShell({ children }: { children: React.ReactNode }) {
  const f = useFormatters()
  const setIndex = useBookStore((s) => s.setVatIndex)
  const { mode, label, periods, statuses, current } = useVatPeriod()

  return (
    <>
      <PageHeader title={f.t("nav.vat")} subtitle={label} />
      <div className="print-hidden">
        <SubPageTabs
          label={f.t("vat.sections")}
          tabs={[
            { href: VAT_ROUTES.sheet, label: f.t("vat.sheetTab") },
            { href: VAT_ROUTES.return, label: f.t("vat.returnTab") },
          ]}
        />
        {mode !== "year" ? (
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
