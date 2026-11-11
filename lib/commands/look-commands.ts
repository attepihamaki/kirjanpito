import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import type { Ctx } from "@/lib/commands/ctx"
import { todayIso, addDays } from "@/lib/domain/dates"
import type { Invoice } from "@/lib/domain/invoice"
import { sellerOf } from "@/lib/domain/invoice-calc"
import { finnishReference } from "@/lib/domain/invoice-reference"
import { rateOnDate } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"

/** An IBAN that passes its check, for a preview made before the real one is set. */
const SAMPLE_IBAN = "FI2112345600000785"

/**
 * An example invoice with the documents' look as it is set now (§8.27),
 * opened in a new tab, or downloaded where the browser blocks the tab. It is
 * drawn from the settings alone and stores nothing.
 */
export async function previewInvoiceLook(ctx: Ctx): Promise<void> {
  const s = useBookStore.getState()
  const settings = s.invoiceSettings
  const today = todayIso()
  const seller = sellerOf(
    { ...settings, iban: settings.iban || SAMPLE_IBAN },
    {
      name: s.businessName?.trim() || ctx.t("invoice.lookSampleSeller"),
      businessId: s.businessId,
      phone: s.businessPhone,
    }
  )
  const invoice: Invoice = {
    id: "preview",
    number: settings.firstNumber,
    date: today,
    dueDate: addDays(today, settings.termDays),
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: {
      name: ctx.t("invoice.lookSampleCustomer"),
      street: "Esimerkkikatu 1",
      postcode: "00100",
      city: "Helsinki",
      country: "FI",
      vatId: "",
      email: "",
    },
    language: "fi",
    rows: [
      {
        description: ctx.t("invoice.lookSampleRow"),
        quantityMilli: 2000,
        unit: "h",
        unitCents: 8000,
        vatRate: settings.vatRegistered ? rateOnDate(25.5, today) : 0,
        catId: "300-domestic",
      },
    ],
    note: "",
    terms: settings.terms.fi,
    reference: finnishReference(settings.firstNumber),
    seller,
    issuedAt: new Date().toISOString(),
    entryIds: [],
    credits: null,
  }
  try {
    const { renderInvoicePdf } = await import("@/lib/browser/invoice-pdf")
    const bytes = await renderInvoicePdf(invoice, null, settings)
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const tab = window.open(url, "_blank")
    if (!tab) saveBlob(blob, ctx.t("invoice.lookSampleFile"))
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    console.warn("Preview PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
  }
}
