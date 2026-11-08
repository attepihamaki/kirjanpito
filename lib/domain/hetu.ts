const CHECK_CHARS = "0123456789ABCDEFHJKLMNPRSTUVWXY"

/** The century marks a personal ID may carry between the birth date and the serial. */
const CENTURY_MARKS = "+-YXWVUABCDEF"

/**
 * A Finnish personal identity code (henkilötunnus) in its written form,
 * `010170-123N`, or null if it is not a valid one. The check character is the
 * remainder of the nine digits (date and serial) taken as one number, mod 31.
 */
export function parseHetu(value: string): string | null {
  const compact = value.replace(/\s/g, "").toUpperCase()
  const match = /^(\d{6})([+\-YXWVUABCDEF])(\d{3})([0-9A-Y])$/.exec(compact)
  if (!match) return null
  const [, date, mark, serial, check] = match
  if (!CENTURY_MARKS.includes(mark)) return null
  const day = Number(date.slice(0, 2))
  const month = Number(date.slice(2, 4))
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  const remainder = Number(date + serial) % 31
  if (CHECK_CHARS[remainder] !== check) return null
  return compact
}
