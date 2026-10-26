import type { Cents, Lang } from "@/lib/domain/types"

/** No-break space — what fi-FI uses for grouping and before the € sign. */
export const NBSP = " "
/** Unicode minus — what `Intl` emits for negatives. Not an ASCII hyphen. */
export const MINUS = "−"

/**
 * `Math.round` with negative zero normalised away.
 *
 * `Math.round(-1 * 25.5 / 125.5)` is `-0`, `Object.is(-0, 0)` is false, and
 * `formatMoney(-0)` would render "−0,00 €". Every rounding in the domain goes
 * through this.
 */
export function roundCents(n: number): Cents {
  return Math.round(n) + 0
}

const eur = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
})
const plain = new Intl.NumberFormat("fi-FI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Currency is always Finnish, in both UI languages (§9): "1 234,56 €". */
export function formatMoney(c: Cents): string {
  return eur.format(roundCents(c) / 100)
}

/** The same number without the € sign — for the amount input. */
export function formatMoneyPlain(c: Cents): string {
  return plain.format(roundCents(c) / 100)
}

/**
 * The CSV amount format: decimal comma, no thousands separator, ASCII hyphen.
 *
 * Deliberately not routed through `Intl`, which emits U+2212 for the sign and
 * a no-break space for grouping — neither of which Finnish Excel parses.
 */
export function formatAmountForCsv(c: Cents): string {
  const n = roundCents(c)
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`
}

export function formatRate(rate: number, lang: Lang): string {
  return lang === "en"
    ? `${rate}%`
    : `${String(rate).replace(".", ",")}${NBSP}%`
}

export function formatFileSize(bytes: number, lang: Lang): string {
  const mb = lang === "en" ? "MB" : "Mt"
  const kb = lang === "en" ? "KB" : "kt"
  if (bytes >= 1024 * 1024) {
    const v = (bytes / (1024 * 1024)).toFixed(1)
    return `${lang === "en" ? v : v.replace(".", ",")}${NBSP}${mb}`
  }
  return `${Math.max(1, Math.round(bytes / 1024))}${NBSP}${kb}`
}

/**
 * Parse a user- or CSV-supplied amount into cents. Lenient per §7.1: tolerates
 * spaces, NBSP, narrow NBSP, "€" and a Unicode minus.
 *
 * When both "," and "." appear, the last one is the decimal separator. A lone
 * comma is always a decimal comma, whatever the UI language, so the same file
 * parses identically in Finnish and English.
 *
 * Returns null when the input is not a number.
 */
export function parseAmount(input: string | null | undefined): Cents | null {
  if (input == null) return null
  let t = String(input)
    .replace(/[\s  €]/g, "")
    .replace(/−/g, "-")
  if (!t) return null

  const lastComma = t.lastIndexOf(",")
  const lastDot = t.lastIndexOf(".")
  if (lastComma > -1 && lastDot > -1) {
    t =
      lastComma > lastDot
        ? t.replace(/\./g, "").replace(",", ".")
        : t.replace(/,/g, "")
  } else if (lastComma > -1) {
    t = t.replace(",", ".")
  }

  if (!/^-?\d*\.?\d+$/.test(t)) return null
  return roundCents(parseFloat(t) * 100)
}

/** Parse a VAT rate: "25,5", "25.5", " 14 % " → 25.5 / 14. Null if invalid. */
export function parseRate(input: string | null | undefined): number | null {
  if (input == null) return null
  const t = String(input)
    .replace(/[\s  %]/g, "")
    .replace(/−/g, "-")
    .replace(",", ".")
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

/** Sum integer cents without ever leaving integer arithmetic. */
export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0
  for (const v of values) total += v
  return total + 0
}
