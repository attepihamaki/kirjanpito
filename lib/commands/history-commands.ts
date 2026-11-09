import { toast } from "@/components/ui/toast"

import { changedEntries, unchangedInvoices } from "@/lib/domain/history"
import { lockedEntries } from "@/lib/domain/period-lock"
import { indexCategories } from "@/lib/domain/types"
import type { Ctx } from "@/lib/commands/ctx"
import { useBookStore } from "@/stores/book-store"
import { applyHistoryStep, useHistoryStore } from "@/stores/history-store"

/**
 * Undo or redo the last change to the entries or categories (§8.20). A step
 * that would touch a voucher in a filed VAT period or a locked year is refused
 * and stays on its stack, since KPL 2:7 bars changing it (§8.11).
 */
function step(ctx: Ctx, direction: "undo" | "redo"): boolean {
  const { past, future } = useHistoryStore.getState()
  if ((direction === "undo" ? past : future).length === 0) {
    toast.add({
      title: ctx.t(
        direction === "undo" ? "entry.historyNoUndo" : "entry.historyNoRedo"
      ),
    })
    return false
  }
  let refused = false
  const moved = applyHistoryStep(direction, (from, to) => {
    const state = useBookStore.getState()
    const locked = lockedEntries(
      changedEntries(from.entries, to.entries),
      { ...state, invoices: unchangedInvoices(from.invoices, to.invoices) },
      indexCategories(state.cats)
    )
    refused = locked.length > 0
    return !refused
  })
  toast.add({
    title: refused
      ? ctx.t("entry.historyLocked")
      : ctx.t(
          direction === "undo" ? "entry.historyUndone" : "entry.historyRedone"
        ),
  })
  return moved
}

export const undoChange = (ctx: Ctx) => step(ctx, "undo")
export const redoChange = (ctx: Ctx) => step(ctx, "redo")
