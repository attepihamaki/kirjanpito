import type { Attachment, Entry, Lang } from "@/lib/domain/types"
import { todayIso } from "@/lib/domain/dates"

/**
 * Combining marks in the range U+0300 to U+036F: what `normalize("NFD")`
 * splits accented letters into.
 *
 * Matched by code point rather than a regex character class. A class would
 * have to spell the range as an escape, and an escape that any tool decodes
 * leaves two invisible combining characters sitting in the source.
 */
function stripCombiningMarks(input: string): string {
  let out = ""
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x300 && code <= 0x36f) continue
    out += ch
  }
  return out
}

/**
 * Slug for a receipt file name (§7.2): lowercase, å/ä → a and ö → o, other
 * diacritics stripped, non-alphanumeric runs collapsed to "-", at most 40
 * characters, falling back to "tosite".
 */
export function slug(input: string): string {
  // NFD splits the remaining accents into letter + combining mark, which
  // stripCombiningMarks then drops, leaving the bare letter.
  const folded = String(input ?? "")
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .normalize("NFD")

  const s = stripCombiningMarks(folded)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  return s || "tosite"
}

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
}

const EXT_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
}

function extFromName(name: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(String(name ?? "").trim())
  if (!m) return null
  const ext = m[1].toLowerCase()
  return ext === "jpeg" ? "jpg" : ext
}

export function mimeForName(name: string): string {
  const ext = extFromName(name)
  return (ext && MIME_BY_EXT[ext]) || "application/octet-stream"
}

/** The extension to use in the ZIP: from the file name, else from the MIME. */
export function extensionFor(a: Pick<Attachment, "name" | "type">): string {
  return extFromName(a.name) ?? EXT_BY_MIME[a.type] ?? "bin"
}

export function isPdf(a: Pick<Attachment, "name" | "type">): boolean {
  return a.type === "application/pdf" || extFromName(a.name) === "pdf"
}

/**
 * Stable identity of an attachment within an entry.
 *
 * The prototype keyed its path map by attachment object identity, which does
 * not survive serialization or a store's structured clone — and cannot be
 * asserted against a fixture.
 */
export function attachmentKey(entryId: string, index: number): string {
  return `${entryId}#${index}`
}

/**
 * Build the ZIP path for every attachment (§7.2):
 * `tositteet/{YYYY}/{MM}/{YYYY-MM-DD}_{slug}[_{n}].{ext}`, with `_{n}` added
 * only when the entry has several receipts, and `-2`, `-3`, … appended before
 * the extension on a collision.
 *
 * Missing attachments keep their stored path and reserve it, so a real
 * attachment colliding with one gets the suffix instead.
 */
export function buildReceiptPaths(
  entries: readonly Entry[]
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  const used = new Set<string>()
  const sorted = [...entries].sort((a, b) => a.pvm.localeCompare(b.pvm))

  // Reserve every missing attachment's path first, so ordering between a
  // missing and a real attachment cannot change which one keeps the plain name.
  for (const e of sorted) {
    for (const [i, a] of (e.atts ?? []).entries()) {
      if (a.missing && a.path) {
        used.add(a.path.toLowerCase())
        paths.set(attachmentKey(e.id, i), a.path)
      }
    }
  }

  for (const e of sorted) {
    const atts = e.atts ?? []
    for (const [i, a] of atts.entries()) {
      if (a.missing) continue
      const [y, mo] = e.pvm.split("-")
      const suffix = atts.length > 1 ? `_${i + 1}` : ""
      const base = `tositteet/${y}/${mo}/${e.pvm}_${slug(e.selite)}${suffix}`
      const ext = extensionFor(a)
      let path = `${base}.${ext}`
      let n = 2
      while (used.has(path.toLowerCase())) path = `${base}-${n++}.${ext}`
      used.add(path.toLowerCase())
      paths.set(attachmentKey(e.id, i), path)
    }
  }

  return paths
}

/** Characters Windows and POSIX file systems reject in a name (§7.3). */
const FORBIDDEN_IN_FILENAME = '\\/:*?"<>|'

/**
 * Strip characters a file system will not accept, and a trailing ".csv".
 *
 * Written as an explicit scan rather than a regex character class: the class
 * would need a literal C0 control range, which is invisible in source and
 * easy for tooling to mangle.
 */
export function cleanFileName(input: string): string {
  let out = ""
  for (const ch of String(input ?? "")) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) continue
    if (FORBIDDEN_IN_FILENAME.includes(ch)) continue
    out += ch
  }
  return out.replace(/\.csv$/i, "").trim()
}

/** "kirjanpito_2026-10-24" / "accounting_2026-10-24", using today's date. */
export function defaultFileBaseName(
  lang: Lang,
  now: Date = new Date()
): string {
  return `${lang === "en" ? "accounting" : "kirjanpito"}_${todayIso(now)}`
}
