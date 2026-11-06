import { toast } from "@/components/ui/toast"
import {
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { uid } from "@/lib/domain/id"
import { memoFileName, type MemoVoucher } from "@/lib/domain/memo-voucher"
import { receiptStem } from "@/lib/domain/receipt-path"
import type { Attachment, Entry } from "@/lib/domain/types"
import type { ReportDoc } from "@/lib/domain/year-reports"
import { useBookStore } from "@/stores/book-store"

function release(id: string): void {
  const store = useBookStore.getState()
  store.setDraftAttachmentIds(store.draftAttachmentIds.filter((d) => d !== id))
}

/**
 * Write a generated PDF to receipt storage and return it as an attachment, or
 * null with a toast when it cannot be stored. Its id is registered before the
 * bytes are written, so a receipt sweep cannot take it (§7.4). The caller
 * releases it once an entry or an open dialog holds it.
 */
async function storePdf(
  ctx: Ctx,
  name: string,
  render: () => Promise<Uint8Array>
): Promise<Attachment | null> {
  if (!isReceiptStorageSupported()) {
    toast.add({ title: ctx.t("memo.failed") })
    return null
  }
  const id = `a-${uid()}`
  const store = useBookStore.getState()
  store.setDraftAttachmentIds([...store.draftAttachmentIds, id])
  try {
    const bytes = await render()
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
    await putReceipt(id, blob)
    return { id, name, type: blob.type, size: blob.size }
  } catch (error) {
    console.warn("Generated voucher could not be stored", error)
    release(id)
    toast.add({ title: ctx.t("memo.failed") })
    return null
  }
}

/** Write a memo voucher (§8.8) to receipt storage as an attachment. */
export function storeMemo(
  ctx: Ctx,
  memo: MemoVoucher
): Promise<Attachment | null> {
  return storePdf(ctx, memoFileName(memo), async () => {
    const { renderMemoPdf } = await import("@/lib/browser/memo-pdf")
    return renderMemoPdf(memo)
  })
}

/**
 * Write a VAT return report (§8.7) to receipt storage as an attachment, the
 * voucher a payment or refund of that return rests on.
 */
export function storeReport(
  ctx: Ctx,
  doc: ReportDoc
): Promise<Attachment | null> {
  return storePdf(ctx, `${receiptStem(doc.title)}.pdf`, async () => {
    const { renderReportPdf } = await import("@/lib/browser/report-pdf")
    return renderReportPdf(doc)
  })
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
