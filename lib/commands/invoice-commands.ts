import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import { openMailto, shareFile } from "@/lib/browser/share"
import { refuseLocked, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { releaseDraftAttachment, storePdf } from "@/lib/commands/memo-commands"
import { calcEntry } from "@/lib/domain/calc"
import { canCopy, copyDraft, recurringDrafts } from "@/lib/domain/invoice-draft"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { formatMoney } from "@/lib/domain/money"
import type { Invoice } from "@/lib/domain/invoice"
import {
  buildIssue,
  creditableAmount,
  creditDraft,
  invoiceTotals,
  issueProblems,
  type IssueProblem,
} from "@/lib/domain/invoice-calc"
import { invoiceFileName, reminderLabels } from "@/lib/domain/invoice-labels"
import { invoiceMail, mailtoUrl, reminderMail } from "@/lib/domain/invoice-mail"
import {
  openCharges,
  reminderEntries,
  reminderRecord,
  type ReminderFigures,
} from "@/lib/domain/invoice-reminder"
import { applyInvoicePayment, owedOn } from "@/lib/domain/invoice-payment"
import { openEntries } from "@/lib/domain/invoice-status"
import { paidOnFor } from "@/lib/domain/open-items"
import { lockedEntries, paidChangeHitsForm5 } from "@/lib/domain/period-lock"
import {
  indexCategories,
  type Attachment,
  type Cents,
  type Entry,
} from "@/lib/domain/types"
import type { MessageKey } from "@/lib/i18n/messages"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"
import { withoutHistory } from "@/stores/history-store"

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
  zeroRateVat: "invoice.problemZeroRateVat",
  vatUnregistered: "invoice.problemVatUnregistered",
  buyerVatId: "invoice.problemBuyerVatId",
  buyerCountry: "invoice.problemBuyerCountry",
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
    owed === -invoiceTotals(draft.rows, draft.discount).gross &&
    draft.date >= original.date &&
    !paidChangeHitsForm5(null, draft.date, state)
  const settledBefore = settled ? originalOpen : []
  const settledAfter: Entry[] = settledBefore.map((e) => ({
    ...e,
    paidOn: paidOnFor(e.date, draft.date),
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
 * Make a payment reminder for an issued invoice (§8.27): draw the letter, book
 * its interest and fee as open income entries of the invoice with the letter as
 * their voucher, keep a record of it on the invoice, and hand the letter to the
 * share sheet or download it. The booking asks about a filed period like any
 * new entry (§8.11). The record stays when the letter was only downloaded,
 * since the user has it either way, and one toast undoes all of it. Returns
 * whether it was made.
 */
export async function makeReminder(
  ctx: Ctx,
  invoiceId: string,
  figures: ReminderFigures,
  on: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice || invoice.number === null || invoice.credits !== null)
    return false
  const entries = reminderEntries(invoice, on, figures, uid)
  if (refuseLocked(ctx, entries)) return false
  if (!(await confirmFiledChange([...state.entries, ...entries]))) return false

  const reminder = reminderRecord(
    uid(),
    on,
    figures,
    entries.map((e) => e.id)
  )
  let bytes: Uint8Array
  try {
    const { renderReminderPdf } = await import("@/lib/browser/invoice-pdf")
    bytes = await renderReminderPdf(invoice, reminder)
  } catch (error) {
    console.warn("Reminder PDF could not be made", error)
    toast.add({ title: ctx.t("invoice.pdfDownloadFailed") })
    return false
  }
  const name = reminderLabels(invoice.language).fileName(
    invoice.number,
    invoice.customer.name
  )
  const mail = reminderMail(invoice, reminder)
  const file = new File([bytes as BlobPart], name, { type: "application/pdf" })

  const att =
    entries.length > 0 ? await storePdf(ctx, name, async () => bytes) : null
  try {
    const withVoucher = entries.map((e) =>
      att ? { ...e, atts: [{ ...att } satisfies Attachment] } : e
    )
    const store = useBookStore.getState()
    const epoch = store.bookEpoch
    if (withVoucher.length > 0) store.addEntries(withVoucher)
    store.setInvoices(
      store.invoices.map((i) =>
        i.id === invoice.id
          ? {
              ...i,
              entryIds: [...i.entryIds, ...entries.map((e) => e.id)],
              reminders: [...(i.reminders ?? []), reminder],
            }
          : i
      )
    )
    const id = toast.add({
      title: ctx.t("invoice.reminderMade", { n: invoice.number }),
      timeout: UNDO_TIMEOUT_MS,
      actionProps: {
        children: ctx.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState()
          if (now.bookEpoch !== epoch) return
          const booked = new Set(entries.map((e) => e.id))
          if (booked.size > 0) now.removeEntries([...booked])
          now.setInvoices(
            now.invoices.map((i) => {
              if (i.id !== invoice.id) return i
              const { reminders, ...rest } = i
              const left = (reminders ?? []).filter((r) => r.id !== reminder.id)
              const entryIds = i.entryIds.filter((e) => !booked.has(e))
              return left.length > 0
                ? { ...rest, entryIds, reminders: left }
                : { ...rest, entryIds }
            })
          )
        },
      },
    })
  } finally {
    if (att?.id) releaseDraftAttachment(att.id)
  }

  const result = await shareFile(file, { title: mail.subject, text: mail.body })
  if (result === "unsupported") {
    saveBlob(file, name)
    openMailto(mailtoUrl(mail))
    toast.add({ title: ctx.t("invoice.sendAttach") })
  }
  return true
}

/**
 * Give up the unpaid interest and fees of an invoice's reminders (§8.27), when
 * the customer paid the invoice but not them, or will not be pressed for them.
 * Their entries are removed from the book and from the invoice, so the income
 * that never came is not reported; the reminder records stay as the log of
 * what was asked. A filed period or a stored year that holds them refuses it.
 * It asks first, and one toast undoes it. Returns whether anything was removed.
 */
export async function waiveReminderCharges(
  ctx: Ctx,
  invoiceId: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return false
  const byId = new Map(state.entries.map((e) => [e.id, e]))
  const removed = openCharges(invoice, byId)
  if (removed.length === 0) return false
  /* Without the invoice's own lock, so only a filed period or a stored year can hold them. */
  const others = state.invoices.filter((i) => i.id !== invoice.id)
  const locked = lockedEntries(
    removed,
    { ...state, invoices: others },
    indexCategories(state.cats)
  )
  if (locked.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: locked.length }) })
    return false
  }
  const total = removed.reduce((sum, e) => sum + calcEntry(e).gross, 0)
  const confirmed = await confirm({
    title: ctx.t("invoice.waiveTitle", { n: invoice.number ?? 0 }),
    message: ctx.t("invoice.waiveMessage", { amount: formatMoney(total) }),
    confirmLabel: ctx.t("invoice.waiveConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  const gone = new Set(removed.map((e) => e.id))
  const held = removed.flatMap((e) =>
    (e.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  )
  const current = store.invoices.find((i) => i.id === invoice.id) ?? invoice
  const waived: Invoice = {
    ...current,
    entryIds: current.entryIds.filter((id) => !gone.has(id)),
    reminders: (current.reminders ?? []).map((r) => {
      if (!r.entryIds) return r
      const left = r.entryIds.filter((id) => !gone.has(id))
      const rest = { ...r }
      delete rest.entryIds
      return left.length > 0 ? { ...rest, entryIds: left } : rest
    }),
  }
  store.holdUndoAttachments(held)
  store.removeEntries([...gone])
  store.setInvoices(
    store.invoices.map((i) => (i.id === invoice.id ? waived : i))
  )
  const id = toast.add({
    title: ctx.t("invoice.waived", { n: invoice.number ?? 0 }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.restoreEntries(removed)
        now.setInvoices(
          now.invoices.map((i) => (i.id === invoice.id ? current : i))
        )
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
  return true
}

/**
 * Record `amount` received for an invoice on `on` (§8.27). The unpaid entries
 * are settled in book order, and an entry the money only reaches in part is
 * split in two (`applyInvoicePayment`). Paying changes nothing the VAT return
 * counts when it settles whole entries, so a filed VAT period does not stop it,
 * but a year whose Form 5 is filed does (§8.11). One toast undoes all of it.
 * Returns whether anything was recorded.
 */
export async function recordInvoicePayment(
  ctx: Ctx,
  invoiceId: string,
  amount: Cents,
  on: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return false
  const byId = new Map(state.entries.map((e) => [e.id, e]))
  const payment = applyInvoicePayment(
    invoice,
    byId,
    amount,
    on,
    () => `e-${uid()}`
  )
  if (!payment) return false
  const before = payment.updated.flatMap((e) => byId.get(e.id) ?? [])
  if (before.length > 0 && paidChangeHitsForm5(null, on, state)) {
    toast.add({ title: ctx.t("bank.paidInFiledYear") })
    return false
  }
  const closed = payment.added.filter((e) => {
    const year = e.date.slice(0, 4)
    return state.yearsArchived[year] || state.form5Filed[year]
  })
  if (closed.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: closed.length }) })
    return false
  }
  const changed = new Map(payment.updated.map((e) => [e.id, e]))
  const next = [
    ...state.entries.map((e) => changed.get(e.id) ?? e),
    ...payment.added,
  ]
  if (!(await confirmFiledChange(next))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(payment.updated)
  if (payment.added.length > 0) store.addEntries(payment.added)
  store.setInvoices(
    store.invoices.map((i) =>
      i.id === invoice.id ? { ...i, entryIds: payment.entryIds } : i
    )
  )
  const addedIds = payment.added.map((e) => e.id)
  const id = toast.add({
    title: ctx.t("invoice.paidMarked", { n: invoice.number ?? 0 }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        if (addedIds.length > 0) now.removeEntries(addedIds)
        now.updateEntries(before)
        now.setInvoices(
          now.invoices.map((i) =>
            i.id === invoice.id ? { ...i, entryIds: invoice.entryIds } : i
          )
        )
      },
    },
  })
  return true
}

/** Mark every unpaid entry of an invoice paid on `on` (§8.27). */
export async function markInvoicePaid(
  ctx: Ctx,
  invoiceId: string,
  on: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return false
  const owed = owedOn(invoice, new Map(state.entries.map((e) => [e.id, e])))
  return recordInvoicePayment(ctx, invoiceId, owed, on)
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
  /* A draft already started for this invoice is opened again, not copied. */
  const started = state.invoices.find(
    (i) => i.credits === original.id && i.number === null
  )
  if (started) return started.id
  const draft = creditDraft(original, uid(), todayIso())
  state.setInvoices([...state.invoices, draft])
  return draft.id
}

/**
 * Delete an issued invoice with its entries (§8.27). A credit note and an
 * invoice that has an issued credit note are refused, since the credit settles
 * against it; a stored year or a filed return still holds the entries. The user
 * is asked first, because the number is not reused. The toast and Ctrl+Z (§8.20)
 * bring back the invoice and its entries as they were. Returns whether it was
 * deleted.
 */
export async function deleteIssuedInvoice(
  ctx: Ctx,
  invoiceId: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice || invoice.number === null) return false
  if (
    invoice.credits !== null ||
    state.invoices.some((i) => i.credits === invoice.id && i.number !== null)
  ) {
    toast.add({ title: ctx.t("invoice.deleteCredited") })
    return false
  }

  const ids = new Set(invoice.entryIds)
  const removed = state.entries.filter((e) => ids.has(e.id))
  /* Without the invoice, so only a filed period or a stored year can hold them. */
  const others = state.invoices.filter((i) => i.id !== invoice.id)
  const locked = lockedEntries(
    removed,
    { ...state, invoices: others },
    indexCategories(state.cats)
  )
  if (locked.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: locked.length }) })
    return false
  }

  const confirmed = await confirm({
    title: ctx.t("invoice.deleteConfirmTitle", { n: invoice.number }),
    message: ctx.t("invoice.deleteConfirmMessage"),
    confirmLabel: ctx.t("invoice.deleteConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  const held = removed.flatMap((e) =>
    (e.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  )
  store.holdUndoAttachments(held)
  store.removeEntries(removed.map((e) => e.id))
  store.setInvoices(store.invoices.filter((i) => i.id !== invoice.id))
  const id = toast.add({
    title: ctx.t("invoice.deleted", { n: invoice.number }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.restoreEntries(removed)
        now.setInvoices([...now.invoices, invoice])
        toast.add({ title: ctx.t("invoice.deleteUndone") })
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
  return true
}

/**
 * Reopen an issued invoice as a draft to correct it (§8.27). Its entries are
 * removed and the number is kept on the draft (`reservedNumber`), so issuing it
 * again takes the same number and the series has no gap. The same invoices are
 * refused as for a delete, and so is anything a filed period or stored year
 * holds. The toast and Ctrl+Z (§8.20) put the issued invoice back as it was.
 * Returns the draft's id, or null when nothing was reopened.
 */
export async function reopenIssuedInvoice(
  ctx: Ctx,
  invoiceId: string
): Promise<string | null> {
  const state = useBookStore.getState()
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  if (!invoice || invoice.number === null) return null
  if (
    invoice.credits !== null ||
    state.invoices.some((i) => i.credits === invoice.id)
  ) {
    toast.add({ title: ctx.t("invoice.reopenCredited") })
    return null
  }

  const ids = new Set(invoice.entryIds)
  const removed = state.entries.filter((e) => ids.has(e.id))
  const others = state.invoices.filter((i) => i.id !== invoice.id)
  const locked = lockedEntries(
    removed,
    { ...state, invoices: others },
    indexCategories(state.cats)
  )
  if (locked.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: locked.length }) })
    return null
  }

  const confirmed = await confirm({
    title: ctx.t("invoice.reopenConfirmTitle", { n: invoice.number }),
    message: ctx.t("invoice.reopenConfirmMessage"),
    confirmLabel: ctx.t("invoice.reopenConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return null

  const draft: Invoice = {
    ...invoice,
    number: null,
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    terms: "",
    reservedNumber: invoice.number,
  }
  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  const held = removed.flatMap((e) =>
    (e.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  )
  store.holdUndoAttachments(held)
  store.removeEntries(removed.map((e) => e.id))
  store.setInvoices(
    store.invoices.map((i) => (i.id === invoice.id ? draft : i))
  )
  const id = toast.add({
    title: ctx.t("invoice.reopened", { n: invoice.number }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const current = now.invoices.find((i) => i.id === invoice.id)
        if (!current || JSON.stringify(current) !== JSON.stringify(draft)) {
          toast.add({ title: ctx.t("invoice.reopenUndoChanged") })
          return
        }
        now.restoreEntries(removed)
        now.setInvoices(
          now.invoices.map((i) => (i.id === invoice.id ? invoice : i))
        )
        toast.add({ title: ctx.t("invoice.reopenUndone") })
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
  return invoice.id
}

/**
 * Copy an invoice as a new draft dated today (§8.27). A credit note is not
 * copied. Returns the draft's id, or null when nothing was made.
 */
export function copyInvoice(invoiceId: string): string | null {
  const state = useBookStore.getState()
  const source = state.invoices.find((i) => i.id === invoiceId)
  if (!source || !canCopy(source)) return null
  const draft = copyDraft(source, todayIso(), {
    termDays: state.invoiceSettings.termDays,
    customers: state.customers,
    makeId: uid,
  })
  state.setInvoices([...state.invoices, draft])
  return draft.id
}

/**
 * Make the drafts the recurring invoices owe on `today` (§8.27), and move
 * each template on. Run when the book opens and when a template changes. The
 * drafts are not an undo step, since the templates' next dates have already
 * moved past them. A toast says how many were made. An archive book makes
 * none. Returns how many were made.
 */
export function makeRecurringDrafts(ctx: Ctx, today = todayIso()): number {
  const state = useBookStore.getState()
  if (state.archiveYear !== null) return 0
  const { recurring } = state.invoiceSettings
  if (recurring.length === 0) return 0
  const run = recurringDrafts(recurring, today, {
    termDays: state.invoiceSettings.termDays,
    customers: state.customers,
    makeId: uid,
  })
  if (run.drafts.length === 0) return 0
  withoutHistory(() => {
    const now = useBookStore.getState()
    now.setInvoiceSettings({ ...now.invoiceSettings, recurring: run.templates })
    now.setInvoices([...now.invoices, ...run.drafts])
  })
  toast.add({
    title: ctx.t("invoice.recurringMade", { n: run.drafts.length }),
  })
  return run.drafts.length
}
