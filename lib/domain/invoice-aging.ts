import { calcEntry } from "@/lib/domain/calc"
import { daysBetween } from "@/lib/domain/dates"
import type { Invoice } from "@/lib/domain/invoice"
import { openEntries } from "@/lib/domain/invoice-status"
import { normalizeName } from "@/lib/domain/bank-match"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * What customers still owe, by how late it is (§8.27). Worked out from the
 * entries each time, like the invoice status, and never stored.
 */

/** `notDue` is due today or later; the others count whole days past the due date. */
export const AGING_BUCKETS = [
  "notDue",
  "late14",
  "late30",
  "late60",
  "later",
] as const

export type AgingBucket = (typeof AGING_BUCKETS)[number]

/** The bucket for a due date: due today is not yet late. */
export function agingBucket(dueDate: string, today: string): AgingBucket {
  const late = daysBetween(dueDate, today)
  if (late <= 0) return "notDue"
  if (late <= 14) return "late14"
  if (late <= 30) return "late30"
  if (late <= 60) return "late60"
  return "later"
}

export interface AgingItem {
  invoice: Invoice
  /** What is unpaid on it, gross. Negative on a credit note not yet settled. */
  open: Cents
  /** Whole days past the due date, 0 when not yet due. */
  daysLate: number
  bucket: AgingBucket
}

export interface AgingCustomer {
  /** The register id, or the normalised name of a customer typed in. */
  key: string
  name: string
  items: AgingItem[]
  buckets: Record<AgingBucket, Cents>
  total: Cents
}

export interface AgingReport {
  customers: AgingCustomer[]
  buckets: Record<AgingBucket, Cents>
  total: Cents
}

const emptyBuckets = (): Record<AgingBucket, Cents> => ({
  notDue: 0,
  late14: 0,
  late30: 0,
  late60: 0,
  later: 0,
})

/**
 * Every issued invoice or credit note with something unpaid, grouped by
 * customer, the customer owing most first. A credit note not yet settled counts
 * as a negative amount, so it nets against the customer's own invoices.
 */
export function agingReport(
  invoices: readonly Invoice[],
  entries: readonly Entry[],
  today: string
): AgingReport {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const byCustomer = new Map<string, AgingCustomer>()
  const buckets = emptyBuckets()
  let total = 0
  for (const invoice of invoices) {
    if (invoice.number === null) continue
    const open = openEntries(invoice, byId).reduce(
      (sum, e) => sum + calcEntry(e).gross,
      0
    )
    if (open === 0) continue
    const bucket = agingBucket(invoice.dueDate, today)
    const key =
      invoice.customerId ?? `name:${normalizeName(invoice.customer.name)}`
    const customer = byCustomer.get(key) ?? {
      key,
      name: invoice.customer.name,
      items: [],
      buckets: emptyBuckets(),
      total: 0,
    }
    customer.items.push({
      invoice,
      open,
      daysLate: Math.max(0, daysBetween(invoice.dueDate, today)),
      bucket,
    })
    customer.buckets[bucket] += open
    customer.total += open
    byCustomer.set(key, customer)
    buckets[bucket] += open
    total += open
  }
  const customers = [...byCustomer.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
  )
  for (const c of customers)
    c.items.sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate))
  return { customers, buckets, total }
}
