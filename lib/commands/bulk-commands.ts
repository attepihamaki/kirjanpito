import { toast } from "@/components/ui/toast"

import { offerUndo, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import {
  confirmFiledChange,
  filedChangeNotice,
} from "@/lib/commands/filed-commands"
import type { Entry } from "@/lib/domain/types"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/**
 * Changes to several ledger rows at once (§8.4). Both ask about any filed
 * VAT period they would change (§8.11) and can be undone from the toast.
 */

/** Delete the selected entries. False when the user cancels. */
export async function deleteEntries(
  ctx: Ctx,
  selected: readonly Entry[]
): Promise<boolean> {
  if (selected.length === 0) return false
  const ids = new Set(selected.map((e) => e.id))
  const after = useBookStore.getState().entries.filter((e) => !ids.has(e.id))
  const filed = filedChangeNotice(after)
  const message = ctx.t("confirm.deleteManyMessage")
  const confirmed = await confirm({
    title: ctx.t("confirm.deleteManyTitle", { n: selected.length }),
    message: filed ? `${message}\n\n${filed}` : message,
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
  const moved = changed.map((e) => ({ ...e, catId }))
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
