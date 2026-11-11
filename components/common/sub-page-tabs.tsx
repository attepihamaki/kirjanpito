"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useT } from "@/components/lang-provider"
import { toggleVariants } from "@/components/ui/toggle"
import { activeGroupIndex, type SubPageGroup } from "@/lib/ui/sub-pages"
import { cn } from "@/lib/utils"

/**
 * The tabs of a view (§8.2): Kirjanpito, Laskutus, ALV, Tuloslaskelma and
 * Asetukset. A tab that groups several pages shows a segmented switch
 * between them under the row, so a view keeps four tabs or fewer however
 * many pages it has. Every page keeps its own URL; the switch is links, not
 * state.
 */
export function SubPageTabs({
  label,
  groups,
  counts,
}: {
  label: string
  groups: readonly SubPageGroup[]
  /** A number shown beside a tab, keyed by the tab's first page. */
  counts?: Readonly<Record<string, number>>
}) {
  const t = useT()
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")
  const activeIndex = activeGroupIndex(groups, current)
  const active = activeIndex >= 0 ? groups[activeIndex] : undefined

  return (
    <div className="mb-6 flex flex-col gap-3">
      <nav aria-label={label} className="scroll-strip -mx-1 gap-1.5 px-1 pb-1">
        {groups.map((group, i) => {
          const href = group.pages[0].href
          const lit = i === activeIndex
          const count = counts?.[href]
          return (
            <Link
              key={href}
              href={href}
              /*
               * A tab with a switch marks the group and the switch marks the
               * page, so one page is never announced as current twice.
               *
               * Shaped like the ledger's month chips (§8.4), but the current
               * tab is muted rather than filled: this is where you are, not a
               * filter you chose.
               */
              aria-current={
                lit ? (group.pages.length > 1 ? "true" : "page") : undefined
              }
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors",
                "focus-ring",
                lit
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t(group.label)}
              {count ? (
                <span className="tabular rounded-full bg-primary px-1.5 text-xs leading-5 font-medium text-primary-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {active && active.pages.length > 1 ? (
        <nav
          aria-label={t(active.label)}
          className="scroll-strip -mx-1 px-1 pb-1"
        >
          {/* `ToggleGroup`'s look (§11) on links, which keep their URL. */}
          <div className="flex w-fit">
            {active.pages.map((page, i) => {
              const on = page.href === current
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  aria-current={on ? "page" : undefined}
                  data-state={on ? "on" : "off"}
                  className={cn(
                    toggleVariants({ variant: "outline", size: "sm" }),
                    "focus-ring rounded-none",
                    i === 0 && "rounded-l-lg",
                    i > 0 && "border-l-0",
                    i === active.pages.length - 1 && "rounded-r-lg",
                    on ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t(page.label)}
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
