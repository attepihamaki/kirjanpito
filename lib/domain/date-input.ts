import { addDays, isoDate, todayIso } from "@/lib/domain/dates"

/** Day offsets for the words a date field understands, in both languages. */
const WORDS: Record<string, number> = {
  tänään: 0,
  tanaan: 0,
  today: 0,
  idag: 0,
  eilen: -1,
  yesterday: -1,
  igår: -1,
  igar: -1,
  huomenna: 1,
  tomorrow: 1,
  imorgon: 1,
  toissapäivänä: -2,
  toissapaivana: -2,
  "day before yesterday": -2,
  förrgår: -2,
}

/** A two-digit year means 20xx. */
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y))

/**
 * Read what was typed in a date field and return an ISO date, or null.
 *
 * Accepts `15.3.`, `15.3`, `15.3.26`, `15.3.2026`, `15/3`, `15-3-2026`,
 * `2026-03-15`, the digits-only `15032026` and `150326`, and the words in
 * `WORDS`. A date without a year takes `year`, the year of the open book. Words
 * count from `today`, whatever the open year is. A date that does not exist,
 * such as 31.2., gives null instead of rolling over.
 */
export function parseDateInput(
  input: string | null | undefined,
  year: number,
  today: string = todayIso()
): string | null {
  if (input == null) return null
  const s = input.trim().toLowerCase()
  if (!s) return null

  const word = WORDS[s]
  if (word !== undefined) return addDays(today, word)

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3])

  const digits = /^(\d{2})(\d{2})(\d{4}|\d{2})$/.exec(s)
  if (digits) return isoDate(fullYear(digits[3]), +digits[2], +digits[1])

  const parts = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}|\d{2})?)?\.?$/.exec(s)
  if (parts) {
    return isoDate(parts[3] ? fullYear(parts[3]) : year, +parts[2], +parts[1])
  }
  return null
}
