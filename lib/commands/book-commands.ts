import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import { defaultCategories } from "@/lib/domain/accounts"
import { demoEntries } from "@/lib/domain/demo"
import type { Entry } from "@/lib/domain/types"
import { landingFor, APP_ROUTES } from "@/lib/site"
import { confirm } from "@/lib/ui/confirm"
import type { Ctx } from "@/lib/commands/ctx"
import { useBookStore } from "@/stores/book-store"

/**
 * Commands that never touch a file format.
 *
 * Kept apart from io-commands so the landing page — which needs "start",
 * "try the sample" and the §8.11 guards — does not drag jszip and papaparse
 * into the statically rendered, SEO-critical bundle.
 */

/** Ask before discarding unexported changes (§8.11). False aborts. */
export async function guardDirty(
  ctx: Ctx,
  replacing: boolean
): Promise<boolean> {
  const { dirty, entries } = useBookStore.getState()
  if (!dirty || entries.length === 0) return true
  return confirm({
    title: replacing ? ctx.t("replaceT") : ctx.t("closeT"),
    message: replacing ? ctx.t("replaceMsg") : ctx.t("closeMsg"),
    confirmLabel: replacing ? ctx.t("replaceYes") : ctx.t("closeAnyway"),
    cancelLabel: ctx.t("cancel"),
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
  const lang = useBookStore.getState().lang
  releaseAllObjectUrls()
  useBookStore.getState().closeBook()
  toast.add({ title: ctx.t("closed") })
  ctx.navigate(landingFor(lang))
}

export async function loadDemo(ctx: Ctx): Promise<void> {
  if (!(await guardDirty(ctx, true))) return
  releaseAllObjectUrls()
  useBookStore.getState().replaceBook({
    entries: demoEntries(),
    cats: defaultCategories(),
    fileName: null,
    year: 2026,
    // §10: the demo starts dirty, so the user is nudged to export.
    dirty: true,
  })
  toast.add({ title: ctx.t("demoLoaded") })
  ctx.navigate(APP_ROUTES.ledger)
}

export async function deleteEntry(ctx: Ctx, entry: Entry): Promise<boolean> {
  const confirmed = await confirm({
    title: ctx.t("delT"),
    message: ctx.t("delMsg", { x: entry.selite || ctx.t("noDesc") }),
    confirmLabel: ctx.t("del"),
    cancelLabel: ctx.t("cancel"),
  })
  if (!confirmed) return false
  useBookStore.getState().removeEntry(entry.id)
  toast.add({ title: ctx.t("deleted") })
  return true
}

export async function clearAllEntries(ctx: Ctx): Promise<void> {
  const confirmed = await confirm({
    title: ctx.t("clearT"),
    message: ctx.t("clearMsg"),
    confirmLabel: ctx.t("clearYes"),
    cancelLabel: ctx.t("cancel"),
  })
  if (!confirmed) return
  releaseAllObjectUrls()
  useBookStore.getState().clearEntries()
  toast.add({ title: ctx.t("cleared") })
}

export function resetCategories(ctx: Ctx): void {
  useBookStore.getState().resetCategories()
  toast.add({ title: ctx.t("catsReset") })
}

/** How many receipts are actually available to pack. */
export function availableReceiptCount(entries: readonly Entry[]): number {
  let n = 0
  for (const e of entries) {
    for (const a of e.atts ?? []) if (a.id) n += 1
  }
  return n
}
