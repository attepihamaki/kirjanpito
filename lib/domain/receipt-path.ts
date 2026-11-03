import type { Attachment, Entry, Lang } from "@/lib/domain/types"

/**
 * What an exported archive calls its parts, per export language (§7.2).
 *
 * The CSV is the vouchers and the folder holds their attachments, so the two
 * are named for what they are rather than after the ZIP around them. The
 * CSV's name is fixed per language: the archive then reads the same whatever
 * the user called the file.
 */
const RECEIPT_FOLDER: Readonly<Record<Lang, string>> = {
  fi: "liitteet",
  en: "attachments",
}

export const CSV_FILE_NAME: Readonly<Record<Lang, string>> = {
  fi: "tositteet.csv",
  en: "vouchers.csv",
}

/** The folder name, for copy that tells the user where the receipts are. */
export function receiptFolder(lang: Lang): string {
  return RECEIPT_FOLDER[lang]
}

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
  /*
   * NFD splits the remaining accents into letter + combining mark, which
   * stripCombiningMarks then drops, leaving the bare letter.
   */
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
 * Whether a file may be a receipt: an image or a PDF, nothing else (§7.4).
 *
 * The single gate for both directions. Every way an attachment can enter a
 * bookkeeping goes through it — the picker, drag and drop, and the paths a
 * CSV or ZIP lists — and so does every way one can leave, so a file outside
 * the rule can neither be stored nor written back out.
 *
 * Name and type are both consulted because each can be absent on its own: a
 * ZIP entry arrives with no MIME type, and a camera upload can arrive with no
 * extension.
 */
export function isReceiptFile(a: Pick<Attachment, "name" | "type">): boolean {
  if (a.type.startsWith("image/") || a.type === "application/pdf") return true
  const ext = extFromName(a.name)
  return !!ext && Object.hasOwn(MIME_BY_EXT, ext)
}

/**
 * Stable identity of an attachment within an entry, used to key the path map.
 * Object identity would not survive serialization or a structured clone.
 */
export function attachmentKey(entryId: string, index: number): string {
  return `${entryId}#${index}`
}

/**
 * The file name a receipt takes when the user has not named it: the entry's
 * own description, with the index telling several receipts of one entry apart.
 *
 * Shared with the entry dialog, which shows it as the name box's placeholder,
 * so the suggestion on screen is the name the file will really get.
 */
export function defaultAttachmentStem(
  description: string,
  index: number,
  count: number
): string {
  return `${slug(description)}${count > 1 ? `_${index + 1}` : ""}`
}

/**
 * Build the ZIP path for every attachment (§7.2):
 * `{folder}/{YYYY}/{MM}/{YYYY-MM-DD}_{stem}.{ext}`, where the stem is the name
 * the user gave the receipt, or `defaultAttachmentStem` when they gave none.
 * `-2`, `-3`, … is appended before the extension on a collision, which is also
 * what two receipts named the same thing get.
 *
 * A named receipt takes no index: the name already tells it from its siblings,
 * and numbering only the unnamed ones keeps a path from moving when a
 * neighbour is renamed.
 *
 * Missing attachments keep their stored path and reserve it, so a real
 * attachment colliding with one gets the suffix instead — a pinned path beats
 * a name.
 *
 * Anything that is not an image or a PDF gets no path at all, which is what
 * keeps it out of both the ZIP and the CSV's receipts column.
 */
export function buildReceiptPaths(
  entries: readonly Entry[],
  lang: Lang = "fi"
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  const used = new Set<string>()
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  /*
   * Reserve every missing attachment's path first, so ordering between a
   * missing and a real attachment cannot change which one keeps the plain
   * name.
   */
  for (const e of sorted) {
    for (const [i, a] of (e.atts ?? []).entries()) {
      /*
       * Judged by the path alone: it is what would be written, and a missing
       * attachment has no file behind it whose type could be trusted.
       */
      if (a.missing && a.path && isReceiptFile({ name: a.path, type: "" })) {
        used.add(a.path.toLowerCase())
        paths.set(attachmentKey(e.id, i), a.path)
      }
    }
  }

  for (const e of sorted) {
    const atts = e.atts ?? []
    for (const [i, a] of atts.entries()) {
      if (a.missing || !isReceiptFile(a)) continue
      const [y, mo] = e.date.split("-")
      const named = a.label?.trim()
      const stem = named
        ? slug(named)
        : defaultAttachmentStem(e.description, i, atts.length)
      const base = `${RECEIPT_FOLDER[lang]}/${y}/${mo}/${e.date}_${stem}`
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
  return out.replace(/\.(csv|zip)$/i, "").trim()
}

/**
 * The name the download dialog suggests (§7.3): the last file opened or
 * saved, without its extension, or the dated default when there is none.
 */
export function suggestedBaseName(fileName: string | null, lang: Lang): string {
  return (fileName && cleanFileName(fileName)) || defaultFileBaseName(lang)
}

/** "kirjanpito" / "bookkeeping". */
export function defaultFileBaseName(lang: Lang): string {
  return lang === "en" ? "bookkeeping" : "kirjanpito"
}

/**
 * The name a receipt was given, read back from the path it was written to
 * (§7.2). Null when the path is the one the entry's own description would
 * have produced, which is what an unnamed receipt gets.
 *
 * This is what carries a name through a file and back: the path is the only
 * record of it, so a name returns slugged. Reading it back makes the path a
 * fixed point — exporting the recovered name reproduces the same path — so a
 * book can go round any number of times without its receipts being renamed.
 */
export function labelFromPath(
  path: string,
  entry: { date: string; description: string },
  index: number,
  count: number
): string | null {
  const base = path.split("/").pop() ?? path
  const ext = extFromName(base)
  const stem = ext ? base.slice(0, -(ext.length + 1)) : base

  const expected = `${entry.date}_${defaultAttachmentStem(entry.description, index, count)}`
  // A collision tail belongs to the path, not to the name (`-2`, `-3`, …).
  const withoutTail = stem.replace(/-\d+$/, "")
  if (
    stem.toLowerCase() === expected.toLowerCase() ||
    withoutTail.toLowerCase() === expected.toLowerCase()
  ) {
    return null
  }

  const prefix = `${entry.date}_`
  if (!stem.toLowerCase().startsWith(prefix.toLowerCase())) return null
  let name = stem.slice(prefix.length)
  /*
   * An unnamed sibling's index is part of the path, not of the name. A slug
   * never contains "_", so the only thing that can precede one here is an
   * index — but something has to precede it, or a receipt the user called
   * "2" would read as unnamed and move on the next save.
   */
  const indexTail = `_${index + 1}`
  if (count > 1 && name.length > indexTail.length && name.endsWith(indexTail)) {
    name = name.slice(0, -indexTail.length)
  }
  return name || null
}
