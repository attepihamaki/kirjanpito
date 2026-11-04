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

const MEBIBYTE = 1024 * 1024

/**
 * The most one archive entry may unpack to. A small ZIP can hold gigabytes that
 * would take the tab down, and the size in its header can be forged, so the
 * limit applies to the bytes as they come out.
 */
export interface ZipLimits {
  /** The CSV and `settings.json`: above this, the file is refused. */
  textBytes: number
  /** One receipt: above this, it reads as missing. */
  receiptBytes: number
}

export const ZIP_LIMITS: ZipLimits = {
  textBytes: 64 * MEBIBYTE,
  receiptBytes: 512 * MEBIBYTE,
}

/** The CSV or `settings.json` unpacks to more than `ZipLimits.textBytes`. */
export class ZipEntryTooLargeError extends Error {
  constructor() {
    super("A ZIP entry unpacks to more than the limit")
    this.name = "ZipEntryTooLargeError"
  }
}

/* The part of JSZip's documented StreamHelper used here; its types leave it out. */
interface EntryStream {
  on(event: "data", listener: (chunk: Uint8Array) => void): EntryStream
  on(event: "error", listener: (error: Error) => void): EntryStream
  on(event: "end", listener: () => void): EntryStream
  pause(): EntryStream
  resume(): EntryStream
}

/** The entry's bytes, or null as soon as they pass `limit`. */
function readCapped(
  file: JSZip.JSZipObject,
  limit: number
): Promise<Uint8Array | null> {
  const stream = (
    file as unknown as { internalStream(type: "uint8array"): EntryStream }
  ).internalStream("uint8array")
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let total = 0
    stream
      .on("data", (chunk) => {
        total += chunk.length
        if (total > limit) {
          stream.pause()
          chunks.length = 0
          resolve(null)
        } else {
          chunks.push(chunk)
        }
      })
      .on("error", reject)
      .on("end", () => {
        const bytes = new Uint8Array(total)
        let at = 0
        for (const chunk of chunks) {
          bytes.set(chunk, at)
          at += chunk.length
        }
        resolve(bytes)
      })
      .resume()
  })
}

async function readText(file: JSZip.JSZipObject, limits: ZipLimits) {
  const bytes = await readCapped(file, limits.textBytes)
  if (!bytes) throw new ZipEntryTooLargeError()
  return bytes
}

/**
 * Relative to the CSV's folder, falling back to the archive root, then to the
 * same path under a differently named folder, and last to a file of the same
 * name anywhere in the archive.
 *
 * The two fallbacks are what survive a move: the folder a receipt sits in is
 * named for the export language (§7.2), so changing that language asks this
 * archive for a path it has never held, and a receipt whose bytes the browser
 * no longer holds would be dropped from the file replacing it. Only the
 * folder's own name changes, so everything below it — the year, the month and
 * the file name — still identifies the receipt, and two receipts of different
 * months may well share a name. The bare name is tried only after that, and a
 * name shared by two files is ambiguous, so it refuses rather than guessing.
 */
function lookupIn(
  zip: JSZip,
  csvDir: string,
  limits: ZipLimits
): ReceiptLookup {
  let byTail: Map<string, string | null> | undefined
  let byBase: Map<string, string | null> | undefined

  /** Everything below the top folder of a path relative to the CSV, or "". */
  const tailOf = (path: string) => {
    const rel = path.startsWith(csvDir) ? path.slice(csvDir.length) : path
    const cut = rel.indexOf("/")
    return cut < 0 ? "" : rel.slice(cut + 1).toLowerCase()
  }

  const baseOf = (path: string) => (path.split("/").pop() ?? path).toLowerCase()

  const indexBy = (key: (name: string) => string) => {
    const map = new Map<string, string | null>()
    for (const name of Object.keys(zip.files)) {
      if (zip.files[name].dir) continue
      const k = key(name)
      // Null marks a key that more than one file has.
      if (k) map.set(k, map.has(k) ? null : name)
    }
    return map
  }

  return async (path) => {
    let file = zip.file(csvDir + path) ?? zip.file(path)
    const tail = tailOf(path)
    if (!file && tail) {
      byTail ??= indexBy(tailOf)
      const match = byTail.get(tail)
      if (match) file = zip.file(match)
    }
    if (!file) {
      byBase ??= indexBy(baseOf)
      const match = byBase.get(baseOf(path))
      if (match) file = zip.file(match)
    }
    return file ? readCapped(file, limits.receiptBytes) : null
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

/**
 * Throws `ZipEntryTooLargeError` when the CSV or `settings.json` unpacks past
 * the limit. Returns null for an archive with no CSV.
 */
export async function unpackZip(
  data: Uint8Array,
  limits: ZipLimits = ZIP_LIMITS
): Promise<UnpackedZip | null> {
  const zip = await JSZip.loadAsync(data)
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const csvPath = findCsvEntry(names)
  if (!csvPath) return null

  const csvText = decodeCsv(await readText(zip.files[csvPath], limits))
  const csvDir = dirOf(csvPath)
  const settingsPath = [csvDir + SETTINGS_FILE_NAME, SETTINGS_FILE_NAME].find(
    (p) => names.includes(p)
  )
  const settingsText = settingsPath
    ? new TextDecoder().decode(await readText(zip.files[settingsPath], limits))
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
    readReceipt: lookupIn(zip, csvDir, limits),
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
  return lookupIn(zip, csvPath ? dirOf(csvPath) : "", ZIP_LIMITS)
}

/** The folder the CSV sits in, with a trailing slash — "" at the root. */
export function dirOf(csvPath: string): string {
  const i = csvPath.lastIndexOf("/")
  return i < 0 ? "" : csvPath.slice(0, i + 1)
}
