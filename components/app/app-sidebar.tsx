"use client"

import Link from "next/link"

import { AppNav } from "@/components/app/app-nav"
import { BrandMark } from "@/components/common/brand-mark"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useT } from "@/components/lang-provider"
import { LANDING } from "@/lib/site"

/**
 * Brand and navigation (§8.2). Everything here is a menu row, so collapsing to
 * icons loses nothing but the words: the file and the financial year live in
 * the top bar's `FileMenu`, which is one button wide at every width.
 */
export function AppSidebar() {
  const t = useT()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t("app.name")}
              className="gap-2.5"
              render={<Link href={LANDING} />}
            >
              {/* Collapsed, the button is 32px with no padding, so the mark
                  fills it and the text beside it is clipped away. */}
              <BrandMark />
              {/* `leading-tight`: two lines at the default leading are 36px
                  and the lg button's content box is only 32, so they would
                  bleed through its padding. */}
              <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate font-heading text-sm font-semibold">
                  {t("app.name")}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {t("app.tagline")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <AppNav />
      </SidebarContent>
    </Sidebar>
  )
}
