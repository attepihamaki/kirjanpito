import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import type { Ctx } from "@/lib/commands/ctx"
import { ledgerWorkbook, workbookFileName } from "@/lib/domain/ledger-workbook"
import { indexCategories } from "@/lib/domain/types"
import { workbookParts } from "@/lib/domain/xlsx"
import { useBookStore } from "@/stores/book-store"

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * Download the selected year's ledger as an `.xlsx` workbook (§7.10), in the
 * book's export language. A copy for reading and sums: it is never opened back
 * into the book.
 */
export async function downloadWorkbook(ctx: Ctx): Promise<void> {
  const s = useBookStore.getState()
  try {
    const sheets = ledgerWorkbook(
      s.entries,
      indexCategories(s.cats),
      s.year,
      s.exportLang
    )
    const encoder = new TextEncoder()
    const { packFiles } = await import("@/lib/domain/zip")
    const bytes = await packFiles(
      workbookParts(sheets).map((part) => ({
        path: part.path,
        bytes: encoder.encode(part.text),
      }))
    )
    saveBlob(
      new Blob([bytes as BlobPart], { type: XLSX_TYPE }),
      workbookFileName(s.year, s.exportLang)
    )
  } catch (error) {
    console.warn("Workbook could not be made", error)
    toast.add({ title: ctx.t("io.xlsxFailed"), priority: "high" })
  }
}
