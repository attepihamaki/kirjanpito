"use client"

import { PanelLeftIcon, SearchIcon } from "lucide-react"

import { FileMenu } from "@/components/app/file-menu"
import { SavedClock } from "@/components/app/file-status"
import { LangToggle } from "@/components/app/lang-toggle"
import { MessagesButton } from "@/components/app/messages-button"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Keys } from "@/components/common/keys"
import { useT } from "@/components/lang-provider"
import { useShortcut } from "@/hooks/use-save-book"
import { usePaletteStore } from "@/stores/palette-store"

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
  const setLayer = usePaletteStore((s) => s.setLayer)
  const palette = useShortcut()("K")

  return (
    <header className="print-hidden sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 bg-background/95 backdrop-blur">
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

        <Button
          variant="outline"
          className="w-9 justify-start gap-2 px-0 text-muted-foreground sm:w-56 sm:px-3"
          aria-label={t("palette.open")}
          aria-keyshortcuts={palette.aria || undefined}
          onClick={() => setLayer("commands")}
        >
          <SearchIcon className="mx-auto sm:mx-0" />
          <span className="hidden flex-1 text-left font-normal sm:inline">
            {t("palette.placeholderShort")}
          </span>
          {palette.label ? (
            <Keys className="hidden sm:inline">{palette.label}</Keys>
          ) : null}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <SavedClock />
          <ThemeToggle />
          <LangToggle />
          <MessagesButton />
          <FileMenu onOpenFile={onOpenFile} onExport={onExport} />
        </div>
      </div>
    </header>
  )
}
