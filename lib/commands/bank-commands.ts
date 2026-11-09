import { toast } from "@/components/ui/toast"

import { UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { applyInvoicePayment } from "@/lib/domain/invoice-payment"
import { uid } from "@/lib/domain/id"
import { paidChangeHitsForm5 } from "@/lib/domain/period-lock"
import { paidDate, paidOnFor } from "@/lib/domain/open-items"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * Booking what the bank import's review list settled (§8.16). The two kinds of
 * change go in together, so one toast undoes both.
 */

export interface BankBooking {
  /** Open entries the money arrived for, with the day it did. */
  paid: readonly { entryId: string; on: string }[]
  /** New entries, built by the dialog. */
  added: readonly Entry[]
  /** Money that pays an invoice in part: the invoice, the amount and the day (§8.27). */
  partial?: readonly { invoiceId: string; amount: number; on: string }[]
  /** Fingerprints of every row the review covered, to recognise them in a later import (§8.16). */
  seen?: readonly string[]
}

/**
 * Apply a booking. Paying an entry changes nothing the VAT return counts, so a
 * filed VAT period does not stop it, but a year whose Form 5 is filed does,
 * as does a new entry in a stored or filed year (§8.11). False when nothing was
 * done: a refusal, a declined prompt or an empty booking.
 */
export async function bookBankRows(
  ctx: Ctx,
  booking: BankBooking
): Promise<boolean> {
  const state = useBookStore.getState()
  const byId = new Map(state.entries.map((e) => [e.id, e]))

  const before: Entry[] = []
  const after: Entry[] = []
  for (const { entryId, on } of booking.paid) {
    const e = byId.get(entryId)
    if (!e) continue
    if (paidChangeHitsForm5(paidDate(e), on, state)) {
      toast.add({ title: ctx.t("bank.paidInFiledYear") })
      return false
    }
    before.push(e)
    after.push({ ...e, paidOn: paidOnFor(e.date, on) })
  }

  /*
   * A part payment splits an entry in two, so each is applied to what the one
   * before left, and the invoice takes the new part's id.
   */
  const addedAll = [...booking.added]
  const invoicesBefore = new Map<string, string[]>()
  const invoicesNow = new Map(state.invoices.map((i) => [i.id, i]))
  const working = new Map(byId)
  for (const e of after) working.set(e.id, e)
  for (const { invoiceId, amount, on } of booking.partial ?? []) {
    const invoice = invoicesNow.get(invoiceId)
    if (!invoice) continue
    const payment = applyInvoicePayment(
      invoice,
      working,
      amount,
      on,
      () => `e-${uid()}`
    )
    if (!payment) continue
    for (const e of payment.updated) {
      if (paidChangeHitsForm5(null, on, state)) {
        toast.add({ title: ctx.t("bank.paidInFiledYear") })
        return false
      }
      const original = byId.get(e.id)
      if (original && !before.some((b) => b.id === e.id)) before.push(original)
      const i = after.findIndex((a) => a.id === e.id)
      if (i >= 0) after[i] = e
      else after.push(e)
      working.set(e.id, e)
    }
    for (const e of payment.added) {
      addedAll.push(e)
      working.set(e.id, e)
    }
    if (!invoicesBefore.has(invoiceId))
      invoicesBefore.set(invoiceId, invoice.entryIds)
    invoicesNow.set(invoiceId, { ...invoice, entryIds: payment.entryIds })
  }

  const closed = addedAll.filter((e) => {
    const year = e.date.slice(0, 4)
    return state.yearsArchived[year] || state.form5Filed[year]
  })
  if (closed.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: closed.length }) })
    return false
  }
  if (after.length === 0 && addedAll.length === 0) return false

  const changed = new Map(after.map((e) => [e.id, e]))
  const next = [
    ...state.entries.map((e) => changed.get(e.id) ?? e),
    ...addedAll,
  ]
  if (!(await confirmFiledChange(next))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  if (after.length > 0) store.updateEntries(after)
  if (addedAll.length > 0) store.addEntries(addedAll)
  if (invoicesBefore.size > 0)
    store.setInvoices(
      store.invoices.map((i) => {
        const now = invoicesNow.get(i.id)
        return invoicesBefore.has(i.id) && now ? now : i
      })
    )
  /* Only the rows this booking made known are forgotten again by the undo. */
  const known = new Set(store.bankSeen)
  const newlySeen = [...new Set(booking.seen ?? [])].filter(
    (s) => !known.has(s)
  )
  if (newlySeen.length > 0) store.addBankSeen(newlySeen)

  const addedIds = addedAll.map((e) => e.id)
  const id = toast.add({
    title: ctx.t("bank.booked", {
      paid: after.length,
      added: addedAll.length,
    }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        if (addedIds.length > 0) now.removeEntries(addedIds)
        if (before.length > 0) now.updateEntries(before)
        if (invoicesBefore.size > 0)
          now.setInvoices(
            now.invoices.map((i) => {
              const was = invoicesBefore.get(i.id)
              return was ? { ...i, entryIds: was } : i
            })
          )
        if (newlySeen.length > 0) now.removeBankSeen(newlySeen)
        toast.add({ title: ctx.t("bank.undone") })
      },
    },
  })
  return true
}
