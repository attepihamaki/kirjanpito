/** A text read as a number, with each letter as 10 to 35, reduced modulo 97 one digit at a time. */
export function mod97(text: string): number {
  let remainder = 0
  for (const char of text) {
    const code = char.charCodeAt(0)
    const digits = code >= 65 ? String(code - 55) : char
    for (const digit of digits)
      remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

/**
 * The IBAN in its compact upper-case form, or null if it is not a valid one.
 * Spaces and case are ignored, since a user copies it from a bank statement.
 * The country's length is not checked, only the shape and the modulo-97 check.
 */
export function parseIban(value: string): string | null {
  const compact = value.replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return null
  return mod97(compact.slice(4) + compact.slice(0, 4)) === 1 ? compact : null
}

/** True for a valid IBAN of a Finnish account: `FI` and 16 digits. */
export function isFinnishIban(value: string): boolean {
  const iban = parseIban(value)
  return iban !== null && /^FI\d{16}$/.test(iban)
}

/** The IBAN in groups of four, as it is written on paper. */
export function formatIban(compact: string): string {
  return compact.replace(/(.{4})(?=.)/g, "$1 ")
}
