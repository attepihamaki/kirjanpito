"use client"

import * as React from "react"
import { Trash2Icon, XIcon } from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  deleteEntries,
  recategorizeEntries,
} from "@/lib/commands/bulk-commands"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"
import { categoriesToMoveTo, compareCategories } from "@/stores/selectors"

/**
 * What can be done to the selected ledger rows (§8.4): move them to another
 * category, or delete them. Shown only while something is selected.
 */
export function BulkBar({
  selected,
  onDone,
}: {
  selected: readonly Entry[]
  /** Clears the selection once an action has gone through. */
  onDone: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const cats = useBookStore((s) => s.cats)

  // A category belongs to one side, so mixed rows cannot share one.
  const type = selected.every((e) => e.type === selected[0]?.type)
    ? selected[0]?.type
    : undefined

  const eu = !!selected[0]?.euPurchase
  const euMixed = selected.some((e) => !!e.euPurchase !== eu)

  const options = React.useMemo(
    () =>
      categoriesToMoveTo(cats, type, eu)
        .sort((a, b) =>
          compareCategories(a, b, (x, y) =>
            f.collator.compare(f.catName(x), f.catName(y))
          )
        )
        .map((c) => ({ value: c.id, label: f.catLabel(c) })),
    [cats, type, eu, f]
  )

  const recategorize = async (catId: string) => {
    if (await recategorizeEntries(ctx, selected, catId)) onDone()
  }
  const remove = async () => {
    if (await deleteEntries(ctx, selected)) onDone()
  }

  return (
    <div
      role="region"
      aria-label={f.t("ledger.selected", { n: selected.length })}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2"
    >
      <span className="tabular text-sm font-medium">
        {f.t("ledger.selected", { n: selected.length })}
      </span>

      {type && !euMixed ? (
        <OptionSelect
          options={options}
          value=""
          placeholder={f.t("ledger.bulkCategory")}
          label={f.t("ledger.bulkCategory")}
          size="sm"
          className="w-[16rem] bg-background"
          onChange={(catId) => void recategorize(catId)}
        />
      ) : (
        <span className="text-xs text-muted-foreground">
          {type ? f.t("ledger.bulkMixedEu") : f.t("ledger.bulkMixed")}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        className="bg-background"
        onClick={() => void remove()}
      >
        <Trash2Icon data-icon="inline-start" />
        {f.t("ledger.bulkDelete")}
      </Button>

      <Button variant="ghost" size="sm" className="ml-auto" onClick={onDone}>
        <XIcon data-icon="inline-start" />
        {f.t("ledger.bulkClear")}
      </Button>
    </div>
  )
}
