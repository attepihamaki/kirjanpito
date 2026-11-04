"use client"

import { CheckIcon, FileCheckIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { filedOn } from "@/lib/domain/vat-deadline"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The way into the VAT return dialog (§8.7) for the selected period. A period
 * before the book's start owes nothing, so it only says so; a filed one states
 * the date and offers the dialog again, where the mark can be removed.
 */
export function VatReturnButton({ className }: { className?: string }) {
  const f = useFormatters()
  const vatFiled = useBookStore((s) => s.vatFiled)
  const openDialog = useBookStore((s) => s.openDialog)
  const { current, currentStatus: status } = useVatPeriod()

  if (status === "before") {
    return (
      <p className={cn("max-w-xs text-sm text-muted-foreground", className)}>
        {f.t("vat.beforeStartHint")}
      </p>
    )
  }

  const filed = status === "filed"
  return (
    <div className={cn("flex flex-col items-start gap-1.5 min-[560px]:items-end", className)}>
      <Button
        variant={filed ? "outline" : "default"}
        size="sm"
        onClick={() => openDialog({ kind: "vat-return" })}
      >
        {filed ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <FileCheckIcon data-icon="inline-start" />
        )}
        {f.t(filed ? "vat.returnOpenFiled" : "vat.returnButton")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {filed
          ? f.t("vat.filedOn", { d: f.date(filedOn(current, vatFiled) ?? "") })
          : f.t("vat.dueDate", { d: f.date(current.due) })}
      </p>
    </div>
  )
}
