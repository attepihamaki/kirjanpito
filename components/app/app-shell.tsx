"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DownloadIcon, UploadIcon } from "lucide-react"

import { AppNav, AppNavTabs } from "@/components/app/app-nav"
import { AppSkeleton } from "@/components/app/app-skeleton"
import { FileBox, FileStatus } from "@/components/app/file-box"
import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { YearSelect } from "@/components/app/year-select"
import { BrandMark } from "@/components/common/brand-mark"
import { ExportDialog } from "@/components/export/export-dialog"
import { EntryDialog } from "@/components/entry/entry-dialog"
import { ReceiptViewer } from "@/components/receipt/receipt-viewer"
import { AppLangProvider, LangHtmlAttr, useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { useCommandCtx } from "@/hooks/use-commands"
import { useFileDrop, isBookFile, isMediaFile } from "@/hooks/use-file-drop"
import { useReceiptGc } from "@/hooks/use-receipt-gc"
import { openFile } from "@/lib/commands/io-commands"
import { landingFor } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLangProvider>
      <LangHtmlAttr />
      <AppShellInner>{children}</AppShellInner>
    </AppLangProvider>
  )
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const lang = useBookStore((s) => s.lang)
  const router = useRouter()

  useReceiptGc()
  useBeforeUnload()

  // §8.1: with no bookkeeping open, every app route sends the user to the
  // landing page. Done after rehydration, since the prerendered default is
  // "closed" and would otherwise bounce everyone.
  React.useEffect(() => {
    if (hydrated && !open) router.replace(landingFor(lang))
  }, [hydrated, open, lang, router])

  if (!hydrated || !open) return <AppSkeleton />
  return <HydratedShell>{children}</HydratedShell>
}

function HydratedShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const ctx = useCommandCtx()
  const lang = useBookStore((s) => s.lang)
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)
  const dialog = useBookStore((s) => s.dialog)
  const openDialog = useBookStore((s) => s.openDialog)
  const pushDropped = React.useRef<((files: File[]) => void) | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const pickFile = () => inputRef.current?.click()

  const handleDrop = React.useCallback(
    (files: File[]) => {
      const state = useBookStore.getState()
      // §8.2: while the entry dialog is open, dropped media attaches to it.
      if (state.dialog.kind === "entry") {
        const media = files.filter(isMediaFile)
        if (media.length) pushDropped.current?.(media)
        else toast.add({ title: t("att_bad") })
        return
      }
      if (state.dialog.kind === "viewer") return

      const book = files.find(isBookFile)
      if (book) {
        void openFile(ctx, book)
        return
      }
      if (files.some(isMediaFile)) toast.add({ title: t("att_dropHint") })
    },
    [ctx, t]
  )

  const dragging = useFileDrop({ onDropFiles: handleDrop })
  const draggingMedia = dragging && dialog.kind === "entry"

  return (
    <div className="flex min-h-svh flex-col min-[900px]:flex-row">
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

      {/* Desktop sidebar (>= 900px) */}
      <aside className="hidden w-64 shrink-0 flex-col gap-5 self-start border-r bg-sidebar p-4 min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-svh min-[900px]:overflow-y-auto">
        <Link
          href={landingFor(lang)}
          className="flex items-center gap-2.5 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <BrandMark />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-sm font-semibold">
              {t("appName")}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t("appSub")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("fiscal")}</span>
          <YearSelect className="ml-auto w-28" />
        </div>
        <AppNav />

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
          <FileBox
            onOpenFile={pickFile}
            onExport={() => openDialog({ kind: "export" })}
          />
        </div>
      </aside>

      {/* Mobile top bar (< 900px) */}
      <div className="sticky top-0 z-30 flex flex-col gap-2 border-b bg-background/95 px-4 pt-3 backdrop-blur min-[900px]:hidden">
        <div className="flex items-center gap-2">
          <Link href={landingFor(lang)} aria-label={t("home")}>
            <BrandMark />
          </Link>
          <span className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">
            {fileName ? `${fileName}.csv` : t("newBook")}
          </span>
          <span className="flex-1 sm:hidden" />
          <YearSelect className="w-24" />
          <LangToggle compact />
          <ThemeToggle compact />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("importCsv")}
            onClick={pickFile}
          >
            <UploadIcon />
          </Button>
          <Button
            variant={dirty ? "default" : "ghost"}
            size="icon"
            aria-label={t("exportCsv")}
            onClick={() => openDialog({ kind: "export" })}
          >
            <DownloadIcon />
          </Button>
        </div>
        <FileStatus className="px-0.5" />
        <AppNavTabs />
      </div>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
        {children}
      </main>

      {dragging ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
            draggingMedia && "bg-background/60"
          )}
        >
          <div className="rounded-xl border-2 border-dashed border-primary px-8 py-6 text-center">
            <p className="font-heading text-lg font-medium">
              {draggingMedia ? t("att_drop") : t("dropHere")}
            </p>
          </div>
        </div>
      ) : null}

      <EntryDialog
        registerDropTarget={(fn) => {
          pushDropped.current = fn
        }}
      />
      <ReceiptViewer />
      <ExportDialog />
    </div>
  )
}
