"use client"

import * as React from "react"

import { TaxForm, TaxFormStep } from "@/components/common/tax-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useFormatters } from "@/components/lang-provider"
import { VatAnomalyAlert } from "@/components/vat/vat-view"
import { VatFiledControl } from "@/components/vat/vat-filed-control"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { vatReturnSections } from "@/lib/domain/vat-return"

/**
 * The selected period as the fields of the VAT return (§8.7), so each amount
 * can be copied into OmaVero, the same way as Form 5 (§8.8). Marking the
 * period as filed is the form's last step.
 */
export function VatReturnView() {
  const f = useFormatters()
  const { label, report, current, currentStatus } = useVatPeriod()

  const sections = React.useMemo(() => vatReturnSections(report), [report])
  const unfiled = currentStatus === "open" || currentStatus === "future"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <VatAnomalyAlert report={report} />
      {report.sales.other.vat !== 0 ? (
        <Alert>
          <AlertDescription>
            {f.t("vat.returnOtherRate", { v: f.money(report.sales.other.vat) })}
          </AlertDescription>
        </Alert>
      ) : null}

      <TaxForm
        key={current.key}
        kicker={f.t("vat.returnKicker", { p: label, d: f.date(current.due) })}
        title={f.t("vat.returnTitle")}
        intro={f.t("vat.returnIntro")}
        nothing={f.t("vat.returnNothing")}
        sections={sections}
        notes={[f.t("vat.returnPurchases"), f.t("vat.returnCodes")]}
      >
        <section className="print-hidden flex flex-col gap-3">
          <TaxFormStep step={3}>{f.t("vat.returnStepFile")}</TaxFormStep>
          <div className="ml-[2.125rem] flex flex-wrap items-start justify-between gap-3">
            {currentStatus !== "before" ? (
              <p className="max-w-sm text-sm text-muted-foreground">
                {unfiled
                  ? f.t("vat.returnNotClosed", { d: f.date(current.due) })
                  : f.t("vat.returnFileHint")}
              </p>
            ) : null}
            <VatFiledControl />
          </div>
        </section>
      </TaxForm>
    </div>
  )
}
