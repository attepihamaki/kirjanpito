"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app/app-sidebar"
import { AppSkeleton } from "@/components/app/app-skeleton"
import { AppTopbar } from "@/components/app/app-topbar"
import { ImportOverlay } from "@/components/app/import-overlay"
import { ExportDialog } from "@/components/export/export-dialog"
import { EntryDialog } from "@/components/entry/entry-dialog"
import { Overlay } from "@/components/common/overlay"
import { ReceiptViewer } from "@/components/receipt/receipt-viewer"
import { LangRoot, useT } from "@/components/lang-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/toast"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { useCommandCtx } from "@/hooks/use-commands"
import { useFileDrop, isBookFile, isMediaFile } from "@/hooks/use-file-drop"
import { useReceiptGc } from "@/hooks/use-receipt-gc"
import { useAppShortcuts } from "@/hooks/use-app-shortcuts"
import {
  openFile,
  pickAndOpenFile,
  restoreFileHandle,
} from "@/lib/commands/io-commands"
import { LANDING } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LangRoot>
      <AppShellInner>{children}</AppShellInner>
    </LangRoot>
  )
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const router = useRouter()

  useReceiptGc()
  useBeforeUnload()

  /*
   * §7.5: the link to the opened file lives in IndexedDB, not in the store's
   * localStorage blob, so it is put back by hand once the book has rehydrated.
   * Keyed on `hydrated` alone — a bookkeeping opened later in this session
   * carries its own handle, and re-running here would hand it the last one.
   */
  React.useEffect(() => {
    if (hydrated) void restoreFileHandle()
  }, [hydrated])

  /*
   * §8.1: with no bookkeeping open, every app route sends the user to the
   * landing page. Done after rehydration, since the prerendered default is
   * "closed" and would otherwise bounce everyone.
   */
  React.useEffect(() => {
    if (hydrated && !open) router.replace(LANDING)
  }, [hydrated, open, router])

  if (!hydrated || !open) return <AppSkeleton />
  return <HydratedShell>{children}</HydratedShell>
}

function HydratedShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const ctx = useCommandCtx()
  const dialog = useBookStore((s) => s.dialog)
  const openDialog = useBookStore((s) => s.openDialog)
  /*
   * The sidebar's expanded/collapsed state is ours, not a cookie: nothing
   * here is server-rendered, so shadcn's cookie could never be read back.
   */
  const sidebarOpen = useBookStore((s) => s.sidebarOpen)
  const setSidebarOpen = useBookStore((s) => s.setSidebarOpen)
  const pushDropped = React.useRef<((files: File[]) => void) | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)
  /*
   * The picker is tried first because it hands back a handle the bookkeeping
   * can be saved to (§7.5); the hidden input is the fallback where there is
   * no picker, and gives a file that can only ever be read.
   */
  const pickFile = React.useCallback(() => {
    void (async () => {
      if (!(await pickAndOpenFile(ctx))) inputRef.current?.click()
    })()
  }, [ctx])

  const openExportDialog = React.useCallback(
    () => openDialog({ kind: "export" }),
    [openDialog]
  )

  // Stable callbacks: the shortcut listener is rebound whenever they change.
  useAppShortcuts({ onOpenFile: pickFile, onExport: openExportDialog })

  const handleDrop = React.useCallback(
    (files: File[]) => {
      const state = useBookStore.getState()
      // §8.2: while the entry dialog is open, dropped media attaches to it.
      if (state.dialog.kind === "entry") {
        const media = files.filter(isMediaFile)
        if (media.length) pushDropped.current?.(media)
        else toast.add({ title: t("receipt.badType") })
        return
      }
      if (state.dialog.kind === "viewer") return

      const book = files.find(isBookFile)
      if (book) {
        void openFile(ctx, book)
        return
      }
      // Receipts dropped on their own start a new entry around them.
      const media = files.filter(isMediaFile)
      if (media.length) {
        openDialog({ kind: "entry", mode: "new", files: media })
      }
    },
    [ctx, openDialog, t]
  )

  const dragging = useFileDrop({ onDropFiles: handleDrop })
  const draggingMedia = dragging && dialog.kind === "entry"

  return (
    <TooltipProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.zip,text/csv,application/zip"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) void openFile(ctx, file)
          }}
        />

        <AppSidebar />

        <SidebarInset className="min-w-0">
          <AppTopbar onOpenFile={pickFile} onExport={openExportDialog} />
          <div className="min-w-0 flex-1 px-4 py-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </SidebarInset>

        {dragging ? (
          // Not blocking: a blocking scrim would swallow the drop itself.
          <Overlay
            blocking={false}
            className={cn(draggingMedia && "bg-background/60")}
          >
            <div className="rounded-xl border-2 border-dashed border-primary px-8 py-6 text-center">
              <p className="font-heading text-lg font-medium">
                {draggingMedia ? t("receipt.drop") : t("io.dropHere")}
              </p>
            </div>
          </Overlay>
        ) : null}

        <ImportOverlay />

        <EntryDialog
          registerDropTarget={(fn) => {
            pushDropped.current = fn
          }}
        />
        <ReceiptViewer />
        <ExportDialog />
      </SidebarProvider>
    </TooltipProvider>
  )
}
