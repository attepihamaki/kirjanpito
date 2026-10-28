"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { useT } from "@/components/lang-provider"
import type { MessageKey } from "@/lib/i18n/messages"
import { SETTINGS_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"

const TABS = [
  { href: SETTINGS_ROUTES.general, key: "settings.general" },
  { href: SETTINGS_ROUTES.categories, key: "settings.categories" },
] as const satisfies ReadonlyArray<{ href: string; key: MessageKey }>

/**
 * The title and sub-page tabs shared by every settings page (§8.10). It is
 * the settings layout, so switching tabs keeps the header in place and only
 * the panels below it change.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")

  return (
    <>
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <nav
        aria-label={t("settings.sections")}
        className="scroll-strip -mx-1 mb-6 gap-1.5 px-1 pb-1"
      >
        {TABS.map(({ href, key }) => {
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
              {t(key)}
            </Link>
          )
        })}
      </nav>
      {children}
    </>
  )
}
