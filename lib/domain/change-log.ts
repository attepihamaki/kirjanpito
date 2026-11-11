import { formatTagsCell, parseTagsCell } from "@/lib/domain/tags"
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
  "reverses",
  "sells",
  "periodFrom",
  "periodTo",
  "due",
  "iban",
  "reference",
  "tags",
  "advance",
] as const
export type LoggedField = (typeof LOGGED_FIELDS)[number]

/** How the log writes `paidOn` while a voucher is open. */
export const PAID_OPEN = "open"

/** A field's value for the log. Receipts are kept by name and size, not by bytes. */
function logged(e: Entry, field: LoggedField): string | number | null {
  if (field === "atts") {
    const names = (e.atts ?? []).map((a) => `${a.name} (${a.size})`)
    return names.length ? names.join(", ") : null
  }
  if (field === "cash") return e.cash ? "cash" : null
  if (field === "advance") return e.advance ? "advance" : null
  // An open voucher is told apart from one paid on its own date, which is null.
  if (field === "paidOn")
    return e.paidOn === null ? PAID_OPEN : (e.paidOn ?? null)
  // The link is an opaque id; the log records only that the voucher is a part.
  if (field === "split") return e.split ? "split" : null
  // Same for the reversal link: the log records that there is one, not the id.
  if (field === "reverses") return e.reverses ? "reverses" : null
  if (field === "sells") return e.sells ? "sells" : null
  if (field === "tags") return e.tags?.length ? formatTagsCell(e.tags) : null
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

/* -------------------------------------------------------------------------
 * Restore
 * ---------------------------------------------------------------------- */

/**
 * Fields the log holds only as a mark, not as the value: a receipt by name
 * and size, a link by the fact of it. A version restored keeps their current
 * value. The voucher number is not restored either: it follows the date (§4).
 */
const MARKED_ONLY: ReadonlySet<LoggedField> = new Set([
  "atts",
  "split",
  "reverses",
  "sells",
])

/** A logged value put back on the entry, or the field removed when the log says none. */
function putBack(
  e: Entry,
  field: LoggedField,
  value: string | number | null
): Entry {
  const out = { ...e } as Record<string, unknown>
  if (field === "paidOn") {
    /*
     * A record written before `PAID_OPEN` existed logged an open voucher as
     * null too, and reads here as paid on its own date.
     */
    if (value === PAID_OPEN) out.paidOn = null
    else if (value === null) delete out.paidOn
    else out.paidOn = String(value)
  } else if (field === "cash" || field === "advance") {
    if (value === null) delete out[field]
    else out[field] = true
  } else if (value === null || value === "") {
    if (field === "description") out.description = ""
    else delete out[field]
  } else if (field === "tags") {
    out.tags = parseTagsCell(String(value))
  } else if (field === "amount" || field === "vatRate" || field === "share") {
    out[field] = Number(value)
  } else {
    out[field] = String(value)
  }
  return out as unknown as Entry
}

export interface RestoredVersion {
  /** The entry as it was after the chosen step, with its current id. */
  entry: Entry
  /** Fields a later step changed that the log cannot put back. */
  kept: LoggedField[]
}

/**
 * The entry as it stood right after `records[index]` (§8.11), found by
 * undoing every later edit's changes in turn, newest first. `records` are the
 * entry's own, oldest first, as the log holds them. Null when `index` is the
 * newest step, which is the entry as it is.
 */
export function versionAfter(
  current: Entry,
  records: readonly ChangeRecord[],
  index: number
): RestoredVersion | null {
  if (index < 0 || index >= records.length - 1) return null
  let entry = current
  const kept = new Set<LoggedField>()
  for (let i = records.length - 1; i > index; i--) {
    const r = records[i]
    if (r.action !== "edit") continue
    for (const c of r.changes ?? []) {
      if (c.field === "voucher") continue
      if (MARKED_ONLY.has(c.field)) {
        kept.add(c.field)
        continue
      }
      entry = putBack(entry, c.field, c.from)
    }
  }
  return { entry, kept: LOGGED_FIELDS.filter((f) => kept.has(f)) }
}
