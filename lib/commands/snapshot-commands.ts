import { toast } from "@/components/ui/toast"
import { rememberHandle } from "@/lib/browser/file-handle"
import { isReceiptStorageSupported } from "@/lib/browser/receipt-store"
import {
  deleteSnapshot,
  getSnapshot,
  loadSnapshotIndex,
  putSnapshot,
} from "@/lib/browser/snapshot-store"
import { capChangeLog, entryChanges } from "@/lib/domain/change-log"
import { collectLiveIds } from "@/lib/domain/gc"
import { invoiceFileIds } from "@/lib/domain/invoice-links"
import { uid } from "@/lib/domain/id"
import {
  addSnapshot,
  type SnapshotMeta,
  type SnapshotReason,
} from "@/lib/domain/save-snapshots"
import type { Ctx } from "@/lib/commands/ctx"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore, type BookState } from "@/stores/book-store"

/**
 * Earlier saves (§8.36): the book as it stood when it was opened or written,
 * kept in this browser so a bad import or a slip can be undone after the
 * session's own undo is gone.
 */

/**
 * Keep the open book as a snapshot. Called after a file has been opened or
 * written, so each snapshot is a state that also existed on disk. A demo book,
 * an open archive and an empty book take none (`skipped`). Never throws: a
 * snapshot that could not be written (`failed`) must not fail the save it
 * follows, and only a restore, which promises the book can come back, acts
 * on it.
 */
export async function takeSnapshot(
  reason: SnapshotReason
): Promise<"kept" | "skipped" | "failed"> {
  if (!isReceiptStorageSupported()) return "failed"
  try {
    const metas = await loadSnapshotIndex()
    if (!metas) return "failed"
    const s = useBookStore.getState()
    if (!s.open || s.demo || s.archiveYear !== null) return "skipped"
    if (!s.entries.length && !s.inbox.length) return "skipped"
    const options = useBookStore.persist.getOptions()
    const state = options.partialize
      ? (options.partialize(s) as Record<string, unknown>)
      : {}
    const meta: SnapshotMeta = {
      id: `snap-${uid()}`,
      at: new Date().toISOString(),
      reason,
      fileName: s.fileName,
      businessName: s.businessName,
      entries: s.entries.length,
      attachmentIds: [
        ...collectLiveIds(s.entries, [
          ...s.inbox.map((i) => i.id),
          ...invoiceFileIds(s.invoices),
        ]),
      ],
    }
    const next = addSnapshot(metas, meta, new Date())
    await putSnapshot(
      meta,
      { version: options.version ?? 0, state },
      next.metas,
      next.dropped
    )
    return "kept"
  } catch (error) {
    console.warn("Could not keep an earlier save", error)
    return "failed"
  }
}

/**
 * Put an earlier save back as the open book (§8.36). The book as it stands
 * is kept as a snapshot first, so the restore can itself be undone. The
 * restored book is unsaved until the user saves it.
 *
 * The same file stays linked, and the change log keeps its later records and
 * gains one per voucher the restore changes, so the log still tells the whole
 * story (KPL 2:6). A snapshot of another file unlinks the open one, so the
 * next save cannot write one book over another, and brings its own log.
 */
export async function restoreEarlierSave(
  ctx: Ctx,
  meta: SnapshotMeta,
  /** When the snapshot was taken, as the dialog shows it. */
  when: string
): Promise<boolean> {
  const before = useBookStore.getState()
  if (before.archiveYear !== null) {
    toast.add({ title: ctx.t("io.archiveReadOnly") })
    return false
  }
  if (before.importing || before.saving) return false

  const ok = await confirm({
    title: ctx.t("snapshots.restoreTitle"),
    message: ctx.t(
      before.dirty
        ? "snapshots.restoreMessageDirty"
        : "snapshots.restoreMessage",
      { d: when }
    ),
    confirmLabel: ctx.t("snapshots.restore"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!ok) return false

  let stored
  try {
    stored = await getSnapshot(meta.id)
  } catch (error) {
    console.error(error)
  }
  if (!stored) {
    toast.add({ title: ctx.t("snapshots.missing"), priority: "high" })
    return false
  }

  const options = useBookStore.persist.getOptions()
  let raw: unknown = stored.state
  if (stored.version !== options.version && options.migrate) {
    raw = await options.migrate(raw, stored.version)
  }
  /* The store's own merge fills fields a snapshot from an older version lacks. */
  const current = useBookStore.getState()
  const book: BookState = options.merge
    ? (options.merge(raw, current) as BookState)
    : { ...current, ...(raw as Partial<BookState>) }

  /* The confirmation promised the current book stays in the list. */
  if ((await takeSnapshot("restore")) === "failed") {
    toast.add({ title: ctx.t("snapshots.keepFailed"), priority: "high" })
    return false
  }

  const now = useBookStore.getState()
  if (now.bookEpoch !== before.bookEpoch) return false
  const sameFile = book.fileName === now.fileName
  const changeLog = sameFile
    ? capChangeLog([
        ...now.changeLog,
        ...entryChanges(
          now.entries,
          book.entries,
          new Date().toISOString(),
          "restore"
        ),
      ])
    : book.changeLog

  now.replaceBook({
    entries: book.entries,
    cats: book.cats,
    fileName: book.fileName,
    year: book.year,
    dirty: true,
    fileHandle: sameFile ? now.fileHandle : null,
    savedAt: sameFile ? now.savedAt : null,
    encrypted: book.encrypted,
    invoices: book.invoices,
    customers: book.customers,
    inventory: book.inventory,
    inbox: book.inbox,
    settings: {
      exportLang: book.exportLang,
      businessId: book.businessId,
      businessName: book.businessName,
      businessPhone: book.businessPhone,
      vatPeriod: book.vatPeriod,
      traderType: book.traderType,
      hiddenFeatures: book.hiddenFeatures,
      bookStart: book.bookStart,
      bookEnd: book.bookEnd,
      vatCash: book.vatCash,
      vatFiled: book.vatFiled,
      vatFiledFigures: book.vatFiledFigures,
      taxPayment: book.taxPayment,
      yearsArchived: book.yearsArchived,
      retentionNoted: book.retentionNoted,
      billsIgnored: book.billsIgnored,
      taxLosses: book.taxLosses,
      form5Filed: book.form5Filed,
      archives: book.archives,
      recurring: book.recurring,
      categoryRules: book.categoryRules,
      bankSeen: book.bankSeen,
      assetOpening: book.assetOpening,
      bankBalance: book.bankBalance,
      payMonths: book.payMonths,
      loanOpening: book.loanOpening,
      yearEnd: book.yearEnd,
      invoiceSettings: book.invoiceSettings,
      changeLog,
      overviewLayout: book.overviewLayout,
      autosave: book.autosave,
      ledgerSize: book.ledgerSize,
      ctSize: book.ctSize,
      showAccounts: book.showAccounts,
    },
  })
  if (!sameFile) await rememberHandle(null)
  toast.add({ title: ctx.t("snapshots.restored") })
  return true
}

/** Forget one earlier save. Its receipts go in the next sweep unless the book still uses them. */
export async function forgetEarlierSave(
  ctx: Ctx,
  meta: SnapshotMeta
): Promise<void> {
  try {
    const metas = await loadSnapshotIndex()
    if (!metas) return
    await deleteSnapshot(meta.id, metas)
    useBookStore.getState().requestGc()
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("snapshots.deleteFailed"), priority: "high" })
  }
}
