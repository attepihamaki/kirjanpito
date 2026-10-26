"use client"

import Link from "next/link"
import { CircleHelpIcon } from "lucide-react"

import { AppNav } from "@/components/app/app-nav"
import { FileBox } from "@/components/app/file-box"
import { BrandMark } from "@/components/common/brand-mark"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useT } from "@/components/lang-provider"
import { LANDING, LANDING_FAQ } from "@/lib/site"

/**
 * Brand, the financial year, the open file, and navigation (§8.2).
 * Collapsing to icons leaves a rail of 32 px icons with tooltips; `FileBox`
 * swaps itself for one so no action is lost.
 */
export function AppSidebar({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
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
        <FileBox onOpenFile={onOpenFile} onExport={onExport} />
        <AppNav />
        <SidebarHelp />
      </SidebarContent>
    </Sidebar>
  )
}

/**
 * Pinned to the bottom with `mt-auto`, the way FormBox's sidebar holds its
 * support links: a route back to the landing page's FAQ, and §1's disclaimer
 * where the figures are actually entered.
 *
 * The disclaimer is text, not a menu row, so the rail drops it and keeps the
 * link — the same rule `FileBox` follows when it collapses.
 */
function SidebarHelp() {
  const t = useT()

  return (
    <SidebarGroup className="mt-auto">
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={t("nav.help")}
            render={<Link href={LANDING_FAQ} />}
          >
            <CircleHelpIcon />
            <span>{t("nav.help")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <p className="px-2 pt-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        {t("landing.footer")}
      </p>
    </SidebarGroup>
  )
}
