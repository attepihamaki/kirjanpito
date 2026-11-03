import type { Entry } from "@/lib/domain/types"

/**
 * What has happened to the entries (§8.11). KPL 2:6 asks that a return can be
 * traced back to its entries and vouchers, and 2:7 forbids changing them once a
 * return is made from them. The log travels in the file with the book.
 *
 * It records use of the app. A file the user controls can be edited by hand, so
 * the log is not proof that nothing else happened.
 */
export type ChangeAction =
  | "add"
  | "edit"
  | "delete"
  | "restore"
  | "clear"
  | "renumber"
  | "lock"
  | "unlock"
  | "import"

export interface FieldChange {
  field: LoggedField
  from: string | number | null
  to: string | number | null
}

export interface ChangeRecord {
  /** ISO timestamp. */
  at: string
  action: ChangeAction
  entryId?: string
  voucher?: number
  /** The entry's date, as it was or now is. */
  date?: string
  description?: string
  /** On "edit": what changed. */
  changes?: FieldChange[]
  /** On "clear" and "renumber": how many entries. */
  count?: number
  /** On "lock" and "unlock": the VAT period or the year. */
  period?: string
}

export const LOGGED_FIELDS = [
  "date",
  "description",
  "type",
  "catId",
  "amount",
  "vatRate",
  "amountMode",
  "settles",
  "paidOn",
  "buyerVatId",
  "voucher",
  "atts",
] as const
export type LoggedField = (typeof LOGGED_FIELDS)[number]

/** A field's value for the log. Receipts are kept by name and size, not by bytes. */
function logged(e: Entry, field: LoggedField): string | number | null {
  if (field === "atts") {
    const names = (e.atts ?? []).map((a) => `${a.name} (${a.size})`)
    return names.length ? names.join(", ") : null
  }
  return e[field] ?? null
}

function subject(
  e: Entry
): Pick<ChangeRecord, "entryId" | "voucher" | "date" | "description"> {
  return {
    entryId: e.id,
    ...(e.voucher !== undefined ? { voucher: e.voucher } : {}),
    date: e.date,
    description: e.description,
  }
}

/**
 * The records that take `before` to `after`. `restore` marks additions as an
 * undo, and `renumber` and `clear` give one record for the whole change.
 */
export function entryChanges(
  before: readonly Entry[],
  after: readonly Entry[],
  at: string,
  kind?: "restore" | "renumber" | "clear"
): ChangeRecord[] {
  if (kind === "clear") {
    return before.length ? [{ at, action: "clear", count: before.length }] : []
  }
  const old = new Map(before.map((e) => [e.id, e]))
  const records: ChangeRecord[] = []
  if (kind === "renumber") {
    const count = after.filter((e) => {
      const was = old.get(e.id)
      return was && was.voucher !== e.voucher
    }).length
    return count ? [{ at, action: "renumber", count }] : []
  }
  const now = new Set(after.map((e) => e.id))
  for (const e of before) {
    if (!now.has(e.id)) records.push({ at, action: "delete", ...subject(e) })
  }
  for (const e of after) {
    const was = old.get(e.id)
    if (!was) {
      records.push({ at, action: kind ?? "add", ...subject(e) })
      continue
    }
    const changes = LOGGED_FIELDS.flatMap((field): FieldChange[] => {
      const from = logged(was, field)
      const to = logged(e, field)
      return from === to ? [] : [{ field, from, to }]
    })
    if (changes.length) {
      records.push({ at, action: "edit", ...subject(e), changes })
    }
  }
  return records
}
