import type { Formatters } from "@/lib/i18n/create-formatters"

/** The time of day on the clock of the person reading, `19.17` in Finnish. */
export function clock(f: Pick<Formatters, "lang">, at: Date): string {
  const h = String(at.getHours()).padStart(2, "0")
  const m = String(at.getMinutes()).padStart(2, "0")
  return f.lang === "fi" ? `${h}.${m}` : `${h}:${m}`
}
