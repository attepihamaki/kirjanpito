"use client"

import { DownloadIcon, UploadIcon, XIcon } from "lucide-react"

import { FileStatus } from "@/components/app/file-status"
import { YearSelect } from "@/components/app/year-select"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useT } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"
import { closeBook } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * The financial year and the open file, at the top of the sidebar above the
 * navigation (§8.2). The two belong together: the year scopes every view, and
 * the file is what the year is read out of.
 *
 * Rendered twice, because the sidebar collapses to a 3 rem rail where neither
 * a select nor a bordered panel fits: the box below, and a plain icon menu in
 * its place. Both offer the same three actions, so collapsing loses only the
 * file's name, its status line and the year.
 */
export function FileBox({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
  const t = useT()
  const ctx = useCommandCtx()
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)
  const importing = useBookStore((s) => s.importing)
  const busy = useDelayedFlag(importing)

  const close = () => void closeBook(ctx)

  return (
    <SidebarGroup className="gap-3">
      <div className="flex flex-col gap-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {t("app.fiscalYear")}
          </span>
          <YearSelect className="ml-auto w-28" />
        </div>

        {/* Recessed, not raised: the sidebar is already a --card surface, so
            the box reads as a panel set into it by taking the page
            --background, the way the prototype's `.filebox` does. */}
        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-1">
            <span className="min-w-0 truncate text-sm font-medium">
              {fileName ?? t("file.untitled")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-1.5 shrink-0"
              title={t("file.close")}
              onClick={close}
            >
              <XIcon data-icon="inline-start" />
              {t("file.closeBtn")}
            </Button>
          </div>

          <FileStatus />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              title={busy ? t("io.opening") : t("file.open")}
              disabled={busy}
              onClick={onOpenFile}
            >
              {busy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              {t("file.importBtn")}
            </Button>
            <Button
              // §8.2: export is highlighted while changes are unexported.
              variant={dirty ? "default" : "outline"}
              size="sm"
              className="flex-1"
              title={t("file.export")}
              disabled={busy}
              onClick={onExport}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("file.exportBtn")}
            </Button>
          </div>
        </div>
      </div>

      <SidebarMenu className="hidden gap-0.5 group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={busy ? t("io.opening") : t("file.open")}
            disabled={busy}
            onClick={onOpenFile}
          >
            {busy ? <Spinner /> : <UploadIcon />}
            <span>{t("file.open")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={t("file.export")}
            disabled={busy}
            onClick={onExport}
          >
            <DownloadIcon />
            <span>{t("file.export")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip={t("file.close")} onClick={close}>
            <XIcon />
            <span>{t("file.close")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
