import { toast } from "@/components/ui/toast"

import {
  offerEditUndo,
  offerUndo,
  refuseLocked,
  UNDO_TIMEOUT_MS,
} from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import { uid } from "@/lib/domain/id"
import { versionAfter } from "@/lib/domain/change-log"
import { paidDate, paidOnFor } from "@/lib/domain/open-items"
import { paidChangeHitsForm5 } from "@/lib/domain/period-lock"
import {
  entryToRecurring,
  everyOf,
  matchRecurring,
} from "@/lib/domain/recurring"
import { carveSplit, mergeSplitPart, type SplitPart } from "@/lib/domain/split"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/**
 * Changes to several ledger rows at once (§8.4). Each refuses what a lock
 * holds (§8.11) and can be undone from the toast.
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
 * Fold one part of a split back into another (§8.4): its amount is added to
 * the part with the lowest voucher number, which keeps its category and rate,
 * and the part is deleted. It asks first, since the folded part's own category
 * and rate are lost, asks about a filed period like any change (§8.11) and can
 * be undone from the toast, unless the part it went into was edited since.
 */
export async function mergeSplit(ctx: Ctx, entry: Entry): Promise<boolean> {
  const state = useBookStore.getState()
  const merged = mergeSplitPart(entry, state.entries)
  if (!merged) return false
  const { target, result } = merged
  if (refuseLocked(ctx, [entry, target])) return false

  const confirmed = await confirm({
    title: ctx.t("confirm.mergeSplitTitle"),
    message: ctx.t("confirm.mergeSplitMessage", {
      a: entry.voucher ?? "",
      b: target.voucher ?? "",
    }),
    confirmLabel: ctx.t("confirm.mergeSplitConfirm"),
    cancelLabel: ctx.t("common.cancel"),
    destructive: false,
  })
  if (!confirmed) return false

  const after = state.entries
    .filter((e) => e.id !== entry.id)
    .map((e) => (e.id === target.id ? result : e))
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  const held = (entry.atts ?? []).flatMap((a) => (a.id ? [a.id] : []))
  store.holdUndoAttachments(held)
  store.updateEntries([result])
  store.removeEntry(entry.id)
  const saved = useBookStore.getState().entries.find((e) => e.id === target.id)
  const id = toast.add({
    title: ctx.t("entry.splitMerged"),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const current = now.entries.find((e) => e.id === target.id)
        if (
          !current ||
          !saved ||
          JSON.stringify(current) !== JSON.stringify(saved)
        ) {
          toast.add({ title: ctx.t("entry.editUndoChanged") })
          return
        }
        if (refuseLocked(ctx, [current])) return
        now.updateEntries([target])
        now.restoreEntries([entry])
        toast.add({ title: ctx.t("entry.splitMergeUndone") })
      },
    },
    onRemove: () => useBookStore.getState().releaseUndoAttachments(held),
  })
  return true
}

/**
 * Change one voucher's description from the ledger row (§8.4). A locked
 * voucher refuses. The monthly template the voucher was made from follows the
 * new text, or the month would count as lacking its entry (§8.5). The toast
 * undoes it like any single-voucher edit (§8.11). False when nothing changed.
 */
export function renameEntry(
  ctx: Ctx,
  entry: Entry,
  description: string
): boolean {
  const text = description.trim()
  if (text === entry.description) return false
  if (refuseLocked(ctx, [entry])) return false
  const store = useBookStore.getState()
  const recurringBefore = store.recurring
  const template = matchRecurring(recurringBefore, entry)
  const renamed = { ...entry, description: text }
  store.updateEntries([renamed])
  if (template && text) {
    store.upsertRecurring(
      entryToRecurring(renamed, template.id, template.from, everyOf(template))
    )
  }
  offerEditUndo(ctx, entry, recurringBefore)
  return true
}

/**
 * Mark an open voucher paid on its own date (§8.4). Paying changes nothing the
 * VAT return counts, so a filed VAT period does not stop it, but a year whose
 * Form 5 is filed does (§8.11). The toast undoes it like any single-voucher
 * edit. False when the voucher is not open or the change was refused.
 */
export async function markEntryPaid(ctx: Ctx, entry: Entry): Promise<boolean> {
  if (entry.paidOn !== null) return false
  const state = useBookStore.getState()
  if (paidChangeHitsForm5(null, entry.date, state)) {
    toast.add({ title: ctx.t("bank.paidInFiledYear") })
    return false
  }
  const paid: Entry = { ...entry, paidOn: undefined }
  const after = state.entries.map((e) => (e.id === entry.id ? paid : e))
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  store.updateEntries([paid])
  offerEditUndo(ctx, entry, store.recurring)
  return true
}

/**
 * Put a voucher back as it stood right after step `index` of its change log
 * (§8.11), every later edit undone. `when` is that step's time as the user
 * reads it. It asks first, saying when that version is from and, when a later
 * step touched them, that receipts and links stay as they are, since the log
 * holds only their names. It is an ordinary edit after that: a locked voucher
 * refuses it, a payment moved in or out of a year whose Form 5 is filed is
 * refused, a change that adds to a filed return asks, the log records it, and
 * the toast undoes it. False when nothing was restored.
 */
export async function restoreEntryVersion(
  ctx: Ctx,
  entryId: string,
  index: number,
  when: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const current = state.entries.find((e) => e.id === entryId)
  if (!current) return false
  const records = state.changeLog.filter((r) => r.entryId === entryId)
  const version = versionAfter(current, records, index)
  if (!version) return false
  const restored = version.entry
  if (!state.cats.some((c) => c.id === restored.catId)) {
    toast.add({ title: ctx.t("entry.restoreNoCategory") })
    return false
  }
  if (refuseLocked(ctx, [current, restored])) return false
  if (paidChangeHitsForm5(paidDate(current), paidDate(restored), state)) {
    toast.add({ title: ctx.t("entry.paidInForm5Year") })
    return false
  }
  const confirmed = await confirm({
    title: ctx.t("entry.restoreTitle"),
    message: [
      ctx.t("entry.restoreMessage", { d: when }),
      version.kept.length ? ctx.t("entry.restoreKept") : "",
    ]
      .filter(Boolean)
      .join(" "),
    confirmLabel: ctx.t("entry.restoreConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!confirmed) return false
  const after = useBookStore
    .getState()
    .entries.map((e) => (e.id === entryId ? restored : e))
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  store.updateEntries([restored])
  offerEditUndo(ctx, current, store.recurring)
  return true
}

/**
 * Pay a bill received on `on` (§8.30): every open part of it, a split
 * receipt's parts together, since they share their payment (§8.5). Like
 * `markEntryPaid`, a filed VAT period does not stop it and a year whose Form 5
 * is filed does. One toast undoes all of it, leaving alone a part changed
 * since. False when nothing was open or the change was refused.
 */
export async function payBill(
  ctx: Ctx,
  parts: readonly Entry[],
  on: string
): Promise<boolean> {
  const open = parts.filter((e) => e.paidOn === null)
  if (open.length === 0) return false
  const state = useBookStore.getState()
  if (paidChangeHitsForm5(null, on, state)) {
    toast.add({ title: ctx.t("bank.paidInFiledYear") })
    return false
  }
  const paid = open.map((e): Entry => ({ ...e, paidOn: paidOnFor(e.date, on) }))
  const byId = new Map(paid.map((e) => [e.id, e]))
  const after = state.entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false

  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(paid)
  const id = toast.add({
    title: ctx.t("payables.paid"),
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const saved = new Map(paid.map((e) => [e.id, JSON.stringify(e)]))
        now.updateEntries(
          now.entries.flatMap((e) =>
            saved.get(e.id) === JSON.stringify(e)
              ? [{ ...e, paidOn: null }]
              : []
          )
        )
      },
    },
  })
  return true
}

/**
 * Pay several bills, each on its own day (§8.30), as a payment file asks the
 * bank to. Every open part of each bill is marked, and one toast undoes all
 * of them. A bill whose day falls in a year with Form 5 filed refuses the
 * whole change, like `payBill`. False when nothing was open or it was refused.
 */
export async function payBills(
  ctx: Ctx,
  bills: readonly { parts: readonly Entry[]; on: string }[]
): Promise<boolean> {
  const state = useBookStore.getState()
  const before: Entry[] = []
  const paid: Entry[] = []
  for (const { parts, on } of bills) {
    for (const e of parts) {
      if (e.paidOn !== null) continue
      if (paidChangeHitsForm5(null, on, state)) {
        toast.add({ title: ctx.t("bank.paidInFiledYear") })
        return false
      }
      before.push(e)
      paid.push({ ...e, paidOn: paidOnFor(e.date, on) })
    }
  }
  if (paid.length === 0) return false
  const byId = new Map(paid.map((e) => [e.id, e]))
  const after = state.entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false
  updateWithUndo(
    ctx,
    before,
    paid,
    ctx.t("payables.paidMany", { n: bills.length })
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

/**
 * Write `changed` over `before` and offer the toast's undo (§8.4), which puts
 * back each entry still exactly as the change left it. An entry edited since
 * keeps that edit.
 */
function updateWithUndo(
  ctx: Ctx,
  before: readonly Entry[],
  changed: readonly Entry[],
  title: string
): void {
  const store = useBookStore.getState()
  const epoch = store.bookEpoch
  store.updateEntries(changed)
  const saved = new Map(
    useBookStore
      .getState()
      .entries.filter((e) => changed.some((c) => c.id === e.id))
      .map((e) => [e.id, JSON.stringify(e)])
  )
  const id = toast.add({
    title,
    timeout: UNDO_TIMEOUT_MS,
    actionProps: {
      children: ctx.t("common.undo"),
      onClick: () => {
        toast.close(id)
        const now = useBookStore.getState()
        if (now.bookEpoch !== epoch) return
        const untouched = new Set(
          now.entries
            .filter((e) => saved.get(e.id) === JSON.stringify(e))
            .map((e) => e.id)
        )
        now.updateEntries(before.filter((e) => untouched.has(e.id)))
        toast.add({ title: ctx.t("ledger.bulkUndone") })
      },
    },
  })
}

/** The selection with every other part of each split receipt it touches, since they share a date and a payment (§8.5). */
function withSplitParts(
  selected: readonly Entry[],
  entries: readonly Entry[]
): Entry[] {
  const splits = new Set(selected.flatMap((e) => (e.split ? [e.split] : [])))
  const ids = new Set(selected.map((e) => e.id))
  return entries.filter(
    (e) => ids.has(e.id) || (e.split !== undefined && splits.has(e.split))
  )
}

/**
 * Move the selected entries to one date (§8.4). The date stays inside the
 * entries' own year, so no voucher changes its number series, and a split
 * receipt moves whole. An entry paid on its own date stays paid on it. Locked
 * entries refuse, before and after the move (§8.11), and a change a filed
 * return would see asks first. False when nothing moved.
 */
export async function redateEntries(
  ctx: Ctx,
  selected: readonly Entry[],
  date: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const all = withSplitParts(selected, state.entries)
  if (all.some((e) => e.date.slice(0, 4) !== date.slice(0, 4))) {
    toast.add({ title: ctx.t("ledger.bulkDateYear") })
    return false
  }
  const before = all.filter((e) => e.date !== date)
  if (before.length === 0) return false
  const moved = before.map((e): Entry => ({
    ...e,
    date,
    ...(e.paidOn === date ? { paidOn: undefined } : {}),
  }))
  if (refuseLocked(ctx, before) || refuseLocked(ctx, moved)) return false
  const byId = new Map(moved.map((e) => [e.id, e]))
  const after = state.entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false
  updateWithUndo(
    ctx,
    before,
    moved,
    ctx.t("ledger.bulkDated", { n: moved.length })
  )
  return true
}

/**
 * Give the selected entries one VAT rate (§8.4). An EU purchase's rate is
 * the Finnish rate the buyer reports, set with the purchase itself, so a
 * selection with one is refused. Locked entries refuse and a change a filed
 * return would see asks first (§8.11). False when nothing changed.
 */
export async function setEntriesVat(
  ctx: Ctx,
  selected: readonly Entry[],
  rate: number
): Promise<boolean> {
  if (selected.some((e) => e.euPurchase)) {
    toast.add({ title: ctx.t("ledger.bulkVatEu") })
    return false
  }
  const before = selected.filter((e) => e.vatRate !== rate)
  if (before.length === 0) return false
  if (refuseLocked(ctx, before)) return false
  const changed = before.map((e): Entry => ({ ...e, vatRate: rate }))
  const byId = new Map(changed.map((e) => [e.id, e]))
  const after = useBookStore.getState().entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false
  updateWithUndo(
    ctx,
    before,
    changed,
    ctx.t("ledger.bulkVatDone", { n: changed.length })
  )
  return true
}

/**
 * Record the selected entries as paid on `on` (§8.4), the parts of a split
 * receipt together. Like `payBill`, paying changes nothing a VAT return
 * counts, so a filed VAT period and an invoice's lock do not stop it, but a
 * year whose Form 5 is filed does, before or after. An entry the app counts
 * as paid when it happens, such as a VAT payment, keeps that. False when
 * nothing changed.
 */
export async function setEntriesPaid(
  ctx: Ctx,
  selected: readonly Entry[],
  on: string
): Promise<boolean> {
  const state = useBookStore.getState()
  const before = withSplitParts(selected, state.entries).filter(
    (e) => !e.settles && paidDate(e) !== on
  )
  if (before.length === 0) return false
  if (before.some((e) => paidChangeHitsForm5(paidDate(e), on, state))) {
    toast.add({ title: ctx.t("bank.paidInFiledYear") })
    return false
  }
  const paid = before.map((e): Entry => ({
    ...e,
    paidOn: paidOnFor(e.date, on),
  }))
  const byId = new Map(paid.map((e) => [e.id, e]))
  const after = state.entries.map((e) => byId.get(e.id) ?? e)
  if (!(await confirmFiledChange(after))) return false
  updateWithUndo(
    ctx,
    before,
    paid,
    ctx.t("ledger.bulkPaid", { n: paid.length })
  )
  return true
}
