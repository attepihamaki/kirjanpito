"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { calcEntry } from "@/lib/domain/calc"
import { formatDayMonth } from "@/lib/domain/dates"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The ledger's rows on a phone (§8.4): one line for what the voucher is and
 * its net amount, and one under it for the day, the category and a missing
 * receipt. A tap opens the voucher, which is where everything else is done
 * on a screen this narrow.
 */
export function LedgerList({ rows }: { rows: readonly Entry[] }) {
  const f = useFormatters()
  const cats = useBookStore((s) => s.cats)
  const openDialog = useBookStore((s) => s.openDialog)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  return (
    <ul className="divide-y" aria-label={f.t("ledger.listLabel")}>
      {rows.map((entry) => {
        const income = entry.type === "income"
        const cat = catMap.get(entry.catId)
        const noReceipt = (entry.atts ?? []).length === 0
        return (
          <li key={entry.id}>
            <button
              type="button"
              className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left"
              onClick={() =>
                openDialog({ kind: "entry", mode: "edit", entryId: entry.id })
              }
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "truncate text-[0.9375rem] font-medium",
                    !entry.description && "text-muted-foreground"
                  )}
                >
                  {entry.description || f.t("ledger.noDescription")}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <span className="tabular">
                    {formatDayMonth(entry.date, f.lang)}
                  </span>
                  {cat ? ` · ${f.catLabel(cat)}` : null}
                  {noReceipt ? (
                    <span className="text-warning">
                      {" · "}
                      {f.t("overview.noReceipt")}
                    </span>
                  ) : null}
                  {entry.paidOn === null
                    ? ` · ${f.t("ledger.openPill")}`
                    : null}
                </span>
              </span>
              {/* Net, like the totals above: income with a plus, a cost with a minus. */}
              {income ? (
                <span className="tabular shrink-0 font-semibold text-income">
                  +{f.money(calcEntry(entry).net)}
                </span>
              ) : (
                <Money
                  cents={calcEntry(entry).net}
                  signed
                  className="shrink-0 font-semibold"
                />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
