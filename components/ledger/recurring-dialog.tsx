"use client"

import * as React from "react"
import { RepeatIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCommandCtx } from "@/hooks/use-commands"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
import { todayIso, yearOf } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import {
  dueRecurring,
  monthKey,
  recurringDate,
  recurringToEntry,
} from "@/lib/domain/recurring"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

function monthLabel(
  f: ReturnType<typeof useFormatters>,
  month: string
): string {
  return `${f.month(Number(month.slice(5, 7)) - 1)} ${month.slice(0, 4)}`
}

/**
 * The line above the ledger's totals when the month on screen lacks recurring
 * entries (§8.5): the selected month, or this month on the current year's
 * whole-year view. Any other whole year has no one month to speak of.
 */
export function RecurringNotice() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const selected = useBookStore((s) => s.month)
  const entries = useBookStore((s) => s.entries)
  const recurring = useBookStore((s) => s.recurring)
  const openDialog = useBookStore((s) => s.openDialog)

  const today = todayIso()
  const month =
    selected > 0
      ? monthKey(year, selected)
      : yearOf(today) === year
        ? today.slice(0, 7)
        : null
  if (!month) return null
  const due = dueRecurring(recurring, month, entries)
  if (due.length === 0) return null

  return (
    <Panel bodyClassName="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <RepeatIcon className="size-4 shrink-0 text-muted-foreground" />
        {f.t("recurring.noticeTitle", {
          n: due.length,
          m: monthLabel(f, month),
        })}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openDialog({ kind: "recurring", month })}
      >
        {f.t("recurring.review")}
      </Button>
    </Panel>
  )
}

/** Choose which of a month's recurring entries to add (§8.5). */
export function RecurringDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "recurring") return null
  return <RecurringDialogForm month={dialog.month} />
}

function RecurringDialogForm({ month }: { month: string }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const entries = useBookStore((s) => s.entries)
  const recurring = useBookStore((s) => s.recurring)
  const cats = useBookStore((s) => s.cats)
  const closeDialog = useBookStore((s) => s.closeDialog)

  // Captured at mount, so ticking and adding never reshuffle the list.
  const [due] = React.useState(() => dueRecurring(recurring, month, entries))
  const [chosen, setChosen] = React.useState<ReadonlySet<string>>(
    () => new Set(due.map((r) => r.id))
  )
  const catMap = indexCategories(cats)

  const add = async () => {
    const added = due
      .filter((r) => chosen.has(r.id))
      .map((r) => recurringToEntry(r, month, () => `e-${uid()}`))
    const done = await addEntriesWithUndo(
      ctx,
      added,
      f.t("recurring.added", { n: added.length })
    )
    if (done) closeDialog()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t("recurring.dialogTitle", { m: monthLabel(f, month) })}
          </DialogTitle>
          <DialogDescription>
            {due.length
              ? f.t("recurring.dialogHint")
              : f.t("recurring.noneDue")}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {due.map((r) => (
            <li key={r.id}>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={chosen.has(r.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(chosen)
                    if (checked === true) next.add(r.id)
                    else next.delete(r.id)
                    setChosen(next)
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.description}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {f.date(recurringDate(r.day, month))}
                    {" · "}
                    {f.catLabel(catMap.get(r.catId))}
                  </span>
                </span>
                <Money cents={r.amount} />
              </label>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={chosen.size === 0} onClick={() => void add()}>
            {f.t("recurring.addSelected", { n: chosen.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
