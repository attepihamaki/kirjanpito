const WEIGHTS = [7, 9, 10, 5, 8, 4, 2]

/**
 * The business ID (y-tunnus) in its written form, `0112038-9`, or null if it is
 * not a valid one. Spaces, a missing hyphen and the `FI` of a VAT number are
 * accepted, since a user copies this from an invoice or a letter.
 *
 * The last digit is a check digit: the weighted sum of the first seven, modulo
 * 11. A remainder of 0 gives 0, any other gives 11 minus it, and a remainder of
 * 1 is never issued.
 */
export function parseBusinessId(value: string): string | null {
  const compact = value.replace(/\s/g, "").replace(/^FI/i, "").replace("-", "")
  if (!/^\d{8}$/.test(compact)) return null
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(compact[i]), 0)
  const remainder = sum % 11
  if (remainder === 1) return null
  const check = remainder === 0 ? 0 : 11 - remainder
  if (check !== Number(compact[7])) return null
  return `${compact.slice(0, 7)}-${compact[7]}`
}
