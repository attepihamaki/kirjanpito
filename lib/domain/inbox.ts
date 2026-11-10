import {
  extensionFor,
  isReceiptFile,
  isReceiptPath,
  receiptStem,
} from "@/lib/domain/receipt-path"
import type { Cents, Lang } from "@/lib/domain/types"

/**
 * The receipt inbox (§8.31): receipts added on their own, kept until each is
 * turned into an entry. A receipt in the inbox is stored like an attached one,
 * in IndexedDB under `id`, and is written into the ZIP beside the entries'
 * receipts, so the inbox travels with the file.
 */
export interface InboxItem {
  /** The stored receipt's IndexedDB id. */
  id: string
  name: string
  /** MIME type, or "" when the file had none. */
  type: string
  size: number
  /** The day it was added, ISO. */
  added: string
  /** What a PDF's text layer gave, for the list; absent when nothing was read. */
  guess?: InboxGuess
}

/** The figures shown for an inbox item before it becomes an entry. */
export interface InboxGuess {
  date: string | null
  /** The total including VAT. */
  amount: Cents | null
  vendor: string | null
}

/** An inbox item as `settings.json` lists it, with where its bytes are in the ZIP. */
export interface InboxFileItem extends Omit<InboxItem, "id"> {
  path: string
}

/** The inbox's folder in the ZIP, per export language, beside the receipt folder. */
const INBOX_FOLDER: Readonly<Record<Lang, string>> = {
  fi: "saapuneet",
  en: "inbox",
}

/** The key an inbox item's path is held under among the receipts' paths. */
export function inboxKey(id: string): string {
  return `inbox:${id}`
}

/**
 * The ZIP path for each item, keyed by `inboxKey`: `{folder}/{name}.{ext}`,
 * with `-2`, `-3`, … when two items share a name. A file that is not an image
 * or a PDF gets no path, like a receipt (§7.4).
 */
export function inboxPaths(
  items: readonly InboxItem[],
  lang: Lang
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  const used = new Set<string>()
  for (const item of items) {
    if (!isReceiptFile(item)) continue
    const base = `${INBOX_FOLDER[lang]}/${receiptStem(item.name)}`
    const ext = extensionFor(item)
    let path = `${base}.${ext}`
    let n = 2
    while (used.has(path.toLowerCase())) path = `${base}-${n++}.${ext}`
    used.add(path.toLowerCase())
    paths.set(inboxKey(item.id), path)
  }
  return paths
}

/** The items as `settings.json` lists them; one without a path is left out. */
export function inboxFileItems(
  items: readonly InboxItem[],
  paths: ReadonlyMap<string, string>
): InboxFileItem[] {
  return items.flatMap(({ id, ...item }) => {
    const path = paths.get(inboxKey(id))
    return path ? [{ ...item, path }] : []
  })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseGuess(value: unknown): InboxGuess | undefined {
  if (!isRecord(value)) return undefined
  const date =
    typeof value.date === "string" && ISO_DATE.test(value.date)
      ? value.date
      : null
  const amount =
    Number.isSafeInteger(value.amount) && (value.amount as number) > 0
      ? (value.amount as number)
      : null
  const vendor =
    typeof value.vendor === "string" && value.vendor.trim()
      ? value.vendor.trim()
      : null
  return date || amount !== null || vendor
    ? { date, amount, vendor }
    : undefined
}

/** One listed item, or null when it is unusable. Lenient like the rest of §7.6. */
export function parseInboxFileItem(value: unknown): InboxFileItem | null {
  if (!isRecord(value)) return null
  const { path, name, type, size, added } = value
  if (typeof path !== "string" || !isReceiptPath(path)) return null
  const fileName =
    typeof name === "string" && name.trim()
      ? name
      : (path.split("/").pop() ?? path)
  const guess = parseGuess(value.guess)
  return {
    path,
    name: fileName,
    type: typeof type === "string" ? type : "",
    size: Number.isSafeInteger(size) && (size as number) >= 0 ? size : 0,
    added: typeof added === "string" && ISO_DATE.test(added) ? added : "",
    ...(guess ? { guess } : {}),
  } as InboxFileItem
}

/** The guess worth keeping from an invoice's text, or undefined for none. */
export function inboxGuess(read: InboxGuess): InboxGuess | undefined {
  return read.date || read.amount !== null || read.vendor
    ? { date: read.date, amount: read.amount, vendor: read.vendor }
    : undefined
}
