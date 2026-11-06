"use client"

import { ArrowRightIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import type { EntryFigureGroup } from "@/hooks/use-entry-figures"

/**
 * Where a saved voucher counts (§8.18): the VAT return field and Form 5 fields
 * it adds to, one card per return. Each line opens the list of every voucher
 * in that field, so the way from a voucher to the figures is as short as the
 * way back. The groups are those of the voucher as saved, not the form being
 * edited.
 */
export function EntryFigureList({
  groups,
}: {
  groups: readonly EntryFigureGroup[]
}) {
  const f = useFormatters()

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {f.t("entry.figuresHint")}
      </p>
      {groups.map((group) => (
        <section
          key={group.heading}
          className="flex flex-col gap-1 rounded-lg border p-3"
        >
          <h4 className="flex items-center justify-between gap-2 text-sm font-medium">
            {group.heading}
            <ArrowRightIcon
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </h4>
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.open}
                  // Spans have no separator in an accessible name.
                  aria-label={`${item.code} ${item.label}`}
                  className="focus-ring flex w-full items-baseline gap-3 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="tabular w-10 shrink-0 text-muted-foreground">
                    {item.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <Money cents={item.amount} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
