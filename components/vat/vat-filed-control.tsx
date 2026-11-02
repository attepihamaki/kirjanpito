"use client"

import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { todayIso } from "@/lib/domain/dates"
import { useBookStore } from "@/stores/book-store"

/**
 * Where the selected period's return stands, with the filed toggle. Only a
 * closed period can be filed, and a period before the book's start owes
 * nothing (§6.5). An open or future period renders nothing.
 */
export function VatFiledControl() {
  const f = useFormatters()
  const vatFiled = useBookStore((s) => s.vatFiled)
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const { current, currentStatus: status } = useVatPeriod()

  if (status === "before") {
    return (
      <p className="text-sm text-muted-foreground">
        {f.t("vat.beforeStartHint")}
      </p>
    )
  }
  if (status !== "filed" && status !== "due" && status !== "overdue") {
    return null
  }

  return (
    <div className="flex flex-col items-start gap-2 text-sm min-[560px]:items-end">
      <span className="text-muted-foreground">
        {status === "filed"
          ? f.t("vat.filedOn", { d: f.date(vatFiled[current.key]) })
          : f.t("vat.dueDate", { d: f.date(current.due) })}
      </span>
      {status === "filed" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVatFiled(current.key, null)}
        >
          {f.t("vat.unmarkFiled")}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVatFiled(current.key, todayIso())}
        >
          <CheckIcon data-icon="inline-start" />
          {f.t("vat.markFiled")}
        </Button>
      )}
    </div>
  )
}
