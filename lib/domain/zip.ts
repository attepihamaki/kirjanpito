import {
  BlobReader,
  ERR_INVALID_AUTHENTICATION_CODE,
  ERR_INVALID_PASSWORD,
  TextReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
  configure,
  type FileEntry,
} from "@zip.js/zip.js/index-native.js"

import { decodeCsv } from "@/lib/domain/csv"
import {
  CUSTOMERS_FILE_NAME,
  INVOICES_FILE_NAME,
} from "@/lib/domain/invoice-file"
import { SETTINGS_FILE_NAME } from "@/lib/domain/settings-file"

/**
 * ZIP packing and unpacking (§7.2).
 *
 * Bytes in and out, so this module can be unit-tested in plain Node. The one
 * exception is a receipt `ReceiptReader` hands over as a `Blob`, which zip.js
 * reads as it writes the archive, so that a year's receipts do not all have to
 * be in memory at once.
 *
 * A book may be encrypted (§7.8): every entry is then AES-256 encrypted with
 * one password, in the WinZip AE-2 form that 7-Zip and similar tools read.
 */

/*
 * The CSP allows no blob: workers (§11b), and the wasm build would need
 * `wasm-unsafe-eval`, so zip.js runs in the main thread on the native
 * CompressionStream.
 */
configure({ useWebWorkers: false })

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
  /** `invoices.json` (§7.6). Left out of the archive when unset. */
  invoicesText?: string
  /** `customers.json` (§7.6). Left out of the archive when unset. */
  customersText?: string
  /**
   * A receipt's bytes from the file being replaced, for one this browser does
   * not hold (§7.5). Without it, such a receipt is left out.
   */
  carry?: (path: string) => Promise<Uint8Array | null>
  /** Told about each listed receipt that ended up with no bytes in the ZIP. */
  onAbsent?: (key: string) => void
  /** Encrypts every entry with this password (§7.8). Unset writes a plain ZIP. */
  password?: string
}

/**
 * A Blob is streamed from disk as the archive is written. One without
 * `arrayBuffer` (an engine that predates it) is read whole through FileReader.
 */
async function readerFor(bytes: Uint8Array | Blob) {
  if (ArrayBuffer.isView(bytes))
    return new Uint8ArrayReader(bytes as Uint8Array)
  if (typeof bytes.arrayBuffer === "function") return new BlobReader(bytes)
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reading = new FileReader()
    reading.onload = () => resolve(reading.result as ArrayBuffer)
    reading.onerror = () => reject(reading.error)
    reading.readAsArrayBuffer(bytes)
  })
  return new Uint8ArrayReader(new Uint8Array(buffer))
}

export async function packZip(input: PackInput): Promise<Uint8Array> {
  const zip = new ZipWriter(
    new Uint8ArrayWriter(),
    input.password ? { password: input.password, encryptionStrength: 3 } : {}
  )
  /*
   * The CSV compresses well; receipts are already compressed formats, so
   * deflating them costs time for nothing.
   */
  await zip.add(input.csvName, new TextReader(input.csvText))
  await zip.add(SETTINGS_FILE_NAME, new TextReader(input.settingsText))
  if (input.invoicesText !== undefined)
    await zip.add(INVOICES_FILE_NAME, new TextReader(input.invoicesText))
  if (input.customersText !== undefined)
    await zip.add(CUSTOMERS_FILE_NAME, new TextReader(input.customersText))

  /* Whether each path got its bytes, so a path several entries list is read once. */
  const written = new Map<string, boolean>()
  for (const [key, path] of input.paths) {
    const done = written.get(path)
    if (done !== undefined) {
      if (!done) input.onAbsent?.(key)
      continue
    }
    const id = input.attachmentIds.get(key)
    const bytes =
      (id ? await input.read(id) : null) ?? (await input.carry?.(path)) ?? null
    written.set(path, bytes !== null)
    if (bytes) await zip.add(path, await readerFor(bytes), { level: 0 })
    else input.onAbsent?.(key)
  }

  return zip.close()
}

/**
 * A plain ZIP of ready-made files, for the retention package (§8.21). Never
 * encrypted: a book ZIP inside it keeps its own encryption, and the package
 * has to open in any tool years from now.
 */
export async function packFiles(
  files: readonly { path: string; bytes: Uint8Array; store?: boolean }[]
): Promise<Uint8Array> {
  const zip = new ZipWriter(new Uint8ArrayWriter())
  for (const file of files) {
    await zip.add(
      file.path,
      new Uint8ArrayReader(file.bytes),
      file.store ? { level: 0 } : {}
    )
  }
  return zip.close()
}

export interface UnpackedZip {
  csvPath: string
  csvText: string
  /** `settings.json` beside the CSV, or at the root; null when there is none. */
  settingsText: string | null
  /** `invoices.json` beside the CSV, or at the root; null when there is none. */
  invoicesText: string | null
  /** `customers.json`, found the same way. */
  customersText: string | null
  /** The path of every other file: the receipts. */
  otherFiles: readonly string[]
  /** Whether the archive's entries are encrypted (§7.8). */
  encrypted: boolean
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

const ZIP_LIMITS: ZipLimits = {
  textBytes: 64 * MEBIBYTE,
  receiptBytes: 512 * MEBIBYTE,
}

/** The archive is encrypted and no password was given (§7.8). */
export class ZipPasswordRequiredError extends Error {
  constructor() {
    super("The ZIP is encrypted and needs a password")
    this.name = "ZipPasswordRequiredError"
  }
}

/** The password does not open the archive (§7.8). */
export class ZipWrongPasswordError extends Error {
  constructor() {
    super("The password does not open the ZIP")
    this.name = "ZipWrongPasswordError"
  }
}

/** The CSV or `settings.json` unpacks to more than `ZipLimits.textBytes`. */
export class ZipEntryTooLargeError extends Error {
  constructor() {
    super("A ZIP entry unpacks to more than the limit")
    this.name = "ZipEntryTooLargeError"
  }
}

/**
 * A wrong password as zip.js reports it. AES keeps a two byte check value, so
 * one password in 65 536 passes it and fails the MAC instead.
 */
function isPasswordFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === ERR_INVALID_PASSWORD ||
      error.message === ERR_INVALID_AUTHENTICATION_CODE)
  )
}

/** The entry's bytes, or null as soon as they pass `limit`. */
async function readCapped(
  file: FileEntry,
  limit: number,
  password: string | undefined
): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = []
  let total = 0
  let capped = false
  const sink = new WritableStream<Uint8Array>({
    write(chunk) {
      total += chunk.length
      if (total > limit) {
        capped = true
        chunks.length = 0
        throw new Error("capped")
      }
      chunks.push(chunk)
    },
  })
  try {
    await file.getData(sink, password ? { password } : undefined)
  } catch (error) {
    if (capped) return null
    throw error
  }
  const bytes = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.length
  }
  return bytes
}

async function readText(
  file: FileEntry,
  limits: ZipLimits,
  password: string | undefined
) {
  let bytes: Uint8Array | null
  try {
    bytes = await readCapped(file, limits.textBytes, password)
  } catch (error) {
    if (isPasswordFailure(error)) throw new ZipWrongPasswordError()
    throw error
  }
  if (!bytes) throw new ZipEntryTooLargeError()
  return bytes
}

/** The archive's files by name, folders left out. */
async function openFiles(data: Uint8Array): Promise<Map<string, FileEntry>> {
  const entries = await new ZipReader(new Uint8ArrayReader(data)).getEntries()
  const files = new Map<string, FileEntry>()
  for (const entry of entries) {
    if (!entry.directory) files.set(entry.filename, entry)
  }
  return files
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
  files: ReadonlyMap<string, FileEntry>,
  csvDir: string,
  limits: ZipLimits,
  password: string | undefined
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
    for (const name of files.keys()) {
      const k = key(name)
      // Null marks a key that more than one file has.
      if (k) map.set(k, map.has(k) ? null : name)
    }
    return map
  }

  return async (path) => {
    let file = files.get(csvDir + path) ?? files.get(path)
    const tail = tailOf(path)
    if (!file && tail) {
      byTail ??= indexBy(tailOf)
      const match = byTail.get(tail)
      if (match) file = files.get(match)
    }
    if (!file) {
      byBase ??= indexBy(baseOf)
      const match = byBase.get(baseOf(path))
      if (match) file = files.get(match)
    }
    if (!file) return null
    try {
      return await readCapped(file, limits.receiptBytes, password)
    } catch (error) {
      /* A receipt that fails its check reads as missing; the book still opens. */
      if (isPasswordFailure(error)) return null
      throw error
    }
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
 * the limit, `ZipPasswordRequiredError` for an encrypted archive opened with no
 * password and `ZipWrongPasswordError` when the password does not fit. Returns
 * null for an archive with no CSV.
 */
export async function unpackZip(
  data: Uint8Array,
  limits: ZipLimits = ZIP_LIMITS,
  password?: string
): Promise<UnpackedZip | null> {
  const files = await openFiles(data)
  const names = [...files.keys()]
  const csvPath = findCsvEntry(names)
  if (!csvPath) return null
  const encrypted = [...files.values()].some((f) => f.encrypted)
  if (encrypted && !password) throw new ZipPasswordRequiredError()

  const csvText = decodeCsv(
    await readText(files.get(csvPath)!, limits, password)
  )
  const csvDir = dirOf(csvPath)
  const beside = async (fileName: string) => {
    const path = [csvDir + fileName, fileName].find((p) => files.has(p))
    if (!path) return { path: undefined, text: null }
    const bytes = await readText(files.get(path)!, limits, password)
    return { path, text: new TextDecoder().decode(bytes) }
  }
  const settings = await beside(SETTINGS_FILE_NAME)
  const invoices = await beside(INVOICES_FILE_NAME)
  const customers = await beside(CUSTOMERS_FILE_NAME)
  const jsonPaths = new Set([settings.path, invoices.path, customers.path])

  const otherFiles = names.filter(
    (name) =>
      name !== csvPath &&
      !jsonPaths.has(name) &&
      !name.split("/").includes("__MACOSX")
  )

  return {
    csvPath,
    csvText,
    settingsText: settings.text,
    invoicesText: invoices.text,
    customersText: customers.text,
    otherFiles,
    encrypted,
    readReceipt: lookupIn(files, csvDir, limits, password),
  }
}

/**
 * Look up receipts in an existing ZIP by the path its CSV lists them under,
 * relative to the CSV's folder or the archive root (§7.2).
 */
export async function receiptReader(
  data: Uint8Array,
  password?: string
): Promise<ReceiptLookup> {
  const files = await openFiles(data)
  const csvPath = findCsvEntry([...files.keys()])
  return lookupIn(files, csvPath ? dirOf(csvPath) : "", ZIP_LIMITS, password)
}

/** The folder the CSV sits in, with a trailing slash — "" at the root. */
export function dirOf(csvPath: string): string {
  const i = csvPath.lastIndexOf("/")
  return i < 0 ? "" : csvPath.slice(0, i + 1)
}
