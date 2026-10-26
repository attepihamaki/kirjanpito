"use client"

import { PanelLeftIcon } from "lucide-react"

import { FileMenu } from "@/components/app/file-menu"
import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useT } from "@/components/lang-provider"

/**
 * The bar across the top of every app view (§8.2), laid out like FormBox's
 * `AppHeader`: `h-14`, the sidebar toggle on the left, the file and the
 * preferences pushed right, every control 36 px tall. No rule below it — the
 * sidebar's own border already separates the chrome from the page.
 *
 * Only what is the same on every view lives here. The file qualifies: it is
 * what every view is a reading of, and it stays one button wide by keeping its
 * controls in a popover.
 *
 * One bar serves every width; below 900 px the sidebar becomes a sheet rather
 * than the app growing a second header.
 */
export function AppTopbar({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
  const t = useT()
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 bg-background/95 backdrop-blur">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        {/* Not shadcn's SidebarTrigger: that one hard-codes an English
            screen-reader label. */}
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1"
          aria-label={t("app.toggleNav")}
          title={t("app.toggleNav")}
          onClick={toggleSidebar}
        >
          <PanelLeftIcon />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
          <FileMenu onOpenFile={onOpenFile} onExport={onExport} />
        </div>
      </div>
    </header>
  )
}
