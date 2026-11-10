import { toast } from "@/components/ui/toast"

import { getReceipt, putReceipt } from "@/lib/browser/receipt-store"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { inboxGuess, type InboxGuess, type InboxItem } from "@/lib/domain/inbox"
import { parseInvoiceText } from "@/lib/domain/invoice-text"
import { isPdf, isReceiptFile } from "@/lib/domain/receipt-path"
import type { Ctx } from "@/lib/commands/ctx"
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
    const id = `a-${uid()}`
    try {
      await putReceipt(id, file)
    } catch {
      toast.add({ title: ctx.t("inbox.storeFailed"), priority: "high" })
      break
    }
    const guess = await readGuess(file)
    added.push({
      id,
      name: file.name || ctx.t("inbox.photoName", { d: day }),
      type: file.type,
      size: file.size,
      added: day,
      ...(guess ? { guess } : {}),
    })
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
