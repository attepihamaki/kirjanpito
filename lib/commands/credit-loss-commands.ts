import { toast } from "@/components/ui/toast"
import { UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { canWriteOff, creditLossEntries } from "@/lib/domain/credit-loss"
import { uid } from "@/lib/domain/id"
import { formatMoney } from "@/lib/domain/money"
import { lockOn, paidChangeHitsForm5 } from "@/lib/domain/period-lock"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { useBookStore, type BookState } from "@/stores/book-store"

/**
 * What a credit loss started from `entryId` writes off (§6.18): every open
 * entry of the invoice the entry belongs to, or the entry alone when it is
 * not on an invoice. Empty when nothing is left to write off.
 */
export function creditLossTargets(
  entryId: string,
  state: Pick<BookState, "entries" | "cats" | "invoices">
): Entry[] {
  const cats = indexCategories(state.cats)
  const byId = new Map(state.entries.map((e) => [e.id, e]))
  const invoice = state.invoices.find(
    (i) => i.number !== null && i.entryIds.includes(entryId)
  )
  const ids = invoice ? invoice.entryIds : [entryId]
  return ids.flatMap((id) => {
    const entry = byId.get(id)
    return entry && canWriteOff(entry, cats) ? [entry] : []
  })
}

export type CreditLossRefusal = "nothing" | "badDate" | "locked"

/**
 * Why `targets` cannot be written off on `on`, or null when they can. The
 * reversal lands on the VAT return of `on`'s month and in `on`'s year, so a
 * filed period or year refuses the date, and so does a date before any sale.
 */
export function creditLossRefusal(
  targets: readonly Entry[],
  on: string
): CreditLossRefusal | null {
  if (targets.length === 0) return "nothing"
  if (targets.some((e) => on < e.date)) return "badDate"
  const state = useBookStore.getState()
  if (lockOn(on, state) || paidChangeHitsForm5(null, on, state)) {
    return "locked"
  }
  return null
}

/**
 * Write `targets` off as a credit loss on `on` (§6.18): a reversing entry for
 * each, and each marked paid that day. One toast undoes both. Returns whether
 * anything was booked.
 */
export async function writeOffCreditLoss(
  ctx: Ctx,
  targets: readonly Entry[],
  on: string
): Promise<boolean> {
  if (creditLossRefusal(targets, on)) return false
  const loss = creditLossEntries(
    targets,
    on,
    () => `e-${uid()}`,
    (e) => ctx.t("entry.creditLossDescription", { x: e.description })
  )
  const state = useBookStore.getState()
  const changed = new Map(loss.updated.map((e) => [e.id, e]))
  const next = [
    ...state.entries.map((e) => changed.get(e.id) ?? e),
    ...loss.added,
  ]
  if (!(await confirmFiledChange(next))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(loss.updated)
  store.addEntries(loss.added)
  const addedIds = loss.added.map((e) => e.id)
  const id = toast.add({
    title: ctx.t("entry.creditLossDone", { a: formatMoney(loss.gross) }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.removeEntries(addedIds)
        now.updateEntries([...targets])
      },
    },
  })
  return true
}
