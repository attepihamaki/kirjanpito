import type { CalendarEvent } from "@/lib/domain/tax-calendar"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import type { Formatters } from "@/lib/i18n/create-formatters"
import { periodLabel } from "@/lib/i18n/period-label"

/** What a calendar date is for, as one line. */
export function eventTitle(f: Formatters, e: CalendarEvent): string {
  switch (e.kind) {
    case "vat": {
      const p = periodFromKey(e.ref)
      return f.t("calendar.vat", { p: p ? periodLabel(f, p) : e.ref })
    }
    case "ec":
      return f.t("calendar.ec", {
        m: `${f.month(Number(e.ref.slice(5, 7)) - 1)} ${e.ref.slice(0, 4)}`,
      })
    case "form5":
      return f.t("calendar.form5", { y: e.ref })
    case "yel":
      return f.t("calendar.yel")
    case "advanceTax":
      return f.t("calendar.advanceTax")
    case "retentionVouchers":
      return f.t("calendar.retentionVouchers", { y: e.ref })
    case "retentionBooks":
      return f.t("calendar.retentionBooks", { y: e.ref })
    case "bill":
      return f.t("calendar.bill", { x: e.label || "–" })
  }
}
