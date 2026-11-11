"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  FileTextIcon,
  ReceiptTextIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  SettingsIcon,
  WalletIcon,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useT } from "@/components/lang-provider"
import { useBillsDue } from "@/hooks/use-bills-due"
import { useShownFeatures } from "@/hooks/use-shown-features"
import { LEDGER_ROUTES } from "@/lib/site"
import {
  NAV_SECTIONS,
  sectionOf,
  shownPages,
  type NavSectionId,
} from "@/lib/ui/sub-pages"
import { useBookStore } from "@/stores/book-store"

const ICONS: Record<
  NavSectionId,
  React.ComponentType<{ className?: string }>
> = {
  overview: LayoutDashboardIcon,
  ledger: BookOpenIcon,
  sales: ReceiptTextIcon,
  purchases: WalletIcon,
  vat: CalculatorIcon,
  statement: FileTextIcon,
  summary: BarChart3Icon,
  calendar: CalendarDaysIcon,
  settings: SettingsIcon,
}

/**
 * The sidebar's navigation (§8.2), and the only nav in the app: one level of
 * sections, and under the section that is open a flat list of its pages.
 * Below 900 px the sidebar becomes a sheet rather than a row of tabs, so one
 * list of links serves every width.
 */
export function AppNav() {
  const t = useT()
  const { isMobile, setOpenMobile } = useSidebar()
  // trailingSlash is on, so compare without it.
  const current = usePathname().replace(/\/$/, "")
  const features = useShownFeatures()
  const open = sectionOf(current)
  const waiting = useBookStore((s) => s.inbox.length)
  const { overdue } = useBillsDue()
  const close = () => isMobile && setOpenMobile(false)

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {NAV_SECTIONS.map((section) => {
            const Icon = ICONS[section.id]
            const active = open?.id === section.id
            const label = t(section.label)
            const pages = shownPages(section, features, current)
            /*
             * A section whose list is showing marks the page there, so one
             * page is never announced as current twice.
             */
            const listed = active && pages.length > 1
            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton
                  size="md"
                  isActive={active}
                  tooltip={label}
                  render={
                    <Link
                      href={section.href}
                      aria-current={
                        active ? (listed ? "true" : "page") : undefined
                      }
                      onClick={close}
                    />
                  }
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
                {/* The bills past their due date, on the row that leads to them (§8.30). */}
                {section.id === "purchases" && overdue.count ? (
                  <SidebarMenuBadge
                    className="top-1.5 rounded-full bg-expense-subtle text-expense peer-hover/menu-button:text-expense peer-data-active/menu-button:text-expense"
                    aria-label={t("nav.overdueBills", { n: overdue.count })}
                  >
                    {overdue.count}
                  </SidebarMenuBadge>
                ) : null}
                {listed ? (
                  <SidebarMenuSub className="mt-0.5 gap-0.5">
                    {pages.map((page) => {
                      const on = page.href === current
                      const count =
                        page.href === LEDGER_ROUTES.inbox ? waiting : 0
                      return (
                        <SidebarMenuSubItem key={page.href}>
                          <SidebarMenuSubButton
                            isActive={on}
                            render={
                              <Link
                                href={page.href}
                                aria-current={on ? "page" : undefined}
                                onClick={close}
                              />
                            }
                          >
                            <span>{t(page.label)}</span>
                            {count ? (
                              <span className="tabular ml-auto text-xs text-muted-foreground">
                                {count}
                              </span>
                            ) : null}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
