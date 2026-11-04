"use client"

import { MarkFiledButton } from "@/components/common/mark-filed-button"
import { TaxFormStep } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { todayIso, yearOf } from "@/lib/domain/dates"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The filed toggle for the selected year's Form 5 (§8.8), with what it does.
 * Marking it locks every voucher of the year (§8.11). A year still running
 * cannot have been filed, so its button only says so.
 */
export function Form5FiledToggle({ className }: { className?: string }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const filedOn = useBookStore((s) => s.form5Filed[String(year)])
  const setForm5Filed = useBookStore((s) => s.setForm5Filed)
  const today = todayIso()

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className
      )}
    >
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
        <MarkFiledButton
          ongoing={
            year >= yearOf(today)
              ? f.t("statement.yearOngoing", { y: year })
              : undefined
          }
          onMark={() => setForm5Filed(year, today)}
        />
      )}
    </div>
  )
}

/** The toggle as the last step of the Lomake 5 checklist. */
export function Form5FiledControl({ step }: { step: number }) {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const filedOn = useBookStore((s) => s.form5Filed[String(year)])

  return (
    <>
      <TaxFormStep step={step} filled={!!filedOn}>
        {f.t("statement.form5FileStep")}
      </TaxFormStep>
      <Form5FiledToggle className="ml-[2.125rem]" />
    </>
  )
}
