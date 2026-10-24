import type { Lang } from "@/lib/domain/types"

export const MONTHS: Readonly<Record<Lang, readonly string[]>> = {
  fi: [
    "Tammikuu",
    "Helmikuu",
    "Maaliskuu",
    "Huhtikuu",
    "Toukokuu",
    "Kesäkuu",
    "Heinäkuu",
    "Elokuu",
    "Syyskuu",
    "Lokakuu",
    "Marraskuu",
    "Joulukuu",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
}

export const MONTHS_SHORT: Readonly<Record<Lang, readonly string[]>> = {
  fi: [
    "Tammi",
    "Helmi",
    "Maalis",
    "Huhti",
    "Touko",
    "Kesä",
    "Heinä",
    "Elo",
    "Syys",
    "Loka",
    "Marras",
    "Joulu",
  ],
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/**
 * Build an ISO date string, validating that the day really exists — so
 * 2026-02-30 and 2025-02-29 are rejected rather than rolled over.
 */
export function isoDate(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null
  }
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return `${y}-${pad2(m)}-${pad2(d)}`
}

/** Accept "YYYY-M-D" and "D.M.YYYY" (§7.1). Returns ISO, or null. */
export function parseCsvDate(input: string | null | undefined): string | null {
  if (input == null) return null
  const s = String(input).trim()
  if (!s) return null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3])

  const fi = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s)
  if (fi) return isoDate(+fi[3], +fi[2], +fi[1])

  return null
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4))
}

/** 1–12. */
export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7))
}

const dateFormatters: Partial<Record<Lang, Intl.DateTimeFormat>> = {}

/**
 * Finnish "8.1.2026", English "8 Jan 2026".
 *
 * Built and formatted in UTC: with a local-time Date, "2026-01-01" renders as
 * "31 Dec 2025" anywhere west of Greenwich.
 */
export function formatDate(iso: string, lang: Lang): string {
  const y = yearOf(iso)
  const m = monthOf(iso)
  const d = Number(iso.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return iso
  }
  if (lang === "fi") return `${d}.${m}.${y}`

  let fmt = dateFormatters.en
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    dateFormatters.en = fmt
  }
  return fmt.format(new Date(Date.UTC(y, m - 1, d)))
}

/** Today in the user's own timezone, as ISO. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** Inclusive first and last month of a quarter: 1 → [1, 3]. */
export function quarterMonths(q: 1 | 2 | 3 | 4): readonly [number, number] {
  return [q * 3 - 2, q * 3]
}
