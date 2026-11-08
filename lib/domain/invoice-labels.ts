import type { InvoiceLang } from "@/lib/domain/invoice"

/**
 * The words printed on an invoice (§8.27). They follow the invoice's own
 * language, not the app's, because the customer reads the PDF.
 */
export interface InvoiceLabels {
  invoice: string
  creditNote: string
  credits: string
  number: string
  date: string
  due: string
  supply: string
  reference: string
  seller: string
  buyer: string
  vatId: string
  businessId: string
  description: string
  quantity: string
  unitPrice: string
  vatRate: string
  amount: string
  vatBase: string
  vatAmount: string
  netTotal: string
  vatTotal: string
  total: string
  lateInterest: string
  payeeAccount: string
  payee: string
  toPay: string
  /** Page title, e.g. "Lasku 1001". */
  title: (number: number, credit: boolean) => string
}

const LABELS: Record<InvoiceLang, InvoiceLabels> = {
  fi: {
    invoice: "LASKU",
    creditNote: "HYVITYSLASKU",
    credits: "Hyvitettävä lasku",
    number: "Laskun numero",
    date: "Laskun päivämäärä",
    due: "Eräpäivä",
    supply: "Toimituspäivä",
    reference: "Viitenumero",
    seller: "Myyjä",
    buyer: "Ostaja",
    vatId: "ALV-tunnus",
    businessId: "Y-tunnus",
    description: "Kuvaus",
    quantity: "Määrä",
    unitPrice: "À-hinta (alv 0 %)",
    vatRate: "Alv %",
    amount: "Yhteensä (alv 0 %)",
    vatBase: "Veroton",
    vatAmount: "Alv",
    netTotal: "Veroton yhteensä",
    vatTotal: "Arvonlisävero yhteensä",
    total: "Maksettava",
    lateInterest: "Viivästyskorko on korkolain mukainen.",
    payeeAccount: "Tilinumero",
    payee: "Saaja",
    toPay: "Euroa",
    title: (n, credit) => `${credit ? "Hyvityslasku" : "Lasku"} ${n}`,
  },
  en: {
    invoice: "INVOICE",
    creditNote: "CREDIT NOTE",
    credits: "Credited invoice",
    number: "Invoice number",
    date: "Invoice date",
    due: "Due date",
    supply: "Delivery date",
    reference: "Reference number",
    seller: "Seller",
    buyer: "Buyer",
    vatId: "VAT number",
    businessId: "Business ID",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit price (excl. VAT)",
    vatRate: "VAT %",
    amount: "Total (excl. VAT)",
    vatBase: "Net",
    vatAmount: "VAT",
    netTotal: "Total excl. VAT",
    vatTotal: "Total VAT",
    total: "Amount due",
    lateInterest:
      "Late payment interest is charged under the Finnish Interest Act.",
    payeeAccount: "Account",
    payee: "Payee",
    toPay: "EUR",
    title: (n, credit) => `${credit ? "Credit note" : "Invoice"} ${n}`,
  },
}

export function invoiceLabels(lang: InvoiceLang): InvoiceLabels {
  return LABELS[lang]
}

/** The file name of an issued invoice's PDF, which is also its name as an attachment. */
export function invoiceFileName(
  lang: InvoiceLang,
  number: number,
  customerName: string,
  credit = false
): string {
  const stem = customerName.replace(/[\/:*?"<>|]/g, "").trim()
  const word = credit
    ? lang === "fi"
      ? "Hyvityslasku"
      : "Credit note"
    : lang === "fi"
      ? "Lasku"
      : "Invoice"
  return `${word} ${number} - ${stem}.pdf`
}
