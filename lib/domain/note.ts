/** The longest note a voucher keeps, in characters (§8.39). */
export const NOTE_MAX = 2000

/**
 * A voucher's note as stored: line endings as `\n`, trailing space trimmed
 * and cut at `NOTE_MAX`. Empty means no note.
 */
export function normalizeNote(text: string | undefined): string {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, NOTE_MAX)
    .trimEnd()
}

/** `{ note }` when there is one, or nothing: an optional field is left out empty. */
export function noteField(text: string | undefined): { note?: string } {
  const note = normalizeNote(text)
  return note ? { note } : {}
}

/** `{ toCheck: true }` when set, or nothing. */
export function toCheckField(on: boolean | undefined): { toCheck?: true } {
  return on ? { toCheck: true } : {}
}
