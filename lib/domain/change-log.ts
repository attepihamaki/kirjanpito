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
  | "lock"
  | "unlock"
  | "import"
  /* On opening, the file no longer matched its integrity seal (§7.9). */
  | "external-edit"

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
  "cash",
  "buyerVatId",
  "euPurchase",
  "voucher",
  "atts",
  "split",
  "share",
] as const
export type LoggedField = (typeof LOGGED_FIELDS)[number]

/** A field's value for the log. Receipts are kept by name and size, not by bytes. */
function logged(e: Entry, field: LoggedField): string | number | null {
  if (field === "atts") {
    const names = (e.atts ?? []).map((a) => `${a.name} (${a.size})`)
    return names.length ? names.join(", ") : null
  }
  if (field === "cash") return e.cash ? "cash" : null
  // The link is an opaque id; the log records only that the voucher is a part.
  if (field === "split") return e.split ? "split" : null
  return e[field] ?? null
}

/**
 * A log read from a file, with its records pointing at the entries just read.
 *
 * Entries take new ids when a file opens, since the CSV has no id column, while
 * the log keeps the ids they had when it was written. An entry's newest record
 * gives the voucher number and date it was left with, and a number is unique
 * within its year (§4), so that finds the entry again. A deleted entry, or one
 * whose number was changed outside the app, keeps its old id: its records stay
 * in the log and no voucher shows them.
 */
export function relinkChangeLog(
  log: readonly ChangeRecord[],
  entries: readonly Entry[]
): ChangeRecord[] {
  const voucherKey = (voucher: number, date: string) =>
    `${date.slice(0, 4)}#${voucher}`
  const idByVoucher = new Map<string, string>()
  for (const e of entries) {
    if (e.voucher !== undefined) {
      idByVoucher.set(voucherKey(e.voucher, e.date), e.id)
    }
  }

  const newest = new Map<string, ChangeRecord>()
  for (const r of log) if (r.entryId) newest.set(r.entryId, r)

  const newIds = new Map<string, string>()
  for (const [oldId, r] of newest) {
    if (r.action === "delete" || r.voucher === undefined || !r.date) continue
    const id = idByVoucher.get(voucherKey(r.voucher, r.date))
    if (id) newIds.set(oldId, id)
  }

  return log.map((r) => {
    const id = r.entryId ? newIds.get(r.entryId) : undefined
    return id ? { ...r, entryId: id } : r
  })
}

/** The most records the log keeps (the book's blob in localStorage holds it). */
const MAX_LOG_RECORDS = 5000

/**
 * The log cut to `max` records. Lock, unlock and import records are never
 * dropped, since they say why a period is closed. The oldest add, edit, delete
 * and restore records go first.
 */
export function capChangeLog(
  log: readonly ChangeRecord[],
  max: number = MAX_LOG_RECORDS
): ChangeRecord[] {
  let excess = log.length - max
  if (excess <= 0) return log as ChangeRecord[]
  const out: ChangeRecord[] = []
  for (const r of log) {
    const keep =
      excess <= 0 ||
      r.action === "lock" ||
      r.action === "unlock" ||
      r.action === "import"
    if (keep) out.push(r)
    else excess -= 1
  }
  return out
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
 * The records that take `before` to `after`, one per voucher, so each voucher's
 * history is complete. `restore` marks additions as an undo.
 */
export function entryChanges(
  before: readonly Entry[],
  after: readonly Entry[],
  at: string,
  kind?: "restore"
): ChangeRecord[] {
  const old = new Map(before.map((e) => [e.id, e]))
  const records: ChangeRecord[] = []
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
