"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * A row of links between the sub-pages of one view: Asetukset (§8.10) and
 * Tuloslaskelma (§8.8).
 */
export function SubPageTabs({
  label,
  tabs,
}: {
  label: string
  tabs: ReadonlyArray<{ href: string; label: string }>
}) {
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")

  return (
    <nav
      aria-label={label}
      className="scroll-strip -mx-1 mb-6 gap-1.5 px-1 pb-1"
    >
      {tabs.map(({ href, label }) => {
        const active = current === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            /*
             * Shaped like the ledger's month chips (§8.4), but the current
             * tab is muted rather than filled: this is where you are, not a
             * filter you chose.
             */
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm whitespace-nowrap transition-colors",
              "focus-ring",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
