import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import { rememberHandle } from "@/lib/browser/file-handle"
import { loadSnapshotIndex } from "@/lib/browser/snapshot-store"
import {
  gcReceipts,
  isReceiptStorageSupported,
} from "@/lib/browser/receipt-store"
import { pruneReceiptHashes } from "@/lib/browser/receipt-hash-db"
import { pruneReceiptText } from "@/lib/browser/receipt-text-db"
import { heldByAnotherTab } from "@/lib/browser/tab-lock"
import { addDays, todayIso, yearOf } from "@/lib/domain/dates"
import type { InboxItem } from "@/lib/domain/inbox"
import { collectLiveIds } from "@/lib/domain/gc"
import { invoiceFileIds } from "@/lib/domain/invoice-links"
import { historyAttachmentIds } from "@/lib/domain/history"
import { snapshotAttachmentIds } from "@/lib/domain/save-snapshots"
import { lockedEntries } from "@/lib/domain/period-lock"
import type { RecurringEntry } from "@/lib/domain/recurring"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { splitSiblings } from "@/lib/domain/split"
import { vatTimeline } from "@/lib/domain/vat-deadline"
import { renumberYear } from "@/lib/domain/voucher"
import { LANDING, APP_ROUTES } from "@/lib/site"
import { choose, confirm } from "@/lib/ui/confirm"
import type { Ctx } from "@/lib/commands/ctx"
import { useBookStore } from "@/stores/book-store"
import { useHistoryStore } from "@/stores/history-store"
import { useLangStore } from "@/stores/lang-store"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"
import { useReceiptTextStore } from "@/stores/receipt-text-store"
import { useSnapshotStore } from "@/stores/snapshot-store"

/**
 * Commands that never touch a file format.
 *
 * Kept apart from io-commands so the landing page — which needs "start" and
 * the §8.11 guards — does not drag zip.js and papaparse into the statically
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

/**
 * Delete the receipts nothing refers to (§7.4). It waits out an import: receipts
 * going into IndexedDB belong to no entry until the whole file has been read.
 */
export async function sweepReceipts(): Promise<void> {
  if (!isReceiptStorageSupported()) return
  try {
    /* A receipt an earlier save still needs is live too (§8.36). */
    const snapshots = await loadSnapshotIndex()
    if (!snapshots) return
    const swept: { live?: ReadonlySet<string> } = {}
    await gcReceipts(() => {
      const state = useBookStore.getState()
      if (state.importing) return null
      swept.live = collectLiveIds(state.entries, [
        ...state.inbox.map((i) => i.id),
        ...invoiceFileIds(state.invoices),
        ...snapshotAttachmentIds(useSnapshotStore.getState().metas),
        ...state.draftAttachmentIds,
        ...state.undoAttachmentIds,
        ...historyAttachmentIds(useHistoryStore.getState()),
      ])
      return swept.live
    })
    /* The search text of a deleted receipt goes with it (§8.4). */
    if (swept.live) {
      await pruneReceiptText(swept.live)
      useReceiptTextStore.getState().keepOnly(swept.live)
      await pruneReceiptHashes(swept.live)
      useReceiptHashStore.getState().keepOnly(swept.live)
    }
  } catch (error) {
    /*
     * A failed sweep leaks a blob, which is harmless. It must never surface as
     * a user-facing error.
     */
    console.warn("Receipt garbage collection failed", error)
  }
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
  useBookStore
    .getState()
    .newBook(new Date().getFullYear(), useLangStore.getState().lang)
  ctx.navigate(APP_ROUTES.overview)
  /*
   * §8.3: ask for the book's settings rather than leaving the defaults
   * unspoken. The host is in AppShell, which the route above mounts.
   */
  useBookStore.getState().openDialog({ kind: "setup" })
}

/**
 * Open the demo book (§8.32) in place of whatever was open, after the same
 * guards as a new book. It is never linked to a file and autosave stays off.
 */
export async function startDemoBook(ctx: Ctx): Promise<void> {
  if (await refuseIfOpenElsewhere(ctx)) return
  if (!(await guardDirty(ctx, true))) return
  releaseAllObjectUrls()
  await unlinkFile()
  const { demoBook, receiptPdf, DEMO_BUSINESS } =
    await import("@/lib/domain/demo-book")
  const today = todayIso()
  const { receipts, ...book } = demoBook(today)
  /*
   * The inbox's receipts are real files in the browser's store, like any the
   * user adds. One that cannot be stored is left out, and the demo opens
   * without it.
   */
  const { storeInboxFile } = await import("@/lib/commands/inbox-commands")
  const inbox: InboxItem[] = []
  for (const receipt of receipts) {
    const file = new File(
      [receiptPdf(receipt.lines(today)) as BlobPart],
      receipt.name,
      { type: "application/pdf" }
    )
    try {
      inbox.push(
        await storeInboxFile(
          file,
          addDays(today, -receipt.daysAgo),
          receipt.name
        )
      )
    } catch {
      /* The demo is whole without it. */
    }
  }
  /* The returns already due are filed, as a trader keeping up would have. */
  const filed = vatTimeline("month", `${book.year}-01-01`, today, {})
    .filter((p) => p.due < today)
    .map((p) => ({ key: p.key, on: p.due }))
  useBookStore.getState().startDemo({
    ...book,
    inbox,
    businessName: DEMO_BUSINESS.name,
    businessId: DEMO_BUSINESS.id,
    filed,
  })
  ctx.navigate(APP_ROUTES.overview)
}

export async function closeBook(ctx: Ctx): Promise<void> {
  if (!(await guardDirty(ctx, false))) return
  releaseAllObjectUrls()
  await unlinkFile()
  useBookStore.getState().closeBook()
  /*
   * Now rather than through useReceiptGc, whose wait is cut short as the app
   * shell unmounts: a closed book's receipts do not stay in the browser.
   */
  void sweepReceipts()
  toast.add({ title: ctx.t("file.closed") })
  ctx.navigate(LANDING)
}

export async function deleteEntry(ctx: Ctx, entry: Entry): Promise<boolean> {
  if (refuseLocked(ctx, [entry])) return false
  const siblings = splitSiblings(entry, useBookStore.getState().entries)
  if (siblings.length > 0) return deleteSplitPart(ctx, entry, siblings)
  const message = ctx.t("confirm.deleteMessage", {
    x: entry.description || ctx.t("ledger.noDescription"),
  })
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteTitle"),
    message,
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false
  useBookStore.getState().removeEntry(entry.id)
  offerUndo(ctx, [entry], ctx.t("entry.deleted"), ctx.t("entry.restored"))
  return true
}

/**
 * Deleting one part of a split receipt asks whether to take the other parts
 * with it (§8.4). Deleting only this part leaves the others as they are, and
 * one undo brings back whatever went.
 */
async function deleteSplitPart(
  ctx: Ctx,
  entry: Entry,
  siblings: readonly Entry[]
): Promise<boolean> {
  const all = [entry, ...siblings]
  const answer = await choose({
    title: ctx.t("confirm.deleteSplitTitle", { n: all.length }),
    message: ctx.t("confirm.deleteSplitMessage", {
      x: entry.description || ctx.t("ledger.noDescription"),
    }),
    confirmLabel: ctx.t("confirm.deleteSplitAll", { n: all.length }),
    alternativeLabel: ctx.t("confirm.deleteSplitOne"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (answer === "cancel") return false

  const removed = answer === "confirm" ? all : [entry]
  if (answer === "confirm" && refuseLocked(ctx, all)) return false
  useBookStore.getState().removeEntries(removed.map((e) => e.id))
  if (removed.length === 1) {
    offerUndo(ctx, removed, ctx.t("entry.deleted"), ctx.t("entry.restored"))
  } else {
    offerUndo(
      ctx,
      removed,
      ctx.t("entry.deletedMany", { n: removed.length }),
      ctx.t("entry.restoredMany")
    )
  }
  return true
}

/**
 * Stop a change to entries a filed VAT return counts, or in a stored year
 * (KPL 2:7, §8.11). True when something was locked and the user has been told.
 */
export function refuseLocked(ctx: Ctx, entries: readonly Entry[]): boolean {
  const state = useBookStore.getState()
  const locked = lockedEntries(entries, state, indexCategories(state.cats))
  if (locked.length === 0) return false
  toast.add({ title: ctx.t("entry.lockedRefused", { n: locked.length }) })
  return true
}

/**
 * Erase the whole bookkeeping from this browser (§8.10): the entries, the
 * settings, the receipts in IndexedDB and the stored blob, then back to the
 * landing page. It cannot be undone, so the confirmation says so and says to
 * export first. Only the browser's copy goes; a file on disk is untouched.
 * It is the user's own decision about their working buffer, so locked periods
 * do not stop it, and unsaved changes need no second prompt.
 */
export async function deleteBook(ctx: Ctx): Promise<void> {
  if (await refuseIfOpenElsewhere(ctx)) return
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteBookTitle"),
    message: ctx.t("confirm.deleteBookMessage"),
    confirmLabel: ctx.t("confirm.deleteBookConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return
  releaseAllObjectUrls()
  await unlinkFile()
  useBookStore.getState().closeBook()
  /*
   * With no entries and no open book every stored receipt is unreferenced, and
   * the store refuses to recreate its key while there is no bookkeeping.
   */
  await sweepReceipts()
  useBookStore.persist.clearStorage()
  toast.add({ title: ctx.t("settings.bookDeleted") })
  ctx.navigate(LANDING)
}

/** How long a deletion can be undone. Long enough to read and reach the button. */
export const UNDO_TIMEOUT_MS = 10_000

/**
 * Number a year's entries again in date order (§4). It asks first, because a
 * number written on a paper receipt or in a copy of the file stops matching.
 * False when nothing would change or the user cancels.
 */
export async function renumberVouchers(
  ctx: Ctx,
  year: number
): Promise<boolean> {
  const before = useBookStore.getState()
  if (
    refuseLocked(
      ctx,
      before.entries.filter((e) => yearOf(e.date) === year)
    )
  ) {
    return false
  }
  const after = renumberYear(before.entries, year)
  const previous = new Map(before.entries.map((e) => [e.id, e.voucher]))
  const numbers = new Map(
    after.flatMap((e) =>
      e.voucher !== undefined && e.voucher !== previous.get(e.id)
        ? [[e.id, e.voucher] as const]
        : []
    )
  )
  if (numbers.size === 0) return false

  const confirmed = await confirm({
    title: ctx.t("confirm.renumberTitle", { year }),
    message: ctx.t("confirm.renumberMessage", { n: numbers.size }),
    confirmLabel: ctx.t("confirm.renumberConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.setVouchers(numbers)
  const id = toast.add({
    title: ctx.t("settings.renumbered", { n: numbers.size }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        // An entry moved to another year since belongs to that year's series.
        now.setVouchers(
          new Map(
            now.entries.flatMap((e) => {
              const old = numbers.has(e.id) ? previous.get(e.id) : undefined
              return old !== undefined && yearOf(e.date) === year
                ? [[e.id, old] as const]
                : []
            })
          )
        )
        toast.add({ title: ctx.t("settings.renumberUndone") })
      },
    },
  })
  return true
}

/**
 * Raise a toast with "Kumoa" for entries just deleted (§8.11). Their receipts
 * stay in IndexedDB until the toast is gone, or the undo would bring back
 * entries whose files the sweep had already removed. An undo after another
 * bookkeeping has taken over does nothing.
 */
export function offerUndo(
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
  const catsAtDelete = store.cats
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
        // A custom category with no entries left can be deleted in the meantime.
        const used = new Set(removed.map((e) => e.catId))
        const present = new Set(now.cats.map((c) => c.id))
        const gone = catsAtDelete.filter(
          (c) => used.has(c.id) && !present.has(c.id)
        )
        if (gone.length) now.setCategories([...now.cats, ...gone])
        now.restoreEntries(removed)
        toast.add({ title: restoredTitle })
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
}

/**
 * Raise a toast with "Kumoa" for an entry just edited (§8.11). The undo puts
 * the whole entry back as it was, its voucher number and its monthly template
 * included. Receipts the edit removed stay in IndexedDB while the toast is up.
 * It does nothing once the entry has been changed again or is locked, and
 * after another bookkeeping has taken over.
 */
export function offerEditUndo(
  ctx: Ctx,
  before: Entry,
  recurringBefore: readonly RecurringEntry[]
): void {
  const store = useBookStore.getState()
  const saved = store.entries.find((e) => e.id === before.id)
  if (!saved) return
  const epoch = store.bookEpoch
  const held = (before.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  store.holdUndoAttachments(held)
  const id = toast.add({
    title: ctx.t("entry.changesSaved"),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const current = now.entries.find((e) => e.id === before.id)
        if (!current || JSON.stringify(current) !== JSON.stringify(saved)) {
          toast.add({ title: ctx.t("entry.editUndoChanged") })
          return
        }
        if (refuseLocked(ctx, [current, before])) return
        now.updateEntries([before])
        // A move to another year takes a new number there; the old one is back.
        if (
          before.voucher !== undefined &&
          yearOf(before.date) !== yearOf(current.date)
        ) {
          now.setVouchers(new Map([[before.id, before.voucher]]))
        }
        const was = new Map(recurringBefore.map((r) => [r.id, r]))
        for (const r of now.recurring) {
          if (!was.has(r.id)) now.removeRecurring(r.id)
        }
        const here = new Map(now.recurring.map((r) => [r.id, r]))
        for (const [rid, r] of was) {
          if (JSON.stringify(here.get(rid)) !== JSON.stringify(r)) {
            now.upsertRecurring(r)
          }
        }
        toast.add({ title: ctx.t("entry.editUndone") })
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
