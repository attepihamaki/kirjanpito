import type { Invoice } from "@/lib/domain/invoice"
import { extensionFor, receiptStem } from "@/lib/domain/receipt-path"
import { parseReversalKey, reversalKey } from "@/lib/domain/reversal"
import type { Entry, Lang } from "@/lib/domain/types"

/**
 * What `invoices.json` refers to outside itself (§7.6): the entries an
 * invoice booked or bills on, and the files attached to it.
 *
 * Entries take new ids each time a file is opened, since the CSV has no id
 * column, so the file names an entry by its voucher number and year, as the
 * CSV's `reverses` column does (`#12/2026`), and opening it finds the entry
 * again by that. The files are written into the ZIP beside the receipts, and
 * the invoice names each by its path.
 */

/* -------------------------------------------------------------------------
 * Entry links
 * ---------------------------------------------------------------------- */

/** Every entry id an invoice holds, rewritten by `map`; an id it maps to null is dropped. */
function mapEntryIds(
  invoice: Invoice,
  map: (id: string) => string | null
): Invoice {
  const ids = (list: readonly string[]) =>
    list.flatMap((id) => {
      const next = map(id)
      return next === null ? [] : [next]
    })
  const out: Invoice = {
    ...invoice,
    entryIds: ids(invoice.entryIds),
    rows: invoice.rows.map((row) => {
      if (!row.rebills) return row
      const next = map(row.rebills)
      if (next !== null) return { ...row, rebills: next }
      const rest = { ...row }
      delete rest.rebills
      return rest
    }),
  }
  if (invoice.reminders) {
    out.reminders = invoice.reminders.map((r) => {
      if (!r.entryIds) return r
      const kept = ids(r.entryIds)
      const rest = { ...r }
      delete rest.entryIds
      return kept.length > 0 ? { ...rest, entryIds: kept } : rest
    })
  }
  return out
}

/**
 * The invoices as `invoices.json` writes them: each entry named by its
 * voucher key. An entry not among `entries`, such as one a year archive
 * leaves out, is left out of the file too.
 */
export function invoicesForFile(
  invoices: readonly Invoice[],
  entries: readonly Entry[]
): Invoice[] {
  const keys = new Map(entries.map((e) => [e.id, reversalKey(e)]))
  return invoices.map((i) => mapEntryIds(i, (id) => keys.get(id) || null))
}

/**
 * The invoices read from a file, pointed at the entries read with them. A
 * voucher key finds its entry by year and number. A value that is no key is
 * kept as it is, so a book written before keys were used still opens, and
 * a key that finds no entry is dropped.
 */
export function relinkInvoices(
  invoices: readonly Invoice[],
  entries: readonly Entry[]
): Invoice[] {
  const byVoucher = new Map<string, string>()
  for (const e of entries) {
    const key = reversalKey(e)
    if (key) byVoucher.set(key, e.id)
  }
  return invoices.map((i) =>
    mapEntryIds(i, (id) => {
      const key = parseReversalKey(id)
      if (!key) return id
      return byVoucher.get(`#${key.voucher}/${key.year}`) ?? null
    })
  )
}

/* -------------------------------------------------------------------------
 * Attached files
 * ---------------------------------------------------------------------- */

/** The folder of invoice attachments in the ZIP, per export language, beside the receipt folder. */
const FILES_FOLDER: Readonly<Record<Lang, string>> = {
  fi: "laskujen-liitteet",
  en: "invoice-attachments",
}

const DRAFT_WORD: Readonly<Record<Lang, string>> = {
  fi: "luonnos",
  en: "draft",
}

/** The key an invoice file's path is held under among the receipts' paths. */
export function invoiceFileKey(invoiceId: string, index: number): string {
  return `invoice:${invoiceId}:${index}`
}

/**
 * The ZIP path of each invoice's files, keyed by `invoiceFileKey`:
 * `{folder}/{number}-{name}.{ext}`, with "luonnos" for a draft's number and
 * `-2`, `-3`, … when two files would share a path.
 */
export function invoiceFilePaths(
  invoices: readonly Invoice[],
  lang: Lang
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  const used = new Set<string>()
  for (const invoice of invoices) {
    const prefix =
      invoice.number !== null ? String(invoice.number) : DRAFT_WORD[lang]
    for (const [index, file] of (invoice.files ?? []).entries()) {
      const base = `${FILES_FOLDER[lang]}/${prefix}-${receiptStem(file.name)}`
      const ext = extensionFor(file)
      let path = `${base}.${ext}`
      let n = 2
      while (used.has(path.toLowerCase())) path = `${base}-${n++}.${ext}`
      used.add(path.toLowerCase())
      paths.set(invoiceFileKey(invoice.id, index), path)
    }
  }
  return paths
}

/** The stored ids of every invoice's files, which a receipt sweep must keep (§7.4). */
export function invoiceFileIds(invoices: readonly Invoice[]): string[] {
  return invoices.flatMap((i) => (i.files ?? []).map((f) => f.id))
}
