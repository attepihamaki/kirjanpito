import { toast } from "@/components/ui/toast"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import {
  fileToUint8Array,
  readFileAsText,
  saveBlob,
  saveText,
} from "@/lib/browser/download"
import {
  getReceipt,
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { parseCsv, serializeCsv, type ImportSuccess } from "@/lib/domain/csv"
import { CSV_HEADER_LINE } from "@/lib/domain/csv-header"
import { uid } from "@/lib/domain/id"
import {
  attachmentKey,
  buildReceiptPaths,
  cleanFileName,
} from "@/lib/domain/receipt-path"
import {
  indexCategories,
  type Attachment,
  type Entry,
} from "@/lib/domain/types"
import { dirOf, packZip, resolveReceipt, unpackZip } from "@/lib/domain/zip"
import { SKIP_CODE_KEYS } from "@/lib/i18n/messages"
import { APP_ROUTES } from "@/lib/site"
import type { Ctx } from "@/lib/commands/ctx"
import { availableReceiptCount, guardDirty } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"

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

/** Open a CSV or ZIP the user picked or dropped. */
export async function openFile(ctx: Ctx, file: File): Promise<void> {
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
    if (isZip) await importZip(ctx, file)
    else await importCsv(ctx, file)
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.readFailed") })
  } finally {
    useBookStore.getState().setImporting(false)
  }
}

async function importCsv(ctx: Ctx, file: File): Promise<void> {
  const text = await readFileAsText(file)
  const result = parseCsv(text, useBookStore.getState().cats, uid)
  if (!result.ok) {
    toast.add({ title: failureMessage(ctx, result) })
    return
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

  applyImport(ctx, file.name, result, entries, { imported: 0, missing })
}

async function importZip(ctx: Ctx, file: File): Promise<void> {
  const unpacked = await unpackZip(await fileToUint8Array(file))
  if (!unpacked) {
    toast.add({ title: ctx.t("io.zipNoCsv") })
    return
  }

  const result = parseCsv(unpacked.csvText, useBookStore.getState().cats, uid)
  if (!result.ok) {
    toast.add({ title: failureMessage(ctx, result) })
    return
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
      const blob = new Blob([bytes as BlobPart])
      try {
        await putReceipt(id, blob)
        atts.push({ id, name, type: blob.type, size: blob.size })
        imported += 1
      } catch {
        missing += 1
        atts.push(missingAttachment(path))
      }
    }
    entries.push({ ...entry, ...(atts.length ? { atts } : {}) })
  }

  applyImport(ctx, file.name, result, entries, { imported, missing })
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
  /** The picked file's name, extension included (§7.3). */
  fileName: string,
  result: ImportSuccess,
  entries: Entry[],
  receipts: { imported: number; missing: number }
): void {
  releaseAllObjectUrls()
  useBookStore.getState().replaceBook({
    entries,
    cats: result.categories,
    fileName: fileName || null,
    // §7.1: after import the selected year is the latest year in the file.
    year: result.latestYear ?? new Date().getFullYear(),
    // A freshly imported file is, by definition, already exported.
    dirty: false,
  })
  toast.add({ title: importSummary(ctx, result, receipts) })
  ctx.navigate(APP_ROUTES.ledger)
}

/* -------------------------------------------------------------------------
 * Export
 * ---------------------------------------------------------------------- */

export async function exportBook(
  ctx: Ctx,
  baseName: string,
  csvOnly: boolean
): Promise<void> {
  const { entries, cats } = useBookStore.getState()
  if (!entries.length) {
    toast.add({ title: ctx.t("io.nothingToExport") })
    return
  }

  const name = cleanFileName(baseName) || "kirjanpito"
  const paths = buildReceiptPaths(entries)
  /*
   * Paths are always written, so a CSV-only export still records which
   * receipts existed (§7.1).
   */
  const csvText = serializeCsv(entries, indexCategories(cats), paths)
  const withReceipts = !csvOnly && availableReceiptCount(entries) > 0
  const savedAs = `${name}.${withReceipts ? "zip" : "csv"}`

  try {
    if (!withReceipts) {
      saveText(csvText, savedAs, CSV_MIME)
    } else {
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
      })
      saveBlob(new Blob([bytes as BlobPart], { type: ZIP_MIME }), savedAs)
    }

    useBookStore.getState().markExported(savedAs)
    toast.add({ title: ctx.t("io.exported", { f: savedAs }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.exportFailed") })
  }
}
