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

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useT } from "@/components/lang-provider"
import { APP_ROUTES } from "@/lib/site"
import type { MessageKey } from "@/lib/i18n/messages"

export const NAV_ITEMS = [
  { href: APP_ROUTES.ledger, key: "nav.ledger", icon: BookOpenIcon },
  { href: APP_ROUTES.vat, key: "nav.vat", icon: CalculatorIcon },
  { href: APP_ROUTES.statement, key: "nav.statement", icon: FileTextIcon },
  { href: APP_ROUTES.summary, key: "nav.summary", icon: BarChart3Icon },
  { href: APP_ROUTES.settings, key: "nav.settings", icon: SettingsIcon },
] as const satisfies ReadonlyArray<{
  href: string
  key: MessageKey
  icon: React.ComponentType<{ className?: string }>
}>

/**
 * The sidebar's navigation (§8.2), and the only nav in the app: below 900 px
 * the sidebar becomes a sheet rather than a row of tabs, so one list of links
 * serves every width.
 */
export function AppNav() {
  const t = useT()
  const { isMobile, setOpenMobile } = useSidebar()
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const active = current === href.replace(/\/$/, "")
            const label = t(key)
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  size="md"
                  isActive={active}
                  tooltip={label}
                  render={
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => isMobile && setOpenMobile(false)}
                    />
                  }
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
