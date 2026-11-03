"use client"

import { CheckIcon } from "lucide-react"

import { TaxFormStep } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { todayIso, yearOf } from "@/lib/domain/dates"
import { useBookStore } from "@/stores/book-store"

/**
 * The filed toggle for the selected year's Form 5 (§8.8). Marking it locks every
 * voucher of the year (§8.11). A year still running cannot have been filed.
 */
export function Form5FiledControl({ step }: { step: number }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const filedOn = useBookStore((s) => s.form5Filed[String(year)])
  const setForm5Filed = useBookStore((s) => s.setForm5Filed)
  const today = todayIso()

  if (year >= yearOf(today)) return null

  return (
    <>
      <TaxFormStep step={step} filled={!!filedOn}>
        {f.t("statement.form5FileStep")}
      </TaxFormStep>
      <div className="ml-[2.125rem] flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-sm text-sm text-muted-foreground">
          {filedOn
            ? f.t("statement.form5FiledOn", { d: f.date(filedOn) })
            : f.t("statement.form5FileHint", { y: year })}
        </p>
        {filedOn ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setForm5Filed(year, null)}
          >
            {f.t("vat.unmarkFiled")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm5Filed(year, today)}
          >
            <CheckIcon data-icon="inline-start" />
            {f.t("vat.markFiled")}
          </Button>
        )}
      </div>
    </>
  )
}
