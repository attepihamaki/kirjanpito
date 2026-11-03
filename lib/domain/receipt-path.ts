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

/** Characters Windows and POSIX file systems reject in a name (§7.3). */
const FORBIDDEN_IN_FILENAME = '\\/:*?"<>|'

/**
 * Drop what no file system will take: the characters above, and the C0
 * controls plus DEL.
 *
 * Written as an explicit scan rather than a regex character class: the class
 * would need a literal control range, which is invisible in source and easy
 * for tooling to mangle.
 *
 * `|` and `"` being in the forbidden set is also what keeps a receipt path
 * safe in the CSV, where `|` separates them and `"` quotes a field (§7.1).
 */
function stripUnsafeChars(input: string): string {
  let out = ""
  for (const ch of String(input ?? "")) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) continue
    if (FORBIDDEN_IN_FILENAME.includes(ch)) continue
    out += ch
  }
  return out
}

/* MS-DOS device names, which Windows refuses whatever extension follows. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** Longest stem written, leaving room for the folders and a `-2` suffix. */
const MAX_STEM = 100

/*
 * The name a receipt whose own name is entirely unusable is written under.
 * It is a word the stem rules leave alone, so a file saved under it keeps
 * that name through every later round trip.
 */
const FALLBACK_STEM = "liite"

/**
 * The name a receipt takes inside the archive: its own file name, with only
 * what a file system would refuse taken out (§7.2).
 *
 * Deliberately **not** a slug. The name came off the user's own disk, so it
 * is already a valid file name, and most of it is a choice they made —
 * "2.11.2026 - HC-Maschinentechnik - Lasku" says far more than the
 * alphanumeric fold of it would. Keeping it also means the name written and
 * the name a re-import reads back are the same string.
 *
 * **Idempotent**, which is what keeps the path a fixed point across any
 * number of round trips: everything below either removes a character that
 * can never survive, or is a no-op on its own output.
 */
export function receiptStem(name: string): string {
  const out = stripUnsafeChars(stemFromName(name))
    .slice(0, MAX_STEM)
    /*
     * Windows trims a trailing dot or space when it creates a file, so a name
     * ending in one would come back different from the one that was written.
     */
    .replace(/^[\s.]+|[\s.]+$/g, "")
  if (RESERVED_NAMES.test(out)) return `${out}_`
  return out || FALLBACK_STEM
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
 * The file's name without the extension it will be given back.
 *
 * Stripped with the same pattern `extFromName` matches, so the stem and the
 * extension always come from the same place and cannot disagree.
 */
function stemFromName(name: string): string {
  return String(name ?? "")
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
}

/**
 * Build the ZIP path for every attachment (§7.2):
 * `{folder}/{YYYY}/{MM}/{slug(file name)}.{ext}`. `-2`, `-3`, … is appended
 * before the extension when two receipts of the same month share a name.
 *
 * **The receipt keeps the name it already has.** A user who files an invoice
 * as "2.11.2026 - HC-Maschinentechnik - Lasku.pdf" has already said what it
 * is, so the archive says the same rather than renaming it after the entry.
 * That also makes the path a fixed point: the name a re-import reads off the
 * path is the name the next export writes, so a book can go round any number
 * of times without its receipts drifting.
 *
 * Missing attachments keep their stored path and reserve it, so a real
 * attachment colliding with one gets the suffix instead.
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
      const base = `${RECEIPT_FOLDER[lang]}/${y}/${mo}/${receiptStem(a.name)}`
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

/** Strip what a file system will not accept, and a trailing ".csv" or ".zip". */
export function cleanFileName(input: string): string {
  return stripUnsafeChars(input)
    .replace(/\.(csv|zip)$/i, "")
    .trim()
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
