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
 */
export interface CanonicalEntry {
  pvm: string
  selite: string
  tyyppi: EntryType
  tili: number | null
  luokka: string
  summa: number
  alv: number
  syotto: AmountMode
  tosite: readonly string[]
}

const byKey = (e: CanonicalEntry) => `${e.pvm}|${e.selite}|${e.summa}`

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
        pvm: e.pvm,
        selite: e.selite.trim(),
        tyyppi: e.tyyppi,
        tili: line ? line.tili : null,
        luokka: cat ? cat.nimi : "",
        summa: e.summa,
        alv: e.alv,
        syotto: e.syotto,
        tosite: (e.atts ?? [])
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
        pvm: e.pvm,
        selite: e.selite.trim(),
        tyyppi: e.tyyppi,
        tili: line ? line.tili : null,
        luokka: cat ? cat.nimi : "",
        summa: e.summa,
        alv: e.alv,
        syotto: e.syotto,
        tosite: e.paths,
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
 * Turn an import result back into entries, with the `tosite` paths restored
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
