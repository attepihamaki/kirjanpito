import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import { openMailto, shareFile } from "@/lib/browser/share"
import { refuseLocked, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { releaseDraftAttachment, storePdf } from "@/lib/commands/memo-commands"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import type { Invoice } from "@/lib/domain/invoice"
import {
  buildIssue,
  creditableAmount,
  creditDraft,
  invoiceTotals,
  issueProblems,
  type IssueProblem,
} from "@/lib/domain/invoice-calc"
import { invoiceFileName } from "@/lib/domain/invoice-labels"
import { invoiceMail, mailtoUrl } from "@/lib/domain/invoice-mail"
import { openEntries } from "@/lib/domain/invoice-status"
import { paidChangeHitsForm5 } from "@/lib/domain/period-lock"
import type { Attachment, Entry } from "@/lib/domain/types"
import type { MessageKey } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/** The message that tells the user what stops an invoice from being issued. */
const PROBLEM_MESSAGES: Record<IssueProblem, MessageKey> = {
  noRows: "invoice.problemNoRows",
  badRow: "invoice.problemBadRow",
  noCustomer: "invoice.problemNoCustomer",
  customerAddress: "invoice.problemCustomerAddress",
  sellerName: "invoice.problemSellerName",
  sellerId: "invoice.problemSellerId",
  sellerAddress: "invoice.problemSellerAddress",
  sellerIban: "invoice.problemSellerIban",
  badCategory: "invoice.problemBadCategory",
  noTotal: "invoice.problemNoTotal",
  dueBeforeDate: "invoice.problemDueBeforeDate",
  creditOriginal: "invoice.problemCreditOriginal",
  creditTooLarge: "invoice.problemCreditTooLarge",
}

/**
 * Issue a draft invoice (§8.27): take the next number, make the reference,
 * book the open income entries and store the PDF as their voucher. It asks
 * about a filed period like any other new entry (§8.11) and can be undone from
 * the toast, which puts the draft back as it was. The PDF is not downloaded.
 * Returns whether the invoice was issued.
 */
export async function issueInvoice(
  ctx: Ctx,
  invoiceId: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const draft = state.invoices.find((i) => i.id === invoiceId)
  if (!draft || draft.number !== null) return false

  const problems = issueProblems(
    draft,
    state.invoiceSettings,
    {
      name: state.businessName,
      businessId: state.businessId,
      phone: state.businessPhone,
    },
    state.cats,
    state.invoices
  )
  if (problems.length > 0) {
    toast.add({ title: ctx.t(PROBLEM_MESSAGES[problems[0]]) })
    return false
  }

  /*
   * A credit note that takes the whole of an invoice nobody has paid cancels
   * it: both sides are marked paid on the credit's date, so they net to nothing
   * under either way of counting. A part credit, or a credit of a paid
   * invoice, leaves the credit open to be settled when the money moves.
   */
  const byId = new Map(state.entries.map((e) => [e.id, e]))
  const original = state.invoices.find((i) => i.id === draft.credits)
  const originalEntries = original
    ? original.entryIds.flatMap((id) => byId.get(id) ?? [])
    : []
  const originalOpen = original ? openEntries(original, byId) : []
  const owed = originalOpen.reduce((sum, e) => sum + calcEntry(e).gross, 0)
  const settled =
    original !== undefined &&
    originalEntries.length > 0 &&
    originalOpen.length === originalEntries.length &&
    owed === -invoiceTotals(draft.rows).gross &&
    draft.date >= original.date &&
    !paidChangeHitsForm5(null, draft.date, state)
  const settledBefore = settled ? originalOpen : []
  const settledAfter: Entry[] = settledBefore.map((e) => ({
    ...e,
    paidOn: draft.date === e.date ? undefined : draft.date,
  }))

  const { invoice, entries } = buildIssue({
    invoice: draft,
    originalEntries,
    settled,
    settings: state.invoiceSettings,
    business: {
      name: state.businessName,
      businessId: state.businessId,
      phone: state.businessPhone,
    },
    invoices: state.invoices,
    now: new Date().toISOString(),
    makeId: uid,
  })
  if (refuseLocked(ctx, entries)) return false
  const changed = new Map(settledAfter.map((e) => [e.id, e]))
  const next = state.entries.map((e) => changed.get(e.id) ?? e)
  if (!(await confirmFiledChange([...next, ...entries]))) return false

  /* Made last, so a refusal above leaves nothing stored. */
  const att = await storePdf(
    ctx,
    invoiceFileName(
      invoice.language,
      invoice.number!,
      invoice.customer.name,
      invoice.credits !== null
    ),
    async () => {
      const { renderInvoicePdf } = await import("@/lib/browser/invoice-pdf")
      return renderInvoicePdf(invoice, original?.number ?? null)
    }
  )
  if (!att) toast.add({ title: ctx.t("invoice.pdfFailed") })

  try {
    /* One stored file is the voucher of every entry of the invoice (§7.2). */
    const withVoucher = entries.map((e) =>
      att ? { ...e, atts: [{ ...att } satisfies Attachment] } : e
    )
    const store = useBookStore.getState()
    const epoch = store.bookEpoch
    store.addEntries(withVoucher)
    if (settledAfter.length > 0) store.updateEntries(settledAfter)
    store.setInvoices(
      store.invoices.map((i) => (i.id === draft.id ? invoice : i))
    )
    const id = toast.add({
      title: settled
        ? ctx.t("invoice.creditSettled")
        : ctx.t("invoice.issued", { n: invoice.number! }),
      timeout: UNDO_TIMEOUT_MS,
      actionProps: {
        children: ctx.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState()
          if (now.bookEpoch !== epoch) return
          now.removeEntries(entries.map((e) => e.id))
          if (settledBefore.length > 0) now.updateEntries(settledBefore)
          now.setInvoices(
            now.invoices.map((i) => (i.id === draft.id ? draft : i))
          )
          toast.add({ title: ctx.t("invoice.issueUndone") })
        },
      },
    })
    return true
  } finally {
    if (att?.id) releaseDraftAttachment(att.id)
  }
}

/** The PDF of an issued invoice, drawn again from the invoice as it was issued, with its file name. */
async function renderIssued(
  invoice: Invoice
): Promise<{ bytes: Uint8Array; name: string; creditedNumber: number | null }> {
  if (invoice.number === null) throw new Error("not issued")
  const { renderInvoicePdf } = await import("@/lib/browser/invoice-pdf")
  const credited = useBookStore
    .getState()
    .invoices.find((i) => i.id === invoice.credits)
  const creditedNumber = credited?.number ?? null
  return {
    bytes: await renderInvoicePdf(invoice, creditedNumber),
    creditedNumber,
    name: invoiceFileName(
      invoice.language,
      invoice.number,
      invoice.customer.name,
      invoice.credits !== null
    ),
  }
}

/** Download an issued invoice's PDF. */
export async function downloadInvoicePdf(
  ctx: Ctx,
  invoice: Invoice
): Promise<void> {
  if (invoice.number === null) return
  try {
    const { bytes, name } = await renderIssued(invoice)
    saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), name)
  } catch (error) {
    console.warn("Invoice PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
  }
}

/**
 * Send an issued invoice (§8.27). The app sends nothing itself: where the
 * browser has a share sheet for files, the PDF goes to it with the subject and
 * text filled in. Elsewhere the PDF is downloaded and the mail program opens on
 * a `mailto:` link to the customer, and a toast says to attach the file.
 */
export async function sendInvoice(ctx: Ctx, invoice: Invoice): Promise<void> {
  if (invoice.number === null) return
  let rendered: Awaited<ReturnType<typeof renderIssued>>
  try {
    rendered = await renderIssued(invoice)
  } catch (error) {
    console.warn("Invoice PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
    return
  }
  const mail = invoiceMail(invoice, rendered.creditedNumber)
  const file = new File([rendered.bytes as BlobPart], rendered.name, {
    type: "application/pdf",
  })
  const result = await shareFile(file, {
    title: mail.subject,
    text: mail.body,
  })
  if (result !== "unsupported") return
  saveBlob(file, rendered.name)
  openMailto(mailtoUrl(mail))
  toast.add({ title: ctx.t("invoice.sendAttach") })
}

/**
 * Mark every unpaid entry of an invoice paid on `on` (§8.27). Paying changes
 * nothing the VAT return counts, so a filed VAT period does not stop it, but a
 * year whose Form 5 is filed does (§8.11). One toast undoes all of them.
 * Returns whether anything was marked.
 */
export async function markInvoicePaid(
  ctx: Ctx,
  invoiceId: string,
  on: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return false
  const byId = new Map(state.entries.map((e) => [e.id, e]))
  const before = openEntries(invoice, byId)
  if (before.length === 0) return false
  if (paidChangeHitsForm5(null, on, state)) {
    toast.add({ title: ctx.t("bank.paidInFiledYear") })
    return false
  }
  const after: Entry[] = before.map((e) => ({
    ...e,
    paidOn: on === e.date ? undefined : on,
  }))
  const changed = new Map(after.map((e) => [e.id, e]))
  const next = state.entries.map((e) => changed.get(e.id) ?? e)
  if (!(await confirmFiledChange(next))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(after)
  const id = toast.add({
    title: ctx.t("invoice.paidMarked", { n: invoice.number ?? 0 }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.updateEntries(before)
      },
    },
  })
  return true
}

/**
 * Start a credit note for an issued invoice (§8.27): a draft with the invoice's
 * rows turned negative, left for the user to trim before issuing it. Returns
 * its id, or null with a toast when the invoice cannot be credited, because it
 * is not issued, is a credit note itself or has nothing left to credit.
 */
export function startCreditNote(ctx: Ctx, invoiceId: string): string | null {
  const state = useBookStore.getState()
  const original = state.invoices.find((i) => i.id === invoiceId)
  if (!original || original.number === null || original.credits !== null)
    return null
  if (creditableAmount(original, state.invoices) <= 0) {
    toast.add({ title: ctx.t("invoice.creditNothingLeft") })
    return null
  }
  const draft = creditDraft(original, uid(), todayIso())
  state.setInvoices([...state.invoices, draft])
  return draft.id
}
