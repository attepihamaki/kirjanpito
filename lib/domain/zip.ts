import JSZip from "jszip"

import { decodeCsv } from "@/lib/domain/csv"
import { SETTINGS_FILE_NAME } from "@/lib/domain/settings-file"

/**
 * ZIP packing and unpacking (§7.2).
 *
 * Bytes in and out, so this module can be unit-tested in plain Node. The one
 * exception is a receipt `ReceiptReader` hands over as a `Blob`, which JSZip
 * reads as it writes the archive, so that a year's receipts do not all have to
 * be in memory at once.
 */

/** Reads a receipt's bytes out of storage. Returns null when unavailable. */
export type ReceiptReader = (
  attachmentId: string
) => Promise<Uint8Array | Blob | null>

export interface PackInput {
  /** File name of the CSV inside the archive, e.g. "kirjanpito_2026-10-24.csv". */
  csvName: string
  csvText: string
  /** attachmentKey → path inside the ZIP. */
  paths: ReadonlyMap<string, string>
  /** attachmentKey → IndexedDB id. Keys absent here are skipped. */
  attachmentIds: ReadonlyMap<string, string>
  read: ReceiptReader
  /** `settings.json`, written beside the CSV (§7.6). */
  settingsText: string
  /**
   * A receipt's bytes from the file being replaced, for one this browser does
   * not hold (§7.5). Without it, such a receipt is left out.
   */
  carry?: (path: string) => Promise<Uint8Array | null>
  /** Told about each listed receipt that ended up with no bytes in the ZIP. */
  onAbsent?: (key: string) => void
}

export async function packZip(input: PackInput): Promise<Uint8Array> {
  const zip = new JSZip()
  /*
   * The CSV compresses well; receipts are already compressed formats, so
   * deflating them costs time for nothing.
   */
  zip.file(input.csvName, input.csvText, { compression: "DEFLATE" })
  zip.file(SETTINGS_FILE_NAME, input.settingsText, { compression: "DEFLATE" })

  for (const [key, path] of input.paths) {
    const id = input.attachmentIds.get(key)
    const bytes =
      (id ? await input.read(id) : null) ?? (await input.carry?.(path)) ?? null
    if (bytes) zip.file(path, bytes, { compression: "STORE" })
    else input.onAbsent?.(key)
  }

  return zip.generateAsync({ type: "uint8array" })
}

export interface UnpackedZip {
  csvPath: string
  csvText: string
  /** `settings.json` beside the CSV, or at the root; null when there is none. */
  settingsText: string | null
  /** The path of every other file: the receipts. */
  otherFiles: readonly string[]
  /**
   * A receipt's bytes by the path the CSV lists it under (§7.2). Read on demand,
   * so unpacking a large archive does not hold all of it twice, and a file no
   * entry lists is never decompressed.
   */
  readReceipt: ReceiptLookup
}

export type ReceiptLookup = (path: string) => Promise<Uint8Array | null>

/**
 * Relative to the CSV's folder, falling back to the archive root and then to
 * a file of the same name anywhere in the archive.
 *
 * The last fallback is what survives a move: the folder a receipt sits in is
 * named for the export language (§7.2), so changing that language asks this
 * archive for a path it has never held, and a receipt whose bytes the browser
 * no longer holds would be dropped from the file replacing it. A name shared
 * by two files is ambiguous, so the fallback refuses it rather than guessing.
 */
function lookupIn(zip: JSZip, csvDir: string): ReceiptLookup {
  let byBase: Map<string, string | null> | undefined

  const baseNames = () => {
    const map = new Map<string, string | null>()
    for (const name of Object.keys(zip.files)) {
      if (zip.files[name].dir) continue
      const base = (name.split("/").pop() ?? name).toLowerCase()
      // Null marks a name that more than one file has.
      map.set(base, map.has(base) ? null : name)
    }
    return map
  }

  return async (path) => {
    let file = zip.file(csvDir + path) ?? zip.file(path)
    if (!file) {
      byBase ??= baseNames()
      const match = byBase.get((path.split("/").pop() ?? path).toLowerCase())
      if (match) file = zip.file(match)
    }
    return file ? file.async("uint8array") : null
  }
}

/** The shallowest `.csv` in the archive, ignoring `__MACOSX`. */
export function findCsvEntry(names: readonly string[]): string | null {
  const candidates = names.filter(
    (n) => /\.csv$/i.test(n) && !n.split("/").includes("__MACOSX")
  )
  if (!candidates.length) return null
  return candidates.reduce((best, n) => {
    const depth = (s: string) => s.split("/").length
    if (depth(n) !== depth(best)) return depth(n) < depth(best) ? n : best
    return n.localeCompare(best) < 0 ? n : best
  })
}

export async function unpackZip(data: Uint8Array): Promise<UnpackedZip | null> {
  const zip = await JSZip.loadAsync(data)
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const csvPath = findCsvEntry(names)
  if (!csvPath) return null

  const csvText = decodeCsv(await zip.files[csvPath].async("uint8array"))
  const csvDir = dirOf(csvPath)
  const settingsPath = [csvDir + SETTINGS_FILE_NAME, SETTINGS_FILE_NAME].find(
    (p) => names.includes(p)
  )
  const settingsText = settingsPath
    ? await zip.files[settingsPath].async("string")
    : null

  const otherFiles = names.filter(
    (name) =>
      name !== csvPath &&
      name !== settingsPath &&
      !name.split("/").includes("__MACOSX")
  )

  return {
    csvPath,
    csvText,
    settingsText,
    otherFiles,
    readReceipt: lookupIn(zip, csvDir),
  }
}

/**
 * Look up receipts in an existing ZIP by the path its CSV lists them under,
 * relative to the CSV's folder or the archive root (§7.2).
 */
export async function receiptReader(data: Uint8Array): Promise<ReceiptLookup> {
  const zip = await JSZip.loadAsync(data)
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const csvPath = findCsvEntry(names)
  return lookupIn(zip, csvPath ? dirOf(csvPath) : "")
}

/** The folder the CSV sits in, with a trailing slash — "" at the root. */
export function dirOf(csvPath: string): string {
  const i = csvPath.lastIndexOf("/")
  return i < 0 ? "" : csvPath.slice(0, i + 1)
}
