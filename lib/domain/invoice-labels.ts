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
    vatId: "ALV-numero",
    businessId: "Y-tunnus",
    description: "Kuvaus",
    quantity: "Määrä",
    unitPrice: "À-hinta (alv 0 %)",
    vatRate: "ALV %",
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

/** The words printed on a payment reminder, in the invoice's language (§8.27). */
export interface ReminderLabels {
  title: string
  intro: (number: number, due: string) => string
  openBalance: string
  interest: (rate: string, days: number) => string
  fee: string
  total: string
  newDue: string
  closing: string
  fileName: (number: number, customer: string) => string
}

const REMINDER_LABELS: Record<InvoiceLang, ReminderLabels> = {
  fi: {
    title: "MAKSUMUISTUTUS",
    intro: (n, due) =>
      `Laskun ${n} eräpäivä ${due} on mennyt, eikä maksua ole vielä saapunut. Pyydämme maksamaan avoimen summan viivästyskorkoineen alla olevalla maksutiedoilla. Jos olette jo maksaneet laskun, pyydämme ohittamaan tämän muistutuksen.`,
    openBalance: "Avoin saldo",
    interest: (rate, days) => `Viivästyskorko ${rate} % (${days} pv)`,
    fee: "Muistutusmaksu",
    total: "Maksettava yhteensä",
    newDue: "Uusi eräpäivä",
    closing: "Viivästyskorko on korkolain mukainen.",
    fileName: (n, customer) =>
      `Maksumuistutus ${n} - ${customer.trim() || "asiakas"}.pdf`,
  },
  en: {
    title: "PAYMENT REMINDER",
    intro: (n, due) =>
      `Invoice ${n} was due on ${due} and we have not yet received payment. Please pay the open amount with late payment interest using the details below. If you have already paid, please disregard this reminder.`,
    openBalance: "Open balance",
    interest: (rate, days) => `Late payment interest ${rate} % (${days} days)`,
    fee: "Reminder fee",
    total: "Total to pay",
    newDue: "New due date",
    closing: "Late payment interest is charged under the Finnish Interest Act.",
    fileName: (n, customer) =>
      `Payment reminder ${n} - ${customer.trim() || "customer"}.pdf`,
  },
}

export function reminderLabels(lang: InvoiceLang): ReminderLabels {
  return REMINDER_LABELS[lang]
}
