"use client"

import { EntryDisclosure } from "@/components/entry/entry-disclosure"
import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { useEntryFigures } from "@/hooks/use-entry-figures"

/**
 * Where a saved voucher counts (§8.18): the VAT return field and Form 5 fields
 * it adds to. Each line opens the list of every voucher in that field, so the
 * way from a voucher to the figures is as short as the way back. It reads the
 * voucher as saved, not the form being edited.
 */
export function EntryFigures({ entryId }: { entryId: string | undefined }) {
  const f = useFormatters()
  const groups = useEntryFigures(entryId)
  if (!groups.length) return null

  return (
    <EntryDisclosure title={f.t("entry.figuresTitle")}>
      <p className="text-xs text-muted-foreground">{f.t("entry.figuresHint")}</p>
      <div className="mt-2 flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.heading}>
            <h4 className="text-xs font-medium text-muted-foreground">
              {group.heading}
            </h4>
            <ul className="mt-0.5 flex flex-col">
              {group.items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.open}
                    // Spans have no separator in an accessible name.
                    aria-label={`${item.code} ${item.label}`}
                    className="focus-ring flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
                  >
                    <span className="tabular w-9 shrink-0 text-muted-foreground">
                      {item.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <Money cents={item.amount} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EntryDisclosure>
  )
}
