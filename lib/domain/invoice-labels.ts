import type { InvoiceLang } from "@/lib/domain/invoice"
import type { VatNote } from "@/lib/domain/invoice-vat"

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
  /** The customer's own reference, "Viitteenne". */
  buyerReference: string
  orderNumber: string
  seller: string
  buyer: string
  vatId: string
  businessId: string
  description: string
  quantity: string
  unitPrice: string
  /** The unit price heading of a seller outside the VAT register, which says nothing of VAT. */
  unitPricePlain: string
  vatRate: string
  /** The row discount column's heading. */
  discountRate: string
  /** The line of the whole document's discount, with its percent. */
  docDiscount: (percent: string) => string
  amount: string
  amountPlain: string
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
  /** The heading of a quote (§8.34). */
  quote: string
  quoteNumber: string
  quoteDate: string
  validUntil: string
  /** The total of a quote, which is not asked to be paid. */
  quoteTotal: string
  /** The line under a quote's rows that says how long it stands. */
  quoteValid: (date: string) => string
  /** A quote's page title, e.g. "Tarjous 3". */
  quoteTitle: (number: number) => string
  /** The note that stands in for VAT on a zero-rated sale or a seller outside the register (`invoice-vat.ts`). */
  vatNote: Record<VatNote, string>
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
    buyerReference: "Viitteenne",
    orderNumber: "Tilausnumero",
    seller: "Myyjä",
    buyer: "Ostaja",
    vatId: "ALV-numero",
    businessId: "Y-tunnus",
    description: "Kuvaus",
    quantity: "Määrä",
    unitPrice: "À-hinta (alv 0 %)",
    unitPricePlain: "À-hinta",
    vatRate: "ALV %",
    discountRate: "Ale %",
    docDiscount: (p) => `Alennus ${p} %`,
    amount: "Yhteensä (alv 0 %)",
    amountPlain: "Yhteensä",
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
    quote: "TARJOUS",
    quoteNumber: "Tarjouksen numero",
    quoteDate: "Tarjouksen päivämäärä",
    validUntil: "Voimassa asti",
    quoteTotal: "Yhteensä",
    quoteValid: (d) => `Tarjous on voimassa ${d} asti.`,
    vatNote: {
      euGoods: "ALV 0 %, yhteisömyynti (AVL 72 a §).",
      euServices: "Käännetty verovelvollisuus, arvonlisäverodirektiivi 44 art.",
      nonEu: "ALV 0 %, veroton myynti EU:n ulkopuolelle.",
      reverse: "Käännetty verovelvollisuus.",
      unregistered:
        "Myyjä ei ole arvonlisäverovelvollinen: vähäinen toiminta (AVL 3 §).",
    },
    quoteTitle: (n) => `Tarjous ${n}`,
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
    buyerReference: "Your reference",
    orderNumber: "Order number",
    seller: "Seller",
    buyer: "Buyer",
    vatId: "VAT number",
    businessId: "Business ID",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit price (excl. VAT)",
    unitPricePlain: "Unit price",
    vatRate: "VAT %",
    discountRate: "Disc. %",
    docDiscount: (p) => `Discount ${p} %`,
    amount: "Total (excl. VAT)",
    amountPlain: "Total",
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
    quote: "QUOTATION",
    quoteNumber: "Quotation number",
    quoteDate: "Quotation date",
    validUntil: "Valid until",
    quoteTotal: "Total",
    quoteValid: (d) => `This quotation is valid until ${d}.`,
    vatNote: {
      euGoods: "VAT 0 %, intra-Community supply (VAT Directive art. 138).",
      euServices: "Reverse charge, VAT Directive art. 44.",
      nonEu: "VAT 0 %, exempt sale outside the EU.",
      reverse: "Reverse charge.",
      unregistered:
        "The seller is not liable for VAT: small-scale business (Finnish VAT Act, section 3).",
    },
    quoteTitle: (n) => `Quotation ${n}`,
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

/** The file name of a quote's PDF (§8.34). */
export function quoteFileName(
  lang: InvoiceLang,
  number: number,
  customerName: string
): string {
  const stem = customerName.replace(/[\/:*?"<>|]/g, "").trim()
  return `${lang === "fi" ? "Tarjous" : "Quotation"} ${number} - ${stem}.pdf`
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

/** The words printed on a customer statement, in the customer's language (§8.29). */
export interface StatementLabels {
  title: string
  date: string
  /** The line under the buyer saying what the statement covers. */
  openScope: (date: string) => string
  periodScope: (from: string | null, to: string | null) => string
  invoice: string
  invoiceDate: string
  dueDate: string
  total: string
  paid: string
  open: string
  creditNote: string
  overdueDays: (days: number) => string
  openTotal: string
  overdueTotal: string
  /** How to pay what is open: each invoice with its own reference. */
  howToPay: (iban: string) => string
  none: string
  fileName: (customer: string, date: string) => string
}

const STATEMENT_LABELS: Record<InvoiceLang, StatementLabels> = {
  fi: {
    title: "TILIOTE",
    date: "Päivämäärä",
    openScope: (date) => `Avoimet laskut ${date}`,
    periodScope: (from, to) =>
      from && to
        ? `Laskut ${from}–${to}`
        : from
          ? `Laskut ${from} alkaen`
          : to
            ? `Laskut ${to} asti`
            : "Kaikki laskut",
    invoice: "Lasku",
    invoiceDate: "Päiväys",
    dueDate: "Eräpäivä",
    total: "Summa",
    paid: "Maksettu",
    open: "Avoinna",
    creditNote: "hyvitys",
    overdueDays: (days) => `${days} pv myöhässä`,
    openTotal: "Avoinna yhteensä",
    overdueTotal: "Josta erääntynyt",
    howToPay: (iban) =>
      `Maksathan avoimet laskut tilille ${iban} kunkin laskun omalla viitenumerolla. Jos olet jo maksanut, tämä tiliote ei vaadi toimenpiteitä.`,
    none: "Ei laskuja.",
    fileName: (customer, date) =>
      `Tiliote ${date} - ${customer.trim() || "asiakas"}.pdf`,
  },
  en: {
    title: "STATEMENT",
    date: "Date",
    openScope: (date) => `Open invoices on ${date}`,
    periodScope: (from, to) =>
      from && to
        ? `Invoices from ${from} to ${to}`
        : from
          ? `Invoices from ${from}`
          : to
            ? `Invoices up to ${to}`
            : "All invoices",
    invoice: "Invoice",
    invoiceDate: "Date",
    dueDate: "Due",
    total: "Amount",
    paid: "Paid",
    open: "Open",
    creditNote: "credit",
    overdueDays: (days) => `${days} days overdue`,
    openTotal: "Total open",
    overdueTotal: "Of which overdue",
    howToPay: (iban) =>
      `Please pay the open invoices to ${iban}, each with its own reference number. If you have already paid, no action is needed.`,
    none: "No invoices.",
    fileName: (customer, date) =>
      `Statement ${date} - ${customer.trim() || "customer"}.pdf`,
  },
}

export function statementLabels(lang: InvoiceLang): StatementLabels {
  return STATEMENT_LABELS[lang]
}
