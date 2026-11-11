"use client"

import * as React from "react"
import { Combobox } from "@base-ui/react/combobox"
import { CheckIcon, SearchIcon, XIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { isCustomer, type Customer } from "@/lib/domain/invoice"
import { cn } from "@/lib/utils"

interface CustomerOption {
  id: string
  name: string
  /** The place and VAT number, shown under the name to tell two alike apart. */
  detail: string
}

/**
 * The invoice dialog's customer search (§8.27): the register's customers,
 * filtered as the user types. Picking one fills the invoice from it; clearing
 * the choice keeps what was filled in as a typed customer.
 */
export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: readonly Customer[]
  /** The register id of the picked customer, or null for a typed one. */
  value: string | null
  /** Called with the picked customer's id, or "" when the choice is cleared. */
  onChange: (id: string) => void
}) {
  const f = useFormatters()
  const options = React.useMemo(
    () =>
      customers
        .filter((c) => isCustomer(c) || c.id === value)
        .sort((a, b) => f.collator.compare(a.name, b.name))
        .map((c): CustomerOption => ({
          id: c.id,
          name: c.name,
          detail: [c.city, c.vatId].filter(Boolean).join(" · "),
        })),
    [customers, value, f.collator]
  )
  const picked = options.find((o) => o.id === value) ?? null

  return (
    <Combobox.Root
      items={options}
      value={picked}
      onValueChange={(next) => onChange(next?.id ?? "")}
      itemToStringLabel={(o) => o.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Combobox.Input
          aria-label={f.t("invoice.customer")}
          placeholder={f.t("invoice.customerSearch")}
          className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-9 pl-9 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
        {picked ? (
          <Combobox.Clear
            aria-label={f.t("invoice.customerClear")}
            className="focus-ring absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon aria-hidden className="size-4" />
          </Combobox.Clear>
        ) : null}
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <Combobox.Popup
            className={cn(
              "max-h-[min(var(--available-height),20rem)] w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            )}
          >
            <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden">
              {f.t("invoice.customerNone")}
            </Combobox.Empty>
            <Combobox.List>
              {(option: CustomerOption) => (
                <Combobox.Item
                  key={option.id}
                  value={option}
                  className="relative flex cursor-default flex-col rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span>{option.name}</span>
                  {option.detail ? (
                    <span className="text-xs text-muted-foreground">
                      {option.detail}
                    </span>
                  ) : null}
                  <Combobox.ItemIndicator className="absolute top-1/2 right-2 -translate-y-1/2">
                    <CheckIcon aria-hidden className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
