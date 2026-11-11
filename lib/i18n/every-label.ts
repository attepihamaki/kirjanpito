import type { Formatters } from "@/lib/i18n/create-formatters"

/** "Joka kuukausi" or "3 kk välein": how often a recurring entry or invoice comes. */
export function everyLabel(f: Pick<Formatters, "t">, every: number): string {
  return every === 1
    ? f.t("common.everyMonth")
    : f.t("common.everyMonths", { n: every })
}
