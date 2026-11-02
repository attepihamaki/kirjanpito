import type { VatPeriod } from "@/lib/domain/vat-deadline"
import type { Formatters } from "@/lib/i18n/create-formatters"

/** "Syyskuu 2026", "3. neljännes 2026" or "Vuosi 2026". */
export function periodLabel(f: Formatters, p: VatPeriod): string {
  if (p.kind === "month") return `${f.month(p.index - 1)} ${p.year}`
  if (p.kind === "quarter")
    return f.t("vat.quarterN", { q: p.index, y: p.year })
  return f.t("vat.yearN", { y: p.year })
}
