import type { Cents, Lang } from "@/lib/domain/types"

/** No-break space — what fi-FI uses for grouping and before the € sign. */
export const NBSP = " "
/** Unicode minus — what `Intl` emits for negatives. Not an ASCII hyphen. */
export const MINUS = "−"

/**
 * Round to whole cents, half away from zero, so a credit note is the exact
 * opposite of its sale: 25,5 % of 1,00 € is 0,26 € and of −1,00 € is −0,26 €.
 * `Math.round` alone rounds a half upwards and would give −0,25 €, leaving a
 * cent behind in the VAT return.
 *
 * Negative zero is normalised away: `formatMoney(-0)` would render "−0,00 €".
 * Every rounding in the domain goes through this.
 */
export function roundCents(n: number): Cents {
  const rounded = Math.round(Math.abs(n))
  return (n < 0 ? -rounded : rounded) + 0
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
 * Returns null when the input is not a number, or has more than two decimals.
 * "1,234" could mean 1,23 € or 1 234 €, and a guess would be silently wrong by
 * a factor of a thousand, so it is refused.
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

  if (!/^-?\d*\.?\d+$/.test(t) || /\.\d{3,}$/.test(t)) return null
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

/**
 * A VAT rate the calculations can work with: from 0 up to, not including, 100.
 * A negative rate would divide by zero at −100 % and turn the totals to
 * `Infinity`.
 */
export function isVatRate(rate: number): boolean {
  return rate >= 0 && rate < 100
}
