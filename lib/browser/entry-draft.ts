/**
 * The half-typed new voucher (§8.5), kept in localStorage so a closed tab, a
 * reload or a crash does not lose it. It belongs to this browser and never
 * reaches the file. One draft at a time, tagged with the book it was typed
 * into, so another book never offers it.
 *
 * The form is stored as the dialog holds it, without attachments: a receipt
 * nothing refers to is removed from IndexedDB by the next sweep (§7.4), so a
 * draft could not keep one alive.
 */

export const ENTRY_DRAFT_KEY = "entry-draft"

export interface EntryDraft {
  /** The book it was typed into: its file name, or a fixed name for a book with none. */
  book: string
  /** When it was last written, as an ISO timestamp. */
  savedAt: string
  /** The dialog's form, read back field by field against a fresh one. */
  form: Record<string, unknown>
}

/** The draft for `book`, or null when there is none, it is another book's or it cannot be read. */
export function readEntryDraft(book: string): EntryDraft | null {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(ENTRY_DRAFT_KEY) ?? "null"
    )
    if (!raw || typeof raw !== "object") return null
    const { book: owner, savedAt, form } = raw as Record<string, unknown>
    if (owner !== book || typeof savedAt !== "string") return null
    if (!form || typeof form !== "object" || Array.isArray(form)) return null
    return { book, savedAt, form: form as Record<string, unknown> }
  } catch {
    return null
  }
}

export function writeEntryDraft(
  book: string,
  form: Record<string, unknown>,
  now: Date = new Date()
): void {
  try {
    window.localStorage.setItem(
      ENTRY_DRAFT_KEY,
      JSON.stringify({ book, savedAt: now.toISOString(), form })
    )
  } catch {
    /* Full or blocked storage: the draft is a convenience and is simply not kept. */
  }
}

export function clearEntryDraft(): void {
  try {
    window.localStorage.removeItem(ENTRY_DRAFT_KEY)
  } catch {
    /* Nothing to clear where storage cannot be reached. */
  }
}

/**
 * `fresh` with every field the draft holds in the same shape: a string for a
 * string, a boolean for a boolean, a number for a number, and a list of
 * strings for a list. Anything else in the draft, such as a field this build
 * no longer has, is left out, so an old or edited draft cannot break the form.
 * `skip` names fields never restored.
 */
export function restoreDraftForm<F extends object>(
  fresh: F,
  draft: Record<string, unknown>,
  skip: readonly (keyof F)[] = []
): F {
  const out = { ...fresh }
  for (const key of Object.keys(fresh) as (keyof F & string)[]) {
    if (skip.includes(key) || !(key in draft)) continue
    const want = fresh[key]
    const got = draft[key]
    const fits = Array.isArray(want)
      ? Array.isArray(got) && got.every((v) => typeof v === "string")
      : typeof got === typeof want &&
        (typeof got !== "number" || Number.isFinite(got))
    if (fits) out[key] = got as F[typeof key]
  }
  return out
}
