import { toast } from "@/components/ui/toast"

import { refuseLocked, UNDO_TIMEOUT_MS } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import type { Category } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * Start deleting a custom category (§8.10). One nothing uses goes at once, with
 * an undo. One with vouchers or recurring templates opens a dialog that asks
 * where they move, and a locked voucher on it stops the delete here (§8.11).
 */
export function startDeleteCategory(ctx: Ctx, cat: Category): void {
  const { entries, recurring, openDialog } = useBookStore.getState()
  const onCat = entries.filter((e) => e.catId === cat.id)
  if (refuseLocked(ctx, onCat)) return
  if (onCat.length > 0 || recurring.some((r) => r.catId === cat.id)) {
    openDialog({ kind: "category-delete", id: cat.id })
    return
  }
  void deleteCategory(ctx, cat)
}

/**
 * Delete a custom category, moving what uses it to `target`. Each voucher keeps
 * its own VAT rate (§4), and an EU purchase takes the target's goods or services
 * status (§6.9). False when a lock or the filed-return question stops it.
 */
export async function deleteCategory(
  ctx: Ctx,
  cat: Category,
  target?: { cat: Category; label: string }
): Promise<boolean> {
  const state = useBookStore.getState()
  const onCat = state.entries.filter((e) => e.catId === cat.id)
  const templates = state.recurring.filter((r) => r.catId === cat.id)
  if ((onCat.length > 0 || templates.length > 0) && !target) return false
  if (refuseLocked(ctx, onCat)) return false

  const retarget = target
    ? {
        catId: target.cat.id,
        ...(target.cat.euPurchase ? { euPurchase: target.cat.euPurchase } : {}),
      }
    : {}
  const moved = onCat.map((e) => ({ ...e, ...retarget }))
  // Moving to another line can change what a filed return counts (§8.11).
  const byId = new Map(moved.map((e) => [e.id, e]))
  const after = useBookStore.getState().entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  if (moved.length > 0) store.updateEntries(moved)
  templates.forEach((r) => store.upsertRecurring({ ...r, ...retarget }))
  store.removeCategory(cat.id)

  const id = toast.add({
    title: target
      ? ctx.t("settings.categoryDeletedMoved", {
          c: cat.name,
          t: target.label,
        })
      : ctx.t("settings.categoryDeleted", { c: cat.name }),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        // The category comes first: an entry takes its EU status from it.
        if (!now.cats.some((c) => c.id === cat.id)) {
          now.setCategories([...now.cats, cat])
        }
        if (target) {
          /*
           * Only what still sits on the target goes back. A voucher moved again
           * since stays where the user put it.
           */
          const before = new Map(onCat.map((e) => [e.id, e]))
          now.updateEntries(
            now.entries.flatMap((e) => {
              const old = before.get(e.id)
              return old && e.catId === target.cat.id
                ? [{ ...e, catId: old.catId, euPurchase: old.euPurchase }]
                : []
            })
          )
          templates.forEach((old) => {
            const current = now.recurring.find((r) => r.id === old.id)
            if (current && current.catId === target.cat.id) {
              now.upsertRecurring({
                ...current,
                catId: old.catId,
                euPurchase: old.euPurchase,
              })
            }
          })
        }
        toast.add({
          title: ctx.t("settings.categoryRestored", { c: cat.name }),
        })
      },
    },
  })
  return true
}
