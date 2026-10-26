import JSZip from "jszip"

/**
 * ZIP packing and unpacking (§7.2).
 *
 * Deliberately `Uint8Array` in and out, never `Blob`: that keeps this module
 * pure enough to unit-test in plain Node. The Blob boundary lives in
 * `lib/browser`.
 */

/** Reads a receipt's bytes out of storage. Returns null when unavailable. */
export type ReceiptReader = (attachmentId: string) => Promise<Uint8Array | null>

export interface PackInput {
  /** File name of the CSV inside the archive, e.g. "kirjanpito_2026-10-24.csv". */
  csvName: string
  csvText: string
  /** attachmentKey → path inside the ZIP. */
  paths: ReadonlyMap<string, string>
  /** attachmentKey → IndexedDB id. Keys absent here are skipped. */
  attachmentIds: ReadonlyMap<string, string>
  read: ReceiptReader
}

export async function packZip(input: PackInput): Promise<Uint8Array> {
  const zip = new JSZip()
  /*
   * The CSV compresses well; receipts are already compressed formats, so
   * deflating them costs time for nothing.
   */
  zip.file(input.csvName, input.csvText, { compression: "DEFLATE" })

  for (const [key, path] of input.paths) {
    const id = input.attachmentIds.get(key)
    if (!id) continue
    const bytes = await input.read(id)
    if (!bytes) continue
    zip.file(path, bytes, { compression: "STORE" })
  }

  return zip.generateAsync({ type: "uint8array" })
}

export interface UnpackedZip {
  csvPath: string
  csvText: string
  files: ReadonlyMap<string, Uint8Array>
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

  const csvText = await zip.files[csvPath].async("string")
  const files = new Map<string, Uint8Array>()
  for (const name of names) {
    if (name === csvPath) continue
    if (name.split("/").includes("__MACOSX")) continue
    files.set(name, await zip.files[name].async("uint8array"))
  }

  return { csvPath, csvText, files }
}

/** The folder the CSV sits in, with a trailing slash — "" at the root. */
export function dirOf(csvPath: string): string {
  const i = csvPath.lastIndexOf("/")
  return i < 0 ? "" : csvPath.slice(0, i + 1)
}

/**
 * Resolve a `tosite` path relative to the CSV's folder, falling back to the
 * archive root (§7.2).
 */
export function resolveReceipt(
  files: ReadonlyMap<string, Uint8Array>,
  csvDir: string,
  path: string
): Uint8Array | null {
  return files.get(csvDir + path) ?? files.get(path) ?? null
}
