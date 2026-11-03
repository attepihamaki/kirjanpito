import { LINE_BY_KEY } from "@/lib/domain/accounts"
import type { ImportedEntry } from "@/lib/domain/csv"
import { buildReceiptPaths, attachmentKey } from "@/lib/domain/receipt-path"
import type {
  AmountMode,
  CategoryMap,
  Entry,
  EntryType,
} from "@/lib/domain/types"

/**
 * The projection a CSV round trip must preserve.
 *
 * Entry, category and attachment ids are deliberately excluded: they are
 * regenerated on import. Category identity across the file boundary is
 * (account number, side, Finnish name) — exactly what the CSV carries.
 *
 * The field names are the CSV's own column names, not `Entry`'s: this type is
 * the file row, and naming it after the columns is what makes a failing
 * assertion point at a column.
 */
export interface CanonicalEntry {
  date: string
  description: string
  type: EntryType
  account: number | null
  category: string
  amount: number
  vat: number
  mode: AmountMode
  receipts: readonly string[]
}

const byKey = (e: CanonicalEntry) => `${e.date}|${e.description}|${e.amount}`

function sort(rows: CanonicalEntry[]): CanonicalEntry[] {
  return rows.sort((a, b) => byKey(a).localeCompare(byKey(b)))
}

export function canonical(
  entries: readonly Entry[],
  cats: CategoryMap
): CanonicalEntry[] {
  const paths = buildReceiptPaths(entries)
  return sort(
    entries.map((e) => {
      const cat = cats.get(e.catId)
      const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
      return {
        date: e.date,
        description: e.description.trim(),
        type: e.type,
        account: line ? line.account : null,
        category: cat ? cat.name : "",
        amount: e.amount,
        vat: e.vatRate,
        mode: e.amountMode,
        receipts: (e.atts ?? [])
          .map((a, i) => paths.get(attachmentKey(e.id, i)) ?? a.path ?? "")
          .filter(Boolean),
      }
    })
  )
}

export function canonicalImported(
  entries: readonly ImportedEntry[],
  cats: CategoryMap
): CanonicalEntry[] {
  return sort(
    entries.map((e) => {
      const cat = cats.get(e.catId)
      const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
      return {
        date: e.date,
        description: e.description.trim(),
        type: e.type,
        account: line ? line.account : null,
        category: cat ? cat.name : "",
        amount: e.amount,
        vat: e.vatRate,
        mode: e.amountMode,
        receipts: e.paths,
      }
    })
  )
}

/**
 * Build CSV text from single-line strings. Never put a literal CRLF in a test
 * file — git and Prettier normalise it to LF and the test fails confusingly.
 */
export function csvText(lines: readonly string[], bom = true): string {
  return (bom ? "﻿" : "") + lines.join("\r\n") + "\r\n"
}

/**
 * Turn an import result back into entries, with the `receipts` paths restored
 * as missing attachments — what a plain-CSV import produces (§7.2).
 */
export function entriesFromImport(imported: readonly ImportedEntry[]): Entry[] {
  return imported.map(({ paths, ...e }) => ({
    ...e,
    ...(paths.length
      ? {
          atts: paths.map((path) => ({
            id: null,
            name: path.split("/").pop() ?? path,
            type: "",
            size: 0,
            missing: true as const,
            path,
          })),
        }
      : {}),
  }))
}
