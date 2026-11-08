import { mod97 } from "@/lib/domain/iban"

const WEIGHTS = [7, 3, 1]

/** The check digit that makes `digits` a Finnish reference: weights 7, 3, 1 from the right. */
function finnishCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    const fromRight = digits.length - 1 - i
    sum += Number(digits[i]) * WEIGHTS[fromRight % 3]
  }
  return (10 - (sum % 10)) % 10
}

/**
 * The Finnish reference number (viitenumero) for an invoice number: the digits
 * and a check digit. A reference is 4 to 20 digits with the check digit, so the
 * number must have 3 to 19 digits. Anything else gives null.
 */
export function finnishReference(base: string | number): string | null {
  const digits = String(base)
  if (!/^\d{3,19}$/.test(digits)) return null
  return digits + finnishCheckDigit(digits)
}

/** True for 4 to 20 digits whose last digit is the check digit of the rest. */
export function isFinnishReference(value: string): boolean {
  if (!/^\d{4,20}$/.test(value)) return false
  return finnishCheckDigit(value.slice(0, -1)) === Number(value.slice(-1))
}

/**
 * The international creditor reference (RF) for a digit string of 1 to 21
 * digits: `RF`, two check digits and the digits. Anything else gives null.
 */
export function rfReference(base: string | number): string | null {
  const digits = String(base)
  if (!/^\d{1,21}$/.test(digits)) return null
  const check = 98 - mod97(`${digits}271500`)
  return `RF${String(check).padStart(2, "0")}${digits}`
}

/** True for an RF reference of digits only, whose check digits are right. */
export function isRfReference(value: string): boolean {
  if (!/^RF\d{3,23}$/.test(value)) return false
  return mod97(`${value.slice(4)}2715${value.slice(2, 4)}`) === 1
}

/** A reference in groups, as it is printed: fives from the right for a Finnish one, fours from the left for RF. */
export function formatReference(reference: string): string {
  if (reference.startsWith("RF"))
    return reference.replace(/(.{4})(?=.)/g, "$1 ")
  return reference.replace(/\B(?=(\d{5})+$)/g, " ")
}

/** A reference as the bank statement may write it: letters and digits, no spaces. */
export function compactReference(value: string): string {
  return value.replace(/\s/g, "").toUpperCase()
}
