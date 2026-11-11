import { toast } from "@/components/ui/toast"

import { saveBlob } from "@/lib/browser/download"
import type { Ctx } from "@/lib/commands/ctx"
import {
  auditSettings,
  buildBookFile,
  ensurePassword,
} from "@/lib/commands/io-commands"
import { hashReceipts, renderReports } from "@/lib/commands/retention-commands"
import type { DateRange } from "@/lib/domain/books"
import { defaultFileBaseName } from "@/lib/domain/receipt-path"
import {
  auditPackageName,
  buildAuditPackageFiles,
} from "@/lib/domain/retention-package"
import { auditReports } from "@/lib/domain/year-reports"
import { packFiles } from "@/lib/domain/zip"
import { createFormatters } from "@/lib/i18n/create-formatters"
import { alertDialog, confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/** The entries an audit package of the range holds: those dated in it (§8.25). */
export function auditEntries<T extends { date: string }>(
  entries: readonly T[],
  range: DateRange
): T[] {
  return entries.filter((e) => e.date >= range.from && e.date <= range.to)
}

/**
 * Download the audit package of a range of days (§8.25), leaving the book as
 * it is. It is the retention package's machinery (§8.21) with a free range in
 * place of a closed year: the vouchers dated in the range, their attachments,
 * the three books over the range and the VAT returns whose period lies in it.
 */
export async function exportAuditPackage(
  ctx: Ctx,
  range: DateRange
): Promise<void> {
  const state = useBookStore.getState()
  if (state.saving || state.importing) return
  const entries = auditEntries(state.entries, range)
  if (!entries.length) {
    toast.add({ title: ctx.t("io.auditNone") })
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
    const file = await buildBookFile(
      `${base}-${range.from}_${range.to}`,
      state.fileHandle,
      { entries, settings: auditSettings(state, range) }
    )
    if (file.absentReceipts) {
      await alertDialog({
        title: ctx.t("confirm.auditBlockedTitle"),
        message: ctx.t("io.archiveLost", { n: file.absentReceipts }),
        closeLabel: ctx.t("common.close"),
      })
      return
    }
    const book = {
      name: file.name,
      bytes: new Uint8Array(await file.blob.arrayBuffer()),
    }

    const now = useBookStore.getState()
    const f = createFormatters(now.exportLang)
    const docs = auditReports(
      f,
      {
        entries: now.entries,
        cats: now.cats,
        traderType: now.traderType,
        businessName: now.businessName ?? "",
        businessId: now.businessId ?? "",
        exportLang: now.exportLang,
        vatFiled: now.vatFiled,
        vatFiledFigures: now.vatFiledFigures,
        vatCash: now.vatCash,
        vatPeriod: now.vatPeriod,
        bookStart: now.bookStart,
      },
      range
    )
    const reports = await renderReports(docs)
    const { receiptHashes } = await hashReceipts(now, book.bytes)
    const files = await buildAuditPackageFiles({
      f,
      range,
      exportLang: now.exportLang,
      reports,
      book,
      receiptHashes,
      encrypted: now.encrypted,
    })
    const name = auditPackageName(base, range, now.exportLang)
    saveBlob(
      new Blob([(await packFiles(files)) as BlobPart], {
        type: "application/zip",
      }),
      name
    )
    toast.add({ title: ctx.t("io.auditDone", { f: name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.auditFailed") })
  } finally {
    useBookStore.getState().setSaving(false)
  }
}
