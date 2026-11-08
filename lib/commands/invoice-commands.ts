import { toast } from "@/components/ui/toast"
import { refuseLocked, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { releaseDraftAttachment, storePdf } from "@/lib/commands/memo-commands"
import { uid } from "@/lib/domain/id"
import {
  buildIssue,
  issueProblems,
  type IssueProblem,
} from "@/lib/domain/invoice-calc"
import { invoiceFileName } from "@/lib/domain/invoice-labels"
import type { Attachment } from "@/lib/domain/types"
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
    state.cats
  )
  if (problems.length > 0) {
    toast.add({ title: ctx.t(PROBLEM_MESSAGES[problems[0]]) })
    return false
  }

  const { invoice, entries } = buildIssue({
    invoice: draft,
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
  if (!(await confirmFiledChange([...state.entries, ...entries]))) return false

  /* Made last, so a refusal above leaves nothing stored. */
  const att = await storePdf(
    ctx,
    invoiceFileName(invoice.language, invoice.number!, invoice.customer.name),
    async () => {
      const { renderInvoicePdf } = await import("@/lib/browser/invoice-pdf")
      return renderInvoicePdf(invoice)
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
    store.setInvoices(
      store.invoices.map((i) => (i.id === draft.id ? invoice : i))
    )
    const id = toast.add({
      title: ctx.t("invoice.issued", { n: invoice.number! }),
      timeout: UNDO_TIMEOUT_MS,
      actionProps: {
        children: ctx.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState()
          if (now.bookEpoch !== epoch) return
          now.removeEntries(entries.map((e) => e.id))
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
