import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import {
  fileToUint8Array,
  readFileAsText,
  saveBlob,
} from "@/lib/browser/download"
import {
  hasWritePermission,
  isFileHandleSupported,
  lastModified,
  pickFileToOpen,
  pickFileToSave,
  recallHandle,
  rememberHandle,
  requestWritePermission,
  writeFile,
} from "@/lib/browser/file-handle"
import {
  getReceipt,
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { readStoredTheme } from "@/lib/browser/theme"
import { parseCsv, serializeCsv, type ImportSuccess } from "@/lib/domain/csv"
import { CSV_HEADER_LINE } from "@/lib/domain/csv-header"
import { uid } from "@/lib/domain/id"
import {
  attachmentKey,
  buildReceiptPaths,
  cleanFileName,
  mimeForName,
} from "@/lib/domain/receipt-path"
import {
  indexCategories,
  type Attachment,
  type Entry,
} from "@/lib/domain/types"
import {
  parseSettings,
  serializeSettings,
  type ParsedSettings,
} from "@/lib/domain/settings-file"
import { normalizeLayout } from "@/lib/domain/overview-layout"
import { dirOf, packZip, resolveReceipt, unpackZip } from "@/lib/domain/zip"
import { SKIP_CODE_KEYS } from "@/lib/i18n/messages"
import { APP_ROUTES } from "@/lib/site"
import { confirm } from "@/lib/ui/confirm"
import type { Ctx } from "@/lib/commands/ctx"
import { guardDirty } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

/**
 * Commands that read or write a bookkeeping file. Imported lazily from the
 * landing page so jszip and papaparse stay out of its bundle.
 */

const CSV_MIME = "text/csv;charset=utf-8"
const ZIP_MIME = "application/zip"

/* -------------------------------------------------------------------------
 * Import
 * ---------------------------------------------------------------------- */

function importSummary(
  ctx: Ctx,
  result: ImportSuccess,
  receipts: {
    imported: number
    missing: number
  }
): string {
  const rejected = result.rejectedReceiptCount
  let text = ctx.t("io.imported", { n: result.entries.length })
  if (result.newCategoryCount) {
    text += ctx.t("io.newCategories", { n: result.newCategoryCount })
  }
  if (receipts.imported) {
    text += ctx.t("io.receiptsImported", { n: receipts.imported })
  }
  if (receipts.missing) {
    text += ctx.t("io.receiptsMissing", { n: receipts.missing })
  }
  if (rejected) {
    text += ctx.t("io.receiptsRejected", { n: rejected })
  }
  if (result.skipped.length) {
    const first = result.skipped
      .slice(0, 3)
      .map((s) =>
        ctx.t("io.rowError", {
          n: s.line,
          /*
           * SKIP_CODE_KEYS is the map a test walks to prove every domain
           * code can be shown, so the keys are not spelled out again here.
           */
          f: ctx.t(SKIP_CODE_KEYS[s.code]),
        })
      )
      .join(", ")
    text += ctx.t("io.skipped", { n: result.skipped.length, e: first })
  }
  return text
}

/**
 * Open a CSV or ZIP the user picked or dropped.
 *
 * `handle` is the file it can later be saved back to (§7.5), and is null for
 * a drop or an `<input type="file">` pick, neither of which yields one.
 */
export async function openFile(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null = null
): Promise<void> {
  /*
   * A second file dropped while the first is still being unpacked would
   * interleave two `replaceBook` calls and leave a mixed bookkeeping.
   */
  if (useBookStore.getState().importing) return
  if (!(await guardDirty(ctx, true))) return

  const isZip =
    file.name.toLowerCase().endsWith(".zip") || file.type === ZIP_MIME

  /*
   * The UI shows nothing for the first few hundred milliseconds (see
   * `useDelayedFlag`), so a CSV still opens without a flicker.
   */
  useBookStore.getState().setImporting(true)
  try {
    const opened = isZip
      ? await importZip(ctx, file, handle)
      : await importCsv(ctx, file, handle)
    /*
     * Only a file that actually became the open bookkeeping is remembered;
     * a rejected CSV must not leave the previous book pointing at it.
     */
    if (opened) await rememberHandle(handle)
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.readFailed") })
  } finally {
    useBookStore.getState().setImporting(false)
  }
}

/**
 * Open through the file picker, which — unlike an `<input type="file">` —
 * hands back a handle the bookkeeping can be saved to. Falls back to null so
 * the caller can open its own input on browsers without the picker.
 */
export async function pickAndOpenFile(ctx: Ctx): Promise<boolean> {
  if (!isFileHandleSupported()) return false
  let handle: FileSystemFileHandle | null = null
  try {
    handle = await pickFileToOpen()
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.readFailed") })
    return true
  }
  // Cancelling the picker is a normal outcome, and still "handled".
  if (handle) await openFile(ctx, await handle.getFile(), handle)
  return true
}

/** Put back the link to the file this bookkeeping came from, after a reload. */
export async function restoreFileHandle(): Promise<void> {
  const handle = await recallHandle()
  if (!handle) return
  const state = useBookStore.getState()
  // A bookkeeping that is no longer open has no file behind it.
  if (!state.open || state.fileHandle) return
  useBookStore.setState({ fileHandle: handle })
}

async function importCsv(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null
): Promise<boolean> {
  const text = await readFileAsText(file)
  const result = parseCsv(text, useBookStore.getState().cats, uid)
  if (!result.ok) {
    toast.add({ title: failureMessage(ctx, result) })
    return false
  }

  /*
   * §7.2: paths in a plain CSV become missing attachments that keep the path,
   * so re-exporting does not lose the reference.
   */
  let missing = 0
  const entries: Entry[] = result.entries.map(({ paths, ...entry }) => {
    missing += paths.length
    return {
      ...entry,
      ...(paths.length ? { atts: paths.map(missingAttachment) } : {}),
    }
  })

  applyImport(
    ctx,
    file,
    handle,
    result,
    entries,
    { imported: 0, missing },
    null
  )
  return true
}

async function importZip(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null
): Promise<boolean> {
  const unpacked = await unpackZip(await fileToUint8Array(file))
  if (!unpacked) {
    toast.add({ title: ctx.t("io.zipNoCsv") })
    return false
  }

  const settings = unpacked.settingsText
    ? parseSettings(unpacked.settingsText)
    : null
  /*
   * The file's own categories are the base the CSV is matched against, so a
   * custom category comes back with its id, line and rate rather than being
   * recreated from its name (§7.6).
   */
  const result = parseCsv(
    unpacked.csvText,
    settings?.categories ?? useBookStore.getState().cats,
    uid
  )
  if (!result.ok) {
    toast.add({ title: failureMessage(ctx, result) })
    return false
  }

  const csvDir = dirOf(unpacked.csvPath)
  const canStore = isReceiptStorageSupported()
  let imported = 0
  let missing = 0

  const entries: Entry[] = []
  for (const { paths, ...entry } of result.entries) {
    const atts: Attachment[] = []
    for (const path of paths) {
      const bytes = canStore
        ? resolveReceipt(unpacked.files, csvDir, path)
        : null
      if (!bytes) {
        missing += 1
        atts.push(missingAttachment(path))
        continue
      }
      const id = `a-${uid()}`
      const name = path.split("/").pop() ?? path
      /*
       * A ZIP entry carries no MIME type, so it is derived from the name —
       * one of the image or PDF types, since `parseCsv` admits no other path.
       */
      const type = mimeForName(name)
      const blob = new Blob([bytes as BlobPart], { type })
      try {
        await putReceipt(id, blob)
        atts.push({ id, name, type, size: blob.size })
        imported += 1
      } catch {
        missing += 1
        atts.push(missingAttachment(path))
      }
    }
    entries.push({ ...entry, ...(atts.length ? { atts } : {}) })
  }

  applyImport(
    ctx,
    file,
    handle,
    result,
    entries,
    { imported, missing },
    settings
  )
  return true
}

function missingAttachment(path: string): Attachment {
  return {
    id: null,
    name: path.split("/").pop() ?? path,
    type: "",
    size: 0,
    missing: true,
    path,
  }
}

function failureMessage(
  ctx: Ctx,
  result: Extract<ReturnType<typeof parseCsv>, { ok: false }>
): string {
  if (result.code === "empty-file") return ctx.t("io.fileEmpty")
  if (result.code === "missing-columns") {
    return ctx.t("io.missingColumn", {
      c: result.missing.join(", "),
      h: CSV_HEADER_LINE,
    })
  }
  return ctx.t("io.noRows", { e: String(result.skipped.length) })
}

function applyImport(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null,
  result: ImportSuccess,
  entries: Entry[],
  receipts: { imported: number; missing: number },
  settings: ParsedSettings | null
): void {
  releaseAllObjectUrls()
  useBookStore.getState().replaceBook({
    entries,
    cats: result.categories,
    // The name carries its extension (§7.3).
    fileName: file.name || null,
    fileHandle: handle,
    /*
     * The baseline a later save compares against: anything that moves this
     * timestamp happened outside the app and must not be overwritten blind.
     */
    savedAt: handle ? file.lastModified : null,
    // §7.1: after import the selected year is the latest year in the file.
    year: result.latestYear ?? new Date().getFullYear(),
    // A freshly read file is, by definition, already saved.
    dirty: false,
    settings: settings
      ? {
          vatPeriod: settings.vatPeriod,
          vatFiled: settings.vatFiled,
          overviewLayout: settings.overviewLayout,
          autosave: settings.autosave,
          ledgerSize: settings.pageSize?.ledger,
          ctSize: settings.pageSize?.categories,
        }
      : undefined,
  })
  /*
   * The language and theme are preferences of the browser as much as of the
   * book (§12), so opening a file switches to them but they never mark it
   * dirty. The landing page goes on using the browser's own key.
   */
  if (settings?.language) useLangStore.getState().setLang(settings.language)
  if (settings?.theme) ctx.setTheme?.(settings.theme)
  toast.add({ title: importSummary(ctx, result, receipts) })
  ctx.navigate(APP_ROUTES.overview)
}

/* -------------------------------------------------------------------------
 * Writing the bookkeeping out
 * ---------------------------------------------------------------------- */

/** The bookkeeping as the bytes of a file, named but not yet anywhere. */
interface BookFile {
  name: string
  blob: Blob
  isZip: boolean
}

/** Everything `settings.json` holds, as the app stands right now (§7.6). */
function currentSettingsText(): string {
  const s = useBookStore.getState()
  return serializeSettings({
    language: useLangStore.getState().lang,
    theme: readStoredTheme(),
    vatPeriod: s.vatPeriod,
    vatFiled: s.vatFiled,
    overviewLayout: normalizeLayout(s.overviewLayout),
    autosave: s.autosave,
    categories: s.cats,
    pageSize: { ledger: s.ledgerSize, categories: s.ctSize },
  })
}

async function buildBookFile(
  baseName: string,
  csvOnly: boolean
): Promise<BookFile> {
  const { entries, cats } = useBookStore.getState()
  const name = cleanFileName(baseName) || "kirjanpito"
  const paths = buildReceiptPaths(entries)
  /*
   * Paths are always written, so a CSV-only export still records which
   * receipts existed (§7.1).
   */
  const csvText = serializeCsv(entries, indexCategories(cats), paths)
  /*
   * A bookkeeping is a ZIP, because settings.json has to travel with the
   * entries (§7.6). A bare CSV is only ever an explicit export.
   */
  const isZip = !csvOnly

  if (!isZip) {
    return {
      name: `${name}.csv`,
      blob: new Blob([csvText], { type: CSV_MIME }),
      isZip,
    }
  }

  const attachmentIds = new Map<string, string>()
  for (const e of entries) {
    for (const [i, a] of (e.atts ?? []).entries()) {
      if (a.id) attachmentIds.set(attachmentKey(e.id, i), a.id)
    }
  }
  const bytes = await packZip({
    csvName: `${name}.csv`,
    csvText,
    paths,
    attachmentIds,
    read: async (id) => {
      const blob = await getReceipt(id)
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null
    },
    settingsText: currentSettingsText(),
  })
  return {
    name: `${name}.zip`,
    blob: new Blob([bytes as BlobPart], { type: ZIP_MIME }),
    isZip,
  }
}

/** The name without its extension, for seeding a picker or a dialog. */
function baseOf(fileName: string): string {
  return fileName.replace(/\.(csv|zip)$/i, "")
}

/**
 * Download a copy (§7.3). This never touches the linked file, so it clears
 * the dirty flag only when there is no linked file to go stale — otherwise
 * the dot would claim the user's bookkeeping was written when it was not.
 */
export async function exportBook(
  ctx: Ctx,
  baseName: string,
  csvOnly: boolean
): Promise<void> {
  const { entries, fileHandle } = useBookStore.getState()
  if (!entries.length) {
    toast.add({ title: ctx.t("io.nothingToExport") })
    return
  }

  try {
    const file = await buildBookFile(baseName, csvOnly)
    saveBlob(file.blob, file.name)
    if (!fileHandle) useBookStore.getState().markSaved({ fileName: file.name })
    toast.add({ title: ctx.t("io.exported", { f: file.name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.exportFailed") })
  }
}

/**
 * Write the bookkeeping back to the file it was opened from (§7.5), asking
 * for a file when there is none yet, when its shape has changed, or when it
 * has gone missing. Must be called from a user gesture: both the write
 * permission prompt and the save picker need one.
 *
 * `suggestedBase` seeds the picker in those cases; the caller supplies it
 * because the default name is language-dependent (§7.3).
 */
export async function saveBook(ctx: Ctx, suggestedBase: string): Promise<void> {
  const state = useBookStore.getState()
  if (!state.entries.length) {
    toast.add({ title: ctx.t("io.nothingToExport") })
    return
  }
  if (state.saving) return

  useBookStore.getState().setSaving(true)
  try {
    const file = await buildBookFile(
      state.fileName ? baseOf(state.fileName) : suggestedBase,
      false
    )
    const handle = await handleToWrite(ctx, file)
    if (!handle) return

    await writeFile(handle, file.blob)
    useBookStore.getState().markSaved({
      fileName: handle.name,
      fileHandle: handle,
      savedAt: await lastModified(handle),
    })
    await rememberHandle(handle)
    // A save that could ask is what autosave was waiting for.
    useBookStore.getState().setAutosavePaused(false)
    toast.add({ title: ctx.t("io.saved", { f: handle.name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.saveFailed") })
  } finally {
    useBookStore.getState().setSaving(false)
  }
}

/**
 * The handle `saveBook` should write to, or null if the user backed out.
 *
 * A linked file is reused only when it can still take this bookkeeping: the
 * extension has to match its shape, since a book that has grown receipts is a
 * ZIP and cannot be written into a path called `.csv`, and nothing may have
 * touched it since we last read or wrote it.
 */
async function handleToWrite(
  ctx: Ctx,
  file: BookFile
): Promise<FileSystemFileHandle | null> {
  const { fileHandle, fileName, savedAt } = useBookStore.getState()
  const pick = () => pickFileToSave(file.name, file.isZip)

  if (!fileHandle) return pick()

  const sameShape = fileHandle.name
    .toLowerCase()
    .endsWith(file.isZip ? ".zip" : ".csv")
  if (!sameShape) {
    toast.add({ title: ctx.t("io.shapeChanged", { f: file.name }) })
    return pick()
  }

  if (!(await requestWritePermission(fileHandle))) {
    toast.add({ title: ctx.t("io.saveDenied") })
    return null
  }

  let onDisk: number
  try {
    onDisk = await lastModified(fileHandle)
  } catch {
    // Moved, renamed or deleted since it was opened.
    useBookStore.getState().forgetFileHandle()
    await rememberHandle(null)
    toast.add({ title: ctx.t("io.fileGone") })
    return pick()
  }

  if (savedAt !== null && onDisk !== savedAt) {
    const overwrite = await confirm({
      title: ctx.t("confirm.overwriteTitle"),
      message: ctx.t("confirm.overwriteMessage", {
        f: fileName ?? fileHandle.name,
      }),
      confirmLabel: ctx.t("confirm.overwriteConfirm"),
      cancelLabel: ctx.t("common.cancel"),
    })
    if (!overwrite) return null
  }

  return fileHandle
}

/**
 * Save without asking anything (§7.5): no picker, no permission prompt, no
 * overwrite question. Wherever `saveBook` would have asked, this stops
 * instead and pauses autosave, and the amber dot stays until a manual save.
 * Returns whether it wrote the file.
 */
export async function autosaveBook(ctx: Ctx): Promise<boolean> {
  const state = useBookStore.getState()
  const handle = state.fileHandle
  if (!state.autosave || state.autosavePaused || !state.dirty) return false
  if (state.saving || state.importing || !state.entries.length) return false

  const pause = () => {
    useBookStore.getState().setAutosavePaused(true)
    return false
  }
  if (!handle || !handle.name.toLowerCase().endsWith(".zip")) return pause()
  if (!(await hasWritePermission(handle))) return pause()

  useBookStore.getState().setSaving(true)
  try {
    let onDisk: number
    try {
      onDisk = await lastModified(handle)
    } catch {
      return pause()
    }
    if (state.savedAt !== null && onDisk !== state.savedAt) return pause()

    const file = await buildBookFile(baseOf(handle.name), false)
    await writeFile(handle, file.blob)
    useBookStore.getState().markSaved({
      fileName: handle.name,
      fileHandle: handle,
      savedAt: await lastModified(handle),
    })
    return true
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.saveFailed") })
    return pause()
  } finally {
    useBookStore.getState().setSaving(false)
  }
}
