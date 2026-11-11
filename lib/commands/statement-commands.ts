import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import type { Ctx } from "@/lib/commands/ctx"
import {
  customerStatement,
  type StatementOptions,
} from "@/lib/domain/customer-statement"
import { sellerOf } from "@/lib/domain/invoice-calc"
import { statementLabels } from "@/lib/domain/invoice-labels"
import { useBookStore } from "@/stores/book-store"

/**
 * Download a customer's statement as a PDF (§8.29), in the customer's own
 * invoice language, with the seller as the invoicing settings describe it
 * today.
 */
export async function downloadStatementPdf(
  ctx: Ctx,
  customerId: string,
  options: StatementOptions
): Promise<void> {
  const s = useBookStore.getState()
  const customer = s.customers.find((c) => c.id === customerId)
  if (!customer) return
  if (!s.businessName?.trim()) {
    toast.add({ title: ctx.t("invoice.problemSellerName") })
    return
  }
  const seller = sellerOf(s.invoiceSettings, {
    name: s.businessName,
    businessId: s.businessId,
    phone: s.businessPhone,
  })
  const byId = new Map(s.entries.map((e) => [e.id, e]))
  const statement = customerStatement(customerId, s.invoices, byId, options)
  try {
    const { renderStatementPdf } = await import("@/lib/browser/invoice-pdf")
    const bytes = await renderStatementPdf(
      statement,
      customer,
      seller,
      customer.language,
      options,
      s.invoiceSettings
    )
    saveBlob(
      new Blob([bytes as BlobPart], { type: "application/pdf" }),
      statementLabels(customer.language).fileName(customer.name, options.today)
    )
  } catch (error) {
    console.warn("Statement PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
  }
}
