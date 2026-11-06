import { sha256Bytes } from "@/lib/domain/integrity"
import { receiptFolder, receiptStem } from "@/lib/domain/receipt-path"
import { retentionDates } from "@/lib/domain/retention"
import type { ReportText } from "@/lib/domain/year-reports"
import type { Lang } from "@/lib/domain/types"

/**
 * The year archive package (§8.21): what a trader puts on a shelf for the ten
 * years of KPL 2:10. One ZIP holding the year's reports as PDFs, the year's
 * bookkeeping ZIP and two hash lists, so a copy found years later can be
 * checked against what was written. Pure; `retention-commands.ts` reads the
 * receipts and does the writing.
 */

export interface PackageFile {
  /** Path inside the package. */
  path: string
  bytes: Uint8Array
  /** Written without compression: the file is compressed already. */
  store?: boolean
}

/** The folder of the reports inside the package, per export language. */
const REPORT_FOLDER: Readonly<Record<Lang, string>> = {
  fi: "raportit",
  en: "reports",
}

export const HASH_FILE = "hashes.txt"
export const RECEIPT_HASH_FILE = "receipt-hashes.txt"
export const README_FILE = "README.txt"

/** The package's own name: "kirjanpito-2026-sailytyspaketti.zip". */
export function packageFileName(base: string, year: number, lang: Lang) {
  const suffix = lang === "fi" ? "sailytyspaketti" : "retention-package"
  return `${receiptStem(`${base}-${year}-${suffix}`)}.zip`
}

/** "1 - Päiväkirja 2026.pdf": the number keeps the reports in the order of KPL 2:7a. */
export function reportFileName(index: number, title: string): string {
  return `${receiptStem(`${index + 1} - ${title}`)}.pdf`
}

/**
 * `sha256sum -c` reads this: the hash, two spaces, the path. Paths are sorted
 * so the same files always give the same list.
 */
export function hashList(
  items: readonly { path: string; hash: string }[]
): string {
  return [...items]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((i) => `${i.hash}  ${i.path}\n`)
    .join("")
}

/** Hashes of the files, in the list's format. */
export async function hashFiles(
  files: readonly { path: string; bytes: Uint8Array }[]
): Promise<string> {
  const items = await Promise.all(
    files.map(async (f) => ({ path: f.path, hash: await sha256Bytes(f.bytes) }))
  )
  return hashList(items)
}

export interface PackageInput {
  f: ReportText
  year: number
  /** The book's export language: the folder names follow it (§7.1). */
  exportLang: Lang
  /** The reports as PDFs, in the order of `yearReports`. */
  reports: readonly { title: string; bytes: Uint8Array }[]
  /** The year's bookkeeping ZIP, as it was written. */
  book: { name: string; bytes: Uint8Array }
  /** SHA-256 of every receipt in the book ZIP, by its path in that ZIP. */
  receiptHashes: readonly { path: string; hash: string }[]
  /** Whether the book ZIP is encrypted: the reports and lists are not. */
  encrypted: boolean
}

/**
 * Every file of the package. `hashes.txt` covers all of them but itself, and
 * `receipt-hashes.txt` lists the receipts inside the book ZIP, by the paths
 * they have once it is unpacked, so both can be checked with `sha256sum -c`.
 */
export async function buildPackageFiles(
  input: PackageInput
): Promise<PackageFile[]> {
  const { f, year } = input
  const folder = REPORT_FOLDER[input.exportLang]
  const files: PackageFile[] = input.reports.map((r, i) => ({
    path: `${folder}/${reportFileName(i, r.title)}`,
    bytes: r.bytes,
  }))
  files.push({ path: input.book.name, bytes: input.book.bytes, store: true })

  const encoder = new TextEncoder()
  const receiptHashes = encoder.encode(hashList(input.receiptHashes))
  files.push({ path: RECEIPT_HASH_FILE, bytes: receiptHashes })

  const retention = retentionDates(year)
  const readme = encoder.encode(
    f.t("ledger.packReadme", {
      y: year,
      b: f.date(retention.books),
      v: f.date(retention.vouchers),
      r: folder,
      z: input.book.name,
      h: HASH_FILE,
      s: RECEIPT_HASH_FILE,
      d: receiptFolder(input.exportLang),
      e: input.encrypted ? f.t("ledger.packReadmeEncrypted") : "",
    })
  )
  files.push({ path: README_FILE, bytes: readme })

  files.push({
    path: HASH_FILE,
    bytes: encoder.encode(await hashFiles(files)),
  })
  return files
}
