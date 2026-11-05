"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

/**
 * A closed-by-default section of the entry dialog, for what a voucher shows
 * only when asked: where it counts (§8.18) and its history (§8.11). The
 * summary is the whole of it until opened, so neither crowds the form.
 */
export function EntryDisclosure({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="group border-t pt-1 text-sm">
      <summary className="focus-ring flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pt-1 pb-2">{children}</div>
    </details>
  )
}
