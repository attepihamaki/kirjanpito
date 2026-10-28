"use client"

import { useFormatters } from "@/components/lang-provider"
import { type VatPeriod, type VatPeriodStatus } from "@/lib/domain/vat-deadline"
import { cn } from "@/lib/utils"

const DOT: Record<VatPeriodStatus, string> = {
  before: "bg-transparent",
  filed: "bg-income",
  overdue: "bg-expense",
  due: "bg-warning",
  open: "bg-muted-foreground/50",
  future: "bg-transparent",
}

/**
 * The filing periods of the year as a row of chips (§8.7), each with where
 * it stands. The chips have the month chips' shape (§8.4), one line taller
 * to carry the status.
 */
export function VatPeriodStrip({
  periods,
  selected,
  statuses,
  onSelect,
}: {
  periods: readonly VatPeriod[]
  selected: number
  statuses: readonly VatPeriodStatus[]
  onSelect: (index: number) => void
}) {
  const f = useFormatters()

  const label = (p: VatPeriod) =>
    p.kind === "month"
      ? f.month(p.index - 1, true)
      : f.t("vat.quarterShort", { q: p.index })

  const statusText = (s: VatPeriodStatus, p: VatPeriod) =>
    s === "filed"
      ? f.t("vat.filed")
      : s === "overdue"
        ? f.t("vat.overdue")
        : s === "due"
          ? f.t("vat.dueShort", { d: f.date(p.due) })
          : s === "open"
            ? f.t("vat.running")
            : s === "before"
              ? f.t("vat.beforeStart")
              : f.t("vat.upcoming")

  return (
    <div
      className="scroll-strip -mx-1 gap-1.5 px-1 pb-1"
      role="group"
      aria-label={f.t("vat.period")}
    >
      {periods.map((p, i) => {
        const status = statuses[i]
        const isSelected = selected === p.index
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(p.index)}
            className={cn(
              "focus-ring flex min-w-[4.5rem] shrink-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent hover:bg-muted",
              (status === "future" || status === "before") &&
                !isSelected &&
                "text-muted-foreground"
            )}
          >
            <span className={cn(isSelected && "font-medium")}>{label(p)}</span>
            {status ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[0.7rem] whitespace-nowrap",
                  isSelected ? "opacity-85" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isSelected ? "bg-current" : DOT[status]
                  )}
                  aria-hidden
                />
                {statusText(status, p)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
