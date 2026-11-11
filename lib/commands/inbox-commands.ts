import { toast } from "@/components/ui/toast"

import { getReceipt, putReceipt } from "@/lib/browser/receipt-store"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { inboxGuess, type InboxGuess, type InboxItem } from "@/lib/domain/inbox"
import { parseInvoiceText } from "@/lib/domain/invoice-text"
import { isPdf, isReceiptFile } from "@/lib/domain/receipt-path"
import { refuseLocked, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import type { Attachment, Entry } from "@/lib/domain/types"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/**
 * The receipt inbox (§8.31): receipts added now and booked later, one entry
 * at a time, through the entry dialog that reads a PDF's text as it opens.
 */

/** What a PDF's text layer says, or nothing for an image or a scanned page. */
async function readGuess(file: File): Promise<InboxGuess | undefined> {
  if (!isPdf(file)) return undefined
  try {
    const { extractPdfText } = await import("@/lib/browser/pdf")
    const guess = parseInvoiceText(await extractPdfText(file))
    return inboxGuess(guess)
  } catch {
    return undefined
  }
}

/**
 * Store `file` and describe it as an inbox item added on `day`, reading what
 * a PDF's text gives. It throws when the browser cannot store the file.
 */
export async function storeInboxFile(
  file: File,
  day: string,
  fallbackName: string
): Promise<InboxItem> {
  const id = `a-${uid()}`
  await putReceipt(id, file)
  const guess = await readGuess(file)
  return {
    id,
    name: file.name || fallbackName,
    type: file.type,
    size: file.size,
    added: day,
    ...(guess ? { guess } : {}),
  }
}

/**
 * Store each image or PDF among `files` and add it to the inbox. Anything else
 * is refused with a toast. Returns how many were added.
 */
export async function addToInbox(ctx: Ctx, files: File[]): Promise<number> {
  const accepted = files.filter(isReceiptFile)
  if (accepted.length < files.length) {
    toast.add({ title: ctx.t("receipt.badType") })
  }
  const added: InboxItem[] = []
  const day = todayIso()
  for (const file of accepted) {
    try {
      added.push(
        await storeInboxFile(file, day, ctx.t("inbox.photoName", { d: day }))
      )
    } catch {
      toast.add({ title: ctx.t("inbox.storeFailed"), priority: "high" })
      break
    }
  }
  useBookStore.getState().addInboxItems(added)
  if (added.length) {
    toast.add({ title: ctx.t("inbox.added", { n: added.length }) })
  }
  return added.length
}

/**
 * Open the entry dialog with the item's receipt attached, so its text fills
 * the form. Saving the entry takes the item out of the inbox.
 */
export async function bookInboxItem(ctx: Ctx, item: InboxItem): Promise<void> {
  const blob = await getReceipt(item.id).catch(() => undefined)
  if (!blob) {
    toast.add({ title: ctx.t("inbox.missing"), priority: "high" })
    return
  }
  const file = new File([blob], item.name, {
    type: item.type || blob.type,
  })
  useBookStore.getState().openDialog({
    kind: "entry",
    mode: "new",
    files: [file],
    inboxId: item.id,
  })
}

/**
 * Open the entry dialog for the item as a bill still to pay (§8.30): open,
 * with the due date and the payment details its text gave, and the receipt
 * attached so the rest of the form fills as for any PDF.
 */
export async function bookInboxBill(ctx: Ctx, item: InboxItem): Promise<void> {
  const blob = await getReceipt(item.id).catch(() => undefined)
  if (!blob) {
    toast.add({ title: ctx.t("inbox.missing"), priority: "high" })
    return
  }
  const guess = item.guess
  useBookStore.getState().openDialog({
    kind: "entry",
    mode: "new",
    files: [new File([blob], item.name, { type: item.type || blob.type })],
    inboxId: item.id,
    prefill: {
      type: "expense",
      paidOn: null,
      ...(guess?.dueDate ? { due: guess.dueDate } : {}),
      ...(guess?.iban ? { iban: guess.iban } : {}),
      ...(guess?.reference ? { reference: guess.reference } : {}),
    },
  })
}

/**
 * Add the item's file to a voucher already in the book as one more receipt,
 * and take it out of the inbox (§8.31). A locked voucher refuses (§8.11). The
 * toast undoes both.
 */
export function attachInboxItem(
  ctx: Ctx,
  item: InboxItem,
  entry: Entry
): boolean {
  if (refuseLocked(ctx, [entry])) return false
  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  const att: Attachment = {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
  }
  store.updateEntries([{ ...entry, atts: [...(entry.atts ?? []), att] }])
  store.removeInboxItem(item.id)
  const id = toast.add({
    title: ctx.t("inbox.attached", {
      x: entry.description || ctx.t("ledger.noDescription"),
    }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.updateEntries([entry])
        now.addInboxItems([item])
      },
    },
  })
  return true
}

/** Remove an item after asking; its stored file goes in the next sweep. */
export async function deleteInboxItem(
  ctx: Ctx,
  item: InboxItem
): Promise<boolean> {
  const ok = await confirm({
    title: ctx.t("inbox.deleteTitle"),
    message: ctx.t("inbox.deleteMessage", { x: item.name }),
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!ok) return false
  useBookStore.getState().removeInboxItem(item.id)
  toast.add({ title: ctx.t("inbox.deleted") })
  return true
}
