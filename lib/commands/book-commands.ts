import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import { rememberHandle } from "@/lib/browser/file-handle"
import { heldByAnotherTab } from "@/lib/browser/tab-lock"
import type { Entry } from "@/lib/domain/types"
import { LANDING, APP_ROUTES } from "@/lib/site"
import { confirm } from "@/lib/ui/confirm"
import type { Ctx } from "@/lib/commands/ctx"
import { useBookStore } from "@/stores/book-store"

/**
 * Commands that never touch a file format.
 *
 * Kept apart from io-commands so the landing page — which needs "start" and
 * the §8.11 guards — does not drag jszip and papaparse into the statically
 * rendered, SEO-critical bundle.
 */

/**
 * Forget the file this bookkeeping was linked to (§7.5), in the store and in
 * IndexedDB. Both ways of leaving a bookkeeping behind go through here: the
 * stored handle outlives a reload, so a new book that skipped this step would
 * find the old file waiting and save itself over it.
 */
async function unlinkFile(): Promise<void> {
  useBookStore.getState().forgetFileHandle()
  await rememberHandle(null)
}

/** Ask before discarding unsaved changes (§8.11). False aborts. */
export async function guardDirty(
  ctx: Ctx,
  replacing: boolean
): Promise<boolean> {
  if (!useBookStore.getState().dirty) return true
  return confirm({
    title: replacing
      ? ctx.t("confirm.replaceTitle")
      : ctx.t("confirm.closeTitle"),
    message: replacing
      ? ctx.t("confirm.replaceMessage")
      : ctx.t("confirm.closeMessage"),
    confirmLabel: replacing
      ? ctx.t("confirm.replaceConfirm")
      : ctx.t("confirm.closeConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
}

/**
 * Refuse to replace the bookkeeping while another tab has it open (§12): that
 * tab would overwrite the new book in storage and delete its receipts.
 */
export async function refuseIfOpenElsewhere(ctx: Ctx): Promise<boolean> {
  if (!(await heldByAnotherTab())) return false
  toast.add({ title: ctx.t("file.openElsewhere") })
  return true
}

export async function startNewBook(ctx: Ctx): Promise<void> {
  if (await refuseIfOpenElsewhere(ctx)) return
  if (!(await guardDirty(ctx, false))) return
  releaseAllObjectUrls()
  await unlinkFile()
  useBookStore.getState().newBook(new Date().getFullYear())
  ctx.navigate(APP_ROUTES.overview)
}

export async function closeBook(ctx: Ctx): Promise<void> {
  if (!(await guardDirty(ctx, false))) return
  releaseAllObjectUrls()
  await unlinkFile()
  useBookStore.getState().closeBook()
  toast.add({ title: ctx.t("file.closed") })
  ctx.navigate(LANDING)
}

export async function deleteEntry(ctx: Ctx, entry: Entry): Promise<boolean> {
  // Loaded on demand: the landing page imports this module (§11b).
  const { filedChangeNotice } = await import("@/lib/commands/filed-commands")
  const filed = filedChangeNotice(
    useBookStore.getState().entries.filter((e) => e.id !== entry.id)
  )
  const message = ctx.t("confirm.deleteMessage", {
    x: entry.description || ctx.t("ledger.noDescription"),
  })
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteTitle"),
    message: filed
      ? `${message}

${filed}`
      : message,
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false
  useBookStore.getState().removeEntry(entry.id)
  offerUndo(ctx, [entry], ctx.t("entry.deleted"), ctx.t("entry.restored"))
  return true
}

export async function clearAllEntries(ctx: Ctx): Promise<void> {
  const confirmed = await confirm({
    title: ctx.t("confirm.clearTitle"),
    message: ctx.t("confirm.clearMessage"),
    confirmLabel: ctx.t("confirm.clearConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return
  const removed = useBookStore.getState().entries
  releaseAllObjectUrls()
  useBookStore.getState().clearEntries()
  offerUndo(ctx, removed, ctx.t("settings.cleared"), ctx.t("settings.restored"))
}

/** How long a deletion can be undone. Long enough to read and reach the button. */
export const UNDO_TIMEOUT_MS = 10_000

/**
 * Raise a toast with "Kumoa" for entries just deleted (§14). Their receipts
 * stay in IndexedDB until the toast is gone, or the undo would bring back
 * entries whose files the sweep had already removed. An undo after another
 * bookkeeping has taken over does nothing.
 */
function offerUndo(
  ctx: Ctx,
  removed: readonly Entry[],
  title: string,
  restoredTitle: string
): void {
  const store = useBookStore.getState()
  if (removed.length === 0) {
    toast.add({ title })
    return
  }
  const epoch = store.bookEpoch
  const held = removed.flatMap((e) =>
    (e.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  )
  store.holdUndoAttachments(held)
  const id = toast.add({
    title,
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.restoreEntries(removed)
        toast.add({ title: restoredTitle })
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
}

export function resetCategories(ctx: Ctx): void {
  useBookStore.getState().resetCategories()
  toast.add({ title: ctx.t("settings.categoriesReset") })
}

/** How many receipts are actually available to pack. */
export function availableReceiptCount(entries: readonly Entry[]): number {
  let n = 0
  for (const e of entries) {
    for (const a of e.atts ?? []) if (a.id) n += 1
  }
  return n
}
