import { toast } from "@/components/ui/toast"
import {
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { uid } from "@/lib/domain/id"
import { memoFileName, type MemoVoucher } from "@/lib/domain/memo-voucher"
import type { Attachment, Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

function release(id: string): void {
  const store = useBookStore.getState()
  store.setDraftAttachmentIds(store.draftAttachmentIds.filter((d) => d !== id))
}

/**
 * Write a memo voucher (§8.8) to receipt storage and return it as an
 * attachment, or null with a toast when it cannot be stored. Its id is
 * registered before the bytes are written, so a receipt sweep cannot take it
 * (§7.4). The caller releases it once an entry or an open dialog holds it.
 */
export async function storeMemo(
  ctx: Ctx,
  memo: MemoVoucher
): Promise<Attachment | null> {
  if (!isReceiptStorageSupported()) {
    toast.add({ title: ctx.t("memo.failed") })
    return null
  }
  const id = `a-${uid()}`
  const store = useBookStore.getState()
  store.setDraftAttachmentIds([...store.draftAttachmentIds, id])
  try {
    const { renderMemoPdf } = await import("@/lib/browser/memo-pdf")
    const bytes = await renderMemoPdf(memo)
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
    await putReceipt(id, blob)
    return { id, name: memoFileName(memo), type: blob.type, size: blob.size }
  } catch (error) {
    console.warn("Memo voucher could not be stored", error)
    release(id)
    toast.add({ title: ctx.t("memo.failed") })
    return null
  }
}

/**
 * Book a calculated entry with its memo voucher attached. When the memo cannot
 * be stored the entry is still booked, and the "no receipt" check of §8.4
 * flags it, so the user can attach one by hand.
 */
export async function bookWithMemo(
  ctx: Ctx,
  entry: Entry,
  memo: MemoVoucher,
  title: string
): Promise<boolean> {
  const att = await storeMemo(ctx, memo)
  try {
    return await addEntriesWithUndo(
      ctx,
      [att ? { ...entry, atts: [att] } : entry],
      title
    )
  } finally {
    if (att?.id) release(att.id)
  }
}
