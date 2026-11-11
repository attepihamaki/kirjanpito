import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import { openMailto, shareFile } from "@/lib/browser/share"
import { UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import type { Quote, QuoteOutcome } from "@/lib/domain/invoice"
import { sellerOf } from "@/lib/domain/invoice-calc"
import { quoteFileName } from "@/lib/domain/invoice-labels"
import { mailtoUrl, quoteMail } from "@/lib/domain/invoice-mail"
import {
  invoiceFromQuote,
  quoteProblems,
  type QuoteProblem,
} from "@/lib/domain/quote"
import type { MessageKey } from "@/lib/i18n/messages"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/**
 * Quotes (§8.34). A quote lives in the invoice settings beside the products
 * and recurring templates, books nothing and is printed with the seller as
 * the settings describe it on the day.
 */

const PROBLEM_MESSAGES: Record<QuoteProblem, MessageKey> = {
  noRows: "invoice.problemNoRows",
  badRow: "invoice.problemBadRow",
  noCustomer: "invoice.problemNoCustomer",
  sellerName: "invoice.problemSellerName",
  sellerAddress: "invoice.problemSellerAddress",
  validBeforeDate: "quote.problemValidBeforeDate",
  zeroRateVat: "invoice.problemZeroRateVat",
  vatUnregistered: "invoice.problemVatUnregistered",
}

/** Replace the quotes with `next`. */
function setQuotes(next: (quotes: Quote[]) => Quote[]): void {
  const s = useBookStore.getState()
  s.setInvoiceSettings({
    ...s.invoiceSettings,
    quotes: next(s.invoiceSettings.quotes),
  })
}

/** Store a new or changed quote. */
export function saveQuote(quote: Quote): void {
  setQuotes((quotes) =>
    quotes.some((q) => q.id === quote.id)
      ? quotes.map((q) => (q.id === quote.id ? quote : q))
      : [...quotes, quote]
  )
}

/** The quote's PDF and file name, or null with a toast saying what is missing. */
async function renderQuote(
  ctx: Ctx,
  quote: Quote
): Promise<{ bytes: Uint8Array; name: string } | null> {
  const s = useBookStore.getState()
  const business = {
    name: s.businessName,
    businessId: s.businessId,
    phone: s.businessPhone,
  }
  const problems = quoteProblems(quote, s.invoiceSettings, business)
  if (problems.length > 0) {
    toast.add({ title: ctx.t(PROBLEM_MESSAGES[problems[0]]) })
    return null
  }
  try {
    const { renderQuotePdf } = await import("@/lib/browser/invoice-pdf")
    return {
      bytes: await renderQuotePdf(
        quote,
        sellerOf(s.invoiceSettings, business),
        s.invoiceSettings
      ),
      name: quoteFileName(quote.language, quote.number, quote.customer.name),
    }
  } catch (error) {
    console.warn("Quote PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
    return null
  }
}

/** Download a quote's PDF. */
export async function downloadQuotePdf(ctx: Ctx, quote: Quote): Promise<void> {
  const rendered = await renderQuote(ctx, quote)
  if (!rendered) return
  saveBlob(
    new Blob([rendered.bytes as BlobPart], { type: "application/pdf" }),
    rendered.name
  )
}

/**
 * Send a quote the way an invoice is sent (§8.27): to the share sheet where
 * it takes files, or downloaded with a `mailto:` link to the customer.
 */
export async function sendQuote(ctx: Ctx, quote: Quote): Promise<void> {
  const rendered = await renderQuote(ctx, quote)
  if (!rendered) return
  const mail = quoteMail(quote, {
    name: useBookStore.getState().businessName ?? "",
  })
  const file = new File([rendered.bytes as BlobPart], rendered.name, {
    type: "application/pdf",
  })
  const result = await shareFile(file, { title: mail.subject, text: mail.body })
  if (result !== "unsupported") return
  saveBlob(file, rendered.name)
  openMailto(mailtoUrl(mail))
  toast.add({ title: ctx.t("invoice.sendAttach") })
}

/** Mark the customer's answer, or clear it with null. */
export function setQuoteOutcome(
  quoteId: string,
  outcome: QuoteOutcome | null
): void {
  setQuotes((quotes) =>
    quotes.map((q) => (q.id === quoteId ? { ...q, outcome } : q))
  )
}

/**
 * Make an invoice draft from a quote, dated today, and mark the quote
 * accepted and linked to it. Returns the draft's id, or null when there is
 * no such quote.
 */
export function invoiceQuote(quoteId: string): string | null {
  const s = useBookStore.getState()
  const quote = s.invoiceSettings.quotes.find((q) => q.id === quoteId)
  if (!quote) return null
  const draft = invoiceFromQuote(quote, todayIso(), {
    termDays: s.invoiceSettings.termDays,
    customers: s.customers,
    makeId: uid,
  })
  s.setInvoices([...s.invoices, draft])
  setQuotes((quotes) =>
    quotes.map((q) =>
      q.id === quoteId ? { ...q, outcome: "accepted", invoiceId: draft.id } : q
    )
  )
  return draft.id
}

/** Delete a quote after asking. The toast undoes it. */
export async function deleteQuote(ctx: Ctx, quote: Quote): Promise<boolean> {
  const ok = await confirm({
    title: ctx.t("quote.deleteTitle", { n: quote.number }),
    message: ctx.t("quote.deleteMessage"),
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
    destructive: true,
  })
  if (!ok) return false
  setQuotes((quotes) => quotes.filter((q) => q.id !== quote.id))
  const id = toast.add({
    title: ctx.t("quote.deleted", { n: quote.number }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        setQuotes((quotes) =>
          quotes.some((q) => q.id === quote.id)
            ? quotes
            : [...quotes, quote].sort((a, b) => a.number - b.number)
        )
      },
    },
  })
  return true
}
