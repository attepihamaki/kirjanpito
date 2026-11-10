"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BellRingIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useToday } from "@/hooks/use-today"
import { periodLabel } from "@/lib/i18n/period-label"
import { bookStartDate, vatTimeline } from "@/lib/domain/vat-deadline"
import { vatReminder } from "@/lib/domain/vat-reminder"
import { VAT_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * Shown on every page of the app in the week before a VAT return is due, and
 * after the due date until the return is marked filed (§8.7). It names the
 * period and the days left, and opens the return dialog for it. "Piilota"
 * hides it until the page is reloaded; the next period gets its own banner.
 */
export function VatReminderBanner() {
  const f = useFormatters()
  const router = useRouter()
  const today = useToday()
  const archiveYear = useBookStore((s) => s.archiveYear)
  const demo = useBookStore((s) => s.demo)
  const entries = useBookStore((s) => s.entries)
  const mode = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const [hidden, setHidden] = React.useState<string | null>(null)

  const reminder = React.useMemo(() => {
    const first = entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
    return vatReminder(
      vatTimeline(mode, bookStartDate(bookStart, first), today, vatFiled),
      today
    )
  }, [entries, mode, bookStart, today, vatFiled])

  /*
   * An archive is a read-only reference, and the return belongs to the open
   * book. The demo book's returns are not anybody's to file (§8.32).
   */
  if (
    !reminder ||
    archiveYear !== null ||
    demo ||
    hidden === reminder.period.key
  ) {
    return null
  }

  const { period, days, overdue } = reminder
  const open = () => {
    const s = useBookStore.getState()
    s.setYear(period.year)
    s.setVatIndex(period.index)
    router.push(VAT_ROUTES.sheet)
    s.openDialog({ kind: "vat-return" })
  }

  return (
    <div
      role="status"
      className={cn(
        "print-hidden flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm lg:px-6",
        overdue ? "bg-expense-subtle text-expense" : "bg-muted"
      )}
    >
      <BellRingIcon className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">
        {f.t(overdue ? "app.vatReminderLate" : "app.vatReminderDue", {
          p: periodLabel(f, period),
          d: f.date(period.due),
        })}
      </span>
      {!overdue ? (
        <span className="text-muted-foreground">
          {days === 0
            ? f.t("app.vatReminderToday")
            : f.t("app.vatReminderDays", { n: days })}
        </span>
      ) : null}
      <span className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={open}>
          {f.t("app.vatReminderOpen")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHidden(period.key)}>
          {f.t("app.vatReminderHide")}
        </Button>
      </span>
    </div>
  )
}
