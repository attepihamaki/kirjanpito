import { formatDate } from "@/lib/domain/dates"
import { formatIban } from "@/lib/domain/iban"
import type { Invoice } from "@/lib/domain/invoice"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import { formatReference } from "@/lib/domain/invoice-reference"
import { formatMoney } from "@/lib/domain/money"

/** The mail an invoice is sent with (§8.27). The app sends nothing itself. */
export interface InvoiceMail {
  /** The customer's address, or "" when the register has none. */
  to: string
  subject: string
  body: string
}

/**
 * The subject and text of the mail that carries an invoice or a credit note,
 * in the invoice's own language. `creditedNumber` is the number of the invoice
 * a credit note credits. Payment details are in the text as well as on the
 * PDF, so a customer can pay from the mail alone.
 */
export function invoiceMail(
  invoice: Invoice,
  creditedNumber: number | null = null
): InvoiceMail {
  const { language: lang, number, seller } = invoice
  if (number === null || !seller)
    throw new Error("only an issued invoice can be sent")
  const credit = invoice.credits !== null
  const amount = formatMoney(invoiceTotals(invoice.rows).gross)
  const fi = lang === "fi"
  const word = credit
    ? fi
      ? "Hyvityslasku"
      : "Credit note"
    : fi
      ? "Lasku"
      : "Invoice"
  const subject = `${word} ${number} – ${seller.name}`

  const lines: string[] = [fi ? "Hei," : "Hello,", ""]
  if (credit) {
    lines.push(
      fi
        ? `Oheisena hyvityslasku ${number}${creditedNumber !== null ? ` laskusta ${creditedNumber}` : ""}, yhteensä ${amount}.`
        : `Attached is credit note ${number}${creditedNumber !== null ? ` for invoice ${creditedNumber}` : ""}, ${amount} in total.`
    )
  } else {
    lines.push(
      fi
        ? `Oheisena lasku ${number}, yhteensä ${amount}. Eräpäivä on ${formatDate(invoice.dueDate, lang)}.`
        : `Attached is invoice ${number}, ${amount} in total. It is due on ${formatDate(invoice.dueDate, lang)}.`
    )
    if (invoice.reference && seller.iban) {
      lines.push(
        "",
        fi
          ? `Tilinumero: ${formatIban(seller.iban)}`
          : `Account: ${formatIban(seller.iban)}`,
        fi
          ? `Viitenumero: ${formatReference(invoice.reference)}`
          : `Reference number: ${formatReference(invoice.reference)}`
      )
    }
  }
  lines.push("", fi ? "Ystävällisin terveisin," : "Kind regards,", seller.name)
  return { to: invoice.customer.email.trim(), subject, body: lines.join("\n") }
}

/** A `mailto:` link for the mail, with the text encoded and the line breaks as CRLF. */
export function mailtoUrl(mail: InvoiceMail): string {
  const query = [
    `subject=${encodeURIComponent(mail.subject)}`,
    `body=${encodeURIComponent(mail.body).replace(/%0A/g, "%0D%0A")}`,
  ].join("&")
  return `mailto:${encodeURIComponent(mail.to).replace(/%40/g, "@")}?${query}`
}
