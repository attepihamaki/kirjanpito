"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useT } from "@/components/lang-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { useShownFeatures } from "@/hooks/use-shown-features"
import {
  navSection,
  pageOf,
  shownPages,
  type NavSectionId,
} from "@/lib/ui/sub-pages"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The pages of a section as one row of links at the top of the view (§8.2).
 * The sidebar lists the same pages under the section's row, so this row is
 * drawn only while the sidebar is collapsed to its icon rail, where that list
 * is hidden. Below 900 px the sidebar is a sheet that shows the list, so the
 * row is left out there too. Every page keeps its own URL; the row is links,
 * not state.
 */
export function SectionTabs({
  section: id,
  counts,
}: {
  section: NavSectionId
  /** A number shown beside a page's link, keyed by its href. */
  counts?: Readonly<Record<string, number>>
}) {
  const t = useT()
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")
  const railed = !useBookStore((s) => s.sidebarOpen)
  const sheet = useIsMobile()
  const features = useShownFeatures()
  const section = navSection(id)
  const pages = shownPages(section, features, current)

  if (!railed || sheet || pages.length < 2) return null

  return (
    <nav
      aria-label={t(section.label)}
      className="scroll-strip print-hidden -mx-1 mb-6 gap-1.5 px-1 pb-1"
    >
      {pages.map((page) => {
        const on = page.href === current
        const count = counts?.[page.href]
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={on ? "page" : undefined}
            /*
             * Shaped like the ledger's month chips (§8.4), but the current
             * page is muted rather than filled: this is where you are, not a
             * filter you chose.
             */
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors",
              "focus-ring",
              on
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t(page.label)}
            {count ? (
              <span className="tabular rounded-full bg-primary px-1.5 text-xs leading-5 font-medium text-primary-foreground">
                {count}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * What a view's header says (§8.2): the section's name on its first page,
 * and on any other page that page's name under the section's as an eyebrow.
 */
export function useSectionHeading(id: NavSectionId): {
  eyebrow?: string
  title: string
} {
  const t = useT()
  const path = usePathname()
  const section = navSection(id)
  const page = pageOf(section, path)
  return page && page !== section.pages[0]
    ? { eyebrow: t(section.label), title: t(page.label) }
    : { title: t(section.label) }
}
