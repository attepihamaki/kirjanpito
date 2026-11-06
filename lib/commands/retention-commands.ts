import { toast } from "@/components/ui/toast"

import { saveBlob } from "@/lib/browser/download"
import { sha256Bytes } from "@/lib/domain/integrity"
import {
  buildPackageFiles,
  packageFileName,
} from "@/lib/domain/retention-package"
import { defaultFileBaseName } from "@/lib/domain/receipt-path"
import { todayIso } from "@/lib/domain/dates"
import type { Entry } from "@/lib/domain/types"
import {
  vatReturnReports,
  yearReports,
  type VatReturnInput,
} from "@/lib/domain/year-reports"
import { archiveContents } from "@/lib/domain/year-archive"
import { packFiles, unpackZip } from "@/lib/domain/zip"
import { createFormatters } from "@/lib/i18n/create-formatters"
import { alertDialog, confirm } from "@/lib/ui/confirm"
import { heldPassword } from "@/lib/commands/book-password"
import type { Ctx } from "@/lib/commands/ctx"
import {
  archiveSettings,
  buildBookFile,
  ensurePassword,
} from "@/lib/commands/io-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * The year archive package (§8.21). `makeRetentionPackage` builds it from the
 * book's state and a year's ZIP; `exportRetentionPackage` is the standalone
 * action, and the year archive of §8.19 calls the first directly.
 */

type BookState = ReturnType<typeof useBookStore.getState>

export interface RetentionPackage {
  name: string
  blob: Blob
  /** Receipts the book ZIP lists that it does not hold. */
  missingReceipts: number
}

/** What the reports read, taken from the store as it stands. */
function reportInput(state: BookState, year: number): VatReturnInput {
  return {
    vatPeriod: state.vatPeriod,
    bookStart: state.bookStart,
    vatFiled: state.vatFiled,
    vatFiledFigures: state.vatFiledFigures,
    year,
    entries: state.entries,
    cats: state.cats,
    traderType: state.traderType,
    yearEnd: state.yearEnd[year],
    assetOpening: state.assetOpening,
    loanOpening: state.loanOpening,
    businessName: state.businessName ?? "",
    businessId: state.businessId ?? "",
    exportLang: state.exportLang,
  }
}

/**
 * Build the package around `book`, the year's bookkeeping ZIP as written. The
 * reports are made in the book's export language (§7.1) from the whole book,
 * since the statement and Form 5 read entries by the year they were paid.
 * Every receipt in the ZIP is read back and hashed, so the list describes the
 * file as it is rather than what the book meant to put in it.
 */
export async function makeRetentionPackage(opts: {
  state: BookState
  year: number
  base: string
  book: { name: string; bytes: Uint8Array }
}): Promise<RetentionPackage> {
  const { state, year, book } = opts
  const f = createFormatters(state.exportLang)
  const input = reportInput(state, year)
  const docs = [...yearReports(f, input), ...vatReturnReports(f, input)]

  /* pdf-lib stays out of every bundle until a package is made. */
  const { renderReportPdf } = await import("@/lib/browser/report-pdf")
  const reports = []
  for (const doc of docs) {
    reports.push({ title: doc.title, bytes: await renderReportPdf(doc) })
  }

  const password = state.encrypted ? (heldPassword() ?? undefined) : undefined
  const unpacked = await unpackZip(book.bytes, undefined, password)
  if (!unpacked) throw new Error("The year's ZIP does not read back")
  const receiptHashes: { path: string; hash: string }[] = []
  let missingReceipts = 0
  for (const path of unpacked.otherFiles) {
    const bytes = await unpacked.readReceipt(path)
    if (bytes) receiptHashes.push({ path, hash: await sha256Bytes(bytes) })
    else missingReceipts += 1
  }

  const files = await buildPackageFiles({
    f,
    year,
    exportLang: state.exportLang,
    reports,
    book,
    receiptHashes,
    encrypted: state.encrypted,
  })
  const bytes = await packFiles(files)
  return {
    name: packageFileName(opts.base, year, state.exportLang),
    blob: new Blob([bytes as BlobPart], { type: "application/zip" }),
    missingReceipts,
  }
}

/**
 * Download the retention package of a year (§8.21), leaving the book as it is.
 * It works for any year with vouchers, archived or not, so a trader can put
 * one on the shelf before the year is fully filed.
 */
export async function exportRetentionPackage(
  ctx: Ctx,
  year: number
): Promise<void> {
  const state = useBookStore.getState()
  if (state.saving || state.importing) return
  const contents = archiveContents(state.entries, year)
  if (!contents.some((e) => e.date.startsWith(`${year}-`))) {
    toast.add({ title: ctx.t("ledger.noEntriesYear", { y: year }) })
    return
  }

  /* The reports and the lists are plain files even when the book is not. */
  if (state.encrypted) {
    const ok = await confirm({
      title: ctx.t("confirm.packEncryptedTitle"),
      message: ctx.t("confirm.packEncryptedMessage"),
      confirmLabel: ctx.t("confirm.packConfirm"),
      cancelLabel: ctx.t("common.cancel"),
      destructive: false,
    })
    if (!ok) return
  }

  useBookStore.getState().setSaving(true)
  try {
    if (!(await ensurePassword(ctx, state.fileHandle))) return
    const base = state.fileName
      ? state.fileName.replace(/\.(csv|zip)$/i, "")
      : defaultFileBaseName(state.exportLang)
    const file = await buildBookFile(`${base}-${year}`, state.fileHandle, {
      entries: contents as Entry[],
      settings: archiveSettings(state, year, todayIso()),
    })
    if (file.absentReceipts) {
      await alertDialog({
        title: ctx.t("confirm.packBlockedTitle", { y: year }),
        message: ctx.t("io.archiveLost", { n: file.absentReceipts }),
        closeLabel: ctx.t("common.close"),
      })
      return
    }
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    const pack = await makeRetentionPackage({
      state: useBookStore.getState(),
      year,
      base,
      book: { name: file.name, bytes },
    })
    saveBlob(pack.blob, pack.name)
    toast.add({ title: ctx.t("io.packDone", { y: year, f: pack.name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.packFailed") })
  } finally {
    useBookStore.getState().setSaving(false)
  }
}
