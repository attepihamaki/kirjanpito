import { toast } from "@/components/ui/toast"

import { UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
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

  const closed = booking.added.filter((e) => {
    const year = e.date.slice(0, 4)
    return state.yearsArchived[year] || state.form5Filed[year]
  })
  if (closed.length > 0) {
    toast.add({ title: ctx.t("entry.lockedRefused", { n: closed.length }) })
    return false
  }
  if (after.length === 0 && booking.added.length === 0) return false

  const changed = new Map(after.map((e) => [e.id, e]))
  const next = [
    ...state.entries.map((e) => changed.get(e.id) ?? e),
    ...booking.added,
  ]
  if (!(await confirmFiledChange(next))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  if (after.length > 0) store.updateEntries(after)
  if (booking.added.length > 0) store.addEntries(booking.added)

  const addedIds = booking.added.map((e) => e.id)
  const id = toast.add({
    title: ctx.t("bank.booked", {
      paid: after.length,
      added: booking.added.length,
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
        toast.add({ title: ctx.t("bank.undone") })
      },
    },
  })
  return true
}
