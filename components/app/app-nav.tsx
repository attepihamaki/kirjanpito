"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  CalculatorIcon,
  FileTextIcon,
  BarChart3Icon,
  SettingsIcon,
} from "lucide-react"

import { useT } from "@/components/lang-provider"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import type { MessageKey } from "@/lib/i18n/messages"

export const NAV_ITEMS = [
  { href: APP_ROUTES.ledger, key: "v_ledger", icon: BookOpenIcon },
  { href: APP_ROUTES.vat, key: "v_vat", icon: CalculatorIcon },
  { href: APP_ROUTES.statement, key: "v_statement", icon: FileTextIcon },
  { href: APP_ROUTES.summary, key: "v_summary", icon: BarChart3Icon },
  { href: APP_ROUTES.settings, key: "v_settings", icon: SettingsIcon },
] as const satisfies ReadonlyArray<{
  href: string
  key: MessageKey
  icon: React.ComponentType<{ className?: string }>
}>

function useIsActive() {
  const pathname = usePathname()
  // trailingSlash is on, so compare without it.
  const current = pathname.replace(/\/$/, "")
  return (href: string) => current === href.replace(/\/$/, "")
}

/** Vertical nav for the desktop sidebar (§8.2). */
export function AppNav() {
  const t = useT()
  const isActive = useIsActive()

  return (
    <nav className="flex flex-col gap-0.5" aria-label={t("appName")}>
      {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}

/** Horizontally scrollable tabs for the mobile top bar (§8.2). */
export function AppNavTabs() {
  const t = useT()
  const isActive = useIsActive()

  return (
    <nav
      aria-label={t("appName")}
      className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden"
    >
      {NAV_ITEMS.map(({ href, key }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
