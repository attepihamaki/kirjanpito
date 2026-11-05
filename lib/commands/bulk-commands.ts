import { toast } from "@/components/ui/toast"

import {
  offerUndo,
  refuseLocked,
  UNDO_TIMEOUT_MS,
} from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { uid } from "@/lib/domain/id"
import { carveSplit, type SplitPart } from "@/lib/domain/split"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/**
 * Changes to several ledger rows at once (§8.4). Both refuse locked entries
 * (§8.11) and can be undone from the toast.
 */

/** Delete the selected entries. False when the user cancels. */
export async function deleteEntries(
  ctx: Ctx,
  selected: readonly Entry[]
): Promise<boolean> {
  if (selected.length === 0) return false
  if (refuseLocked(ctx, selected)) return false
  const ids = new Set(selected.map((e) => e.id))
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteManyTitle", { n: selected.length }),
    message: ctx.t("confirm.deleteManyMessage"),
    confirmLabel: ctx.t("common.delete"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false
  useBookStore.getState().removeEntries([...ids])
  offerUndo(
    ctx,
    selected,
    ctx.t("entry.deletedMany", { n: selected.length }),
    ctx.t("entry.restoredMany")
  )
  return true
}

/**
 * Add new entries made by the app: a month's recurring entries, a depreciation,
 * a calculated deduction. They ask about a filed period like any other change
 * (§8.11) and can be undone from the toast.
 */
export async function addEntriesWithUndo(
  ctx: Ctx,
  added: readonly Entry[],
  title: string
): Promise<boolean> {
  if (added.length === 0) return false
  const { yearsArchived, form5Filed } = useBookStore.getState()
  const intoClosedYear = added.filter((e) => {
    const year = e.date.slice(0, 4)
    return yearsArchived[year] || form5Filed[year]
  })
  if (refuseLocked(ctx, intoClosedYear)) return false
  const after = [...useBookStore.getState().entries, ...added]
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.addEntries(added)
  const id = toast.add({
    title,
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        now.removeEntries(added.map((e) => e.id))
        toast.add({ title: ctx.t("entry.addUndone") })
      },
    },
  })
  return true
}

/**
 * Carve a part off an entry (§8.4): the original keeps what is left, the new
 * part takes the next voucher number, and both are linked as one receipt. It
 * asks about a filed period like any other change (§8.11) and can be undone
 * from the toast, which puts the original back as it was.
 */
export async function splitEntry(
  ctx: Ctx,
  entry: Entry,
  part: SplitPart
): Promise<boolean> {
  if (refuseLocked(ctx, [entry])) return false
  const state = useBookStore.getState()
  const carved = carveSplit(entry, part, indexCategories(state.cats), {
    part: uid(),
    split: uid(),
  })
  if (!carved.ok) {
    toast.add({
      title: ctx.t(
        carved.error === "amount"
          ? "entry.splitAmountRefused"
          : "entry.splitCategoryRefused"
      ),
    })
    return false
  }
  const { original, part: added } = carved
  const after = [
    ...state.entries.map((e) => (e.id === entry.id ? original : e)),
    added,
  ]
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries([original])
  store.addEntries([added])
  const saved = useBookStore.getState().entries.find((e) => e.id === entry.id)
  const id = toast.add({
    title: ctx.t("entry.splitDone"),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const current = now.entries.find((e) => e.id === entry.id)
        if (
          !current ||
          !saved ||
          JSON.stringify(current) !== JSON.stringify(saved)
        ) {
          toast.add({ title: ctx.t("entry.editUndoChanged") })
          return
        }
        if (refuseLocked(ctx, [current])) return
        now.removeEntries([added.id])
        now.updateEntries([entry])
        toast.add({ title: ctx.t("entry.splitUndone") })
      },
    },
  })
  return true
}

/**
 * Move the selected entries to another category. Each keeps its own VAT
 * rate: the rate belongs to the receipt, not to the category (§4).
 */
export async function recategorizeEntries(
  ctx: Ctx,
  selected: readonly Entry[],
  catId: string
): Promise<boolean> {
  const changed = selected.filter((e) => e.catId !== catId)
  if (changed.length === 0) return false
  if (refuseLocked(ctx, changed)) return false
  const moved = changed.map((e) => ({ ...e, catId }))
  // An entry the return did not count can start to, on another category.
  const byId = new Map(moved.map((e) => [e.id, e]))
  const after = useBookStore.getState().entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(moved)
  const id = toast.add({
    title: ctx.t("entry.recategorized", { n: moved.length }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        /*
         * Only the category goes back. An entry edited since keeps that edit,
         * and one moved again since stays where the user put it.
         */
        const before = new Map(changed.map((e) => [e.id, e.catId]))
        now.updateEntries(
          now.entries.flatMap((e) => {
            const old = before.get(e.id)
            return old && e.catId === catId ? [{ ...e, catId: old }] : []
          })
        )
        toast.add({ title: ctx.t("entry.recategorizeUndone") })
      },
    },
  })
  return true
}
