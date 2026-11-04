"use client"

import { MarkFiledButton } from "@/components/common/mark-filed-button"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { todayIso } from "@/lib/domain/dates"
import { filedKeys, filedOn } from "@/lib/domain/vat-deadline"
import { useBookStore } from "@/stores/book-store"

/**
 * Where the selected period's return stands, with the filed toggle. Only a
 * closed period can be filed, so an open or future one's button only says why,
 * and a period before the book's start owes nothing (§6.5).
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
  if (status === "open" || status === "future") {
    return (
      <MarkFiledButton
        ongoing={f.t("vat.periodOngoing")}
        onMark={() => setVatFiled(current.key, todayIso())}
      />
    )
  }

  return (
    <div className="flex flex-col items-start gap-2 text-sm min-[560px]:items-end">
      <span className="text-muted-foreground">
        {status === "filed"
          ? f.t("vat.filedOn", { d: f.date(filedOn(current, vatFiled) ?? "") })
          : f.t("vat.dueDate", { d: f.date(current.due) })}
      </span>
      {status === "filed" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // The mark may have been made in another filing period (§6.5).
            for (const key of filedKeys(current, vatFiled)) {
              setVatFiled(key, null)
            }
          }}
        >
          {f.t("vat.unmarkFiled")}
        </Button>
      ) : (
        <MarkFiledButton onMark={() => setVatFiled(current.key, todayIso())} />
      )}
    </div>
  )
}
