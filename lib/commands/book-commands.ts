import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
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

/** Ask before discarding unexported changes (§8.11). False aborts. */
export async function guardDirty(
  ctx: Ctx,
  replacing: boolean
): Promise<boolean> {
  const { dirty, entries } = useBookStore.getState()
  if (!dirty || entries.length === 0) return true
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

export async function startNewBook(ctx: Ctx): Promise<void> {
  if (!(await guardDirty(ctx, false))) return
  releaseAllObjectUrls()
  useBookStore.getState().newBook(new Date().getFullYear())
  ctx.navigate(APP_ROUTES.ledger)
}

export async function closeBook(ctx: Ctx): Promise<void> {
  if (!(await guardDirty(ctx, false))) return
  releaseAllObjectUrls()
  useBookStore.getState().closeBook()
  toast.add({ title: ctx.t("file.closed") })
  ctx.navigate(LANDING)
}

export async function deleteEntry(ctx: Ctx, entry: Entry): Promise<boolean> {
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteTitle"),
    message: ctx.t("confirm.deleteMessage", {
      x: entry.description || ctx.t("ledger.noDescription"),
    }),
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false
  useBookStore.getState().removeEntry(entry.id)
  toast.add({ title: ctx.t("entry.deleted") })
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
  releaseAllObjectUrls()
  useBookStore.getState().clearEntries()
  toast.add({ title: ctx.t("settings.cleared") })
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
