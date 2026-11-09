/**
 * The integrity seal in `settings.json` (§7.9).
 *
 * A save writes a SHA-256 of the CSV text and of the settings body into
 * `settings.json`. Opening the file recomputes both, so an edit made outside
 * the app (a text editor, Excel, a script) shows up as a mismatch.
 *
 * Nothing here is secret. Anyone who edits a file on purpose can recompute the
 * hashes, so the seal catches casual edits and proves nothing, like the change
 * log (§8.11).
 */

const INTEGRITY_ALGORITHM = "sha256"

/** What `settings.json` stores under `integrity`. Both values are lowercase hex. */
export interface Integrity {
  algorithm: typeof INTEGRITY_ALGORITHM
  /** Hash of the CSV text exactly as the ZIP holds it. */
  csv: string
  /** Hash of the settings body without the `integrity` key. */
  settings: string
  /** Hash of `invoices.json`, present when the book had invoice records (§8.27). */
  invoices?: string
  /** Hash of `customers.json`, present when the book had a customer register. */
  customers?: string
  /** Hash of `inventory.json`, present when the book had a stocktake (§8.28). */
  inventory?: string
}

/** The text of the files beside the CSV that the seal covers besides the settings (§7.6). */
export interface SealedFiles {
  invoices?: string | null
  customers?: string | null
  inventory?: string | null
}

export type IntegrityResult =
  /* No seal to compare: an older file, a ZIP without settings, or a seal this version cannot read. */
  | { status: "none" }
  | { status: "ok" }
  /* The part or parts whose hash no longer matches. */
  | {
      status: "edited"
      csv: boolean
      settings: boolean
      /* Present, and true, only when the seal covered the file and it no longer matches. */
      invoices?: true
      customers?: true
      inventory?: true
    }

/** SHA-256 of the bytes as lowercase hex. */
export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")
}

function sha256Hex(text: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(text))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The body the settings hash covers: the parsed file without its seal, written
 * out again compactly. Going through the parser means white space and key
 * layout in the file do not matter, only the values.
 */
function settingsBody(raw: Record<string, unknown>): string {
  const rest = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "integrity")
  )
  return JSON.stringify(rest)
}

/** The settings file text with a seal for `csvText` added (or replaced). */
export async function sealSettings(
  settingsText: string,
  csvText: string,
  files: SealedFiles = {}
): Promise<string> {
  const raw: unknown = JSON.parse(settingsText)
  if (!isRecord(raw)) throw new Error("settings.json is not an object")
  const seal: Integrity = {
    algorithm: INTEGRITY_ALGORITHM,
    csv: await sha256Hex(csvText),
    settings: await sha256Hex(settingsBody(raw)),
    ...(files.invoices != null
      ? { invoices: await sha256Hex(files.invoices) }
      : {}),
    ...(files.customers != null
      ? { customers: await sha256Hex(files.customers) }
      : {}),
    ...(files.inventory != null
      ? { inventory: await sha256Hex(files.inventory) }
      : {}),
  }
  return `${JSON.stringify({ ...raw, integrity: seal }, null, 2)}\n`
}

function readSeal(value: unknown): Integrity | null {
  if (!isRecord(value)) return null
  const { algorithm, csv, settings } = value
  if (algorithm !== INTEGRITY_ALGORITHM) return null
  if (typeof csv !== "string" || typeof settings !== "string") return null
  const optional = (hash: unknown) =>
    typeof hash === "string" ? hash : undefined
  return {
    algorithm,
    csv,
    settings,
    invoices: optional(value.invoices),
    customers: optional(value.customers),
    inventory: optional(value.inventory),
  }
}

/** Compare a file's CSV and settings text with the seal the settings carry. */
export async function checkIntegrity(
  csvText: string,
  settingsText: string | null,
  files: SealedFiles = {}
): Promise<IntegrityResult> {
  if (!settingsText) return { status: "none" }
  let raw: unknown
  try {
    raw = JSON.parse(settingsText)
  } catch {
    return { status: "none" }
  }
  if (!isRecord(raw)) return { status: "none" }
  const seal = readSeal(raw.integrity)
  if (!seal) return { status: "none" }
  const csv = (await sha256Hex(csvText)) !== seal.csv
  const settings = (await sha256Hex(settingsBody(raw))) !== seal.settings
  /* A file the seal covers must still be there and unchanged. One the seal does not mention is not checked. */
  const changed = async (
    hash: string | undefined,
    text: string | null | undefined
  ) => hash !== undefined && (text == null || (await sha256Hex(text)) !== hash)
  const invoices = await changed(seal.invoices, files.invoices)
  const customers = await changed(seal.customers, files.customers)
  const inventory = await changed(seal.inventory, files.inventory)
  return csv || settings || invoices || customers || inventory
    ? {
        status: "edited",
        csv,
        settings,
        ...(invoices ? { invoices: true as const } : {}),
        ...(customers ? { customers: true as const } : {}),
        ...(inventory ? { inventory: true as const } : {}),
      }
    : { status: "ok" }
}
