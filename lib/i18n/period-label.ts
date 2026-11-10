import type { VatPeriod, VatPeriodStatus } from "@/lib/domain/vat-deadline"
import type { Formatters } from "@/lib/i18n/create-formatters"

/** "Syyskuu 2026", "3. neljännes 2026" or "Vuosi 2026". */
export function periodLabel(
  f: Pick<Formatters, "t" | "month">,
  p: VatPeriod
): string {
  if (p.kind === "month") return `${f.month(p.index - 1)} ${p.year}`
  if (p.kind === "quarter")
    return f.t("vat.quarterN", { q: p.index, y: p.year })
  return f.t("vat.yearN", { y: p.year })
}

/** A period's state in a word or two: "Ilmoitettu", "Myöhässä", "Erä 12.3.2026". */
export function periodStatusText(
  f: Pick<Formatters, "t" | "date">,
  s: VatPeriodStatus,
  p: VatPeriod
): string {
  switch (s) {
    case "filed":
      return f.t("vat.filed")
    case "overdue":
      return f.t("vat.overdue")
    case "due":
      return f.t("vat.dueShort", { d: f.date(p.due) })
    case "open":
      return f.t("vat.running")
    case "before":
      return f.t("vat.beforeStart")
    case "ended":
      return f.t("vat.afterEnd")
    case "future":
      return f.t("vat.upcoming")
  }
}
