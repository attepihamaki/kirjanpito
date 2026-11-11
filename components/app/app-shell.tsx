"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app/app-sidebar"
import { AppSkeleton } from "@/components/app/app-skeleton"
import { AppTopbar } from "@/components/app/app-topbar"
import { ArchiveBanner } from "@/components/app/archive-banner"
import { BackupBanner } from "@/components/app/backup-banner"
import { DemoBanner } from "@/components/app/demo-banner"
import { VatReminderBanner } from "@/components/app/vat-reminder-banner"
import { ImportOverlay } from "@/components/app/import-overlay"
import { ScrollMemory } from "@/components/app/scroll-memory"
import { ExportDialog } from "@/components/export/export-dialog"
import { BankImportDialog } from "@/components/bank/bank-import-dialog"
import { CustomerDialog } from "@/components/invoices/customer-dialog"
import { PartyViewDialog } from "@/components/invoices/party-view-dialog"
import { InvoiceDialog } from "@/components/invoices/invoice-dialog"
import { RecurringDialog } from "@/components/ledger/recurring-dialog"
import { CategoryDialogs } from "@/components/settings/category-dialogs"
import { SetupDialog } from "@/components/settings/setup-dialog"
import { DeductionDialog } from "@/components/statement/deduction-dialog"
import { SplitDialog } from "@/components/entry/split-dialog"
import { Form5DetailsDialog } from "@/components/statement/form5-details-dialog"
import { YearEndFiguresDialog } from "@/components/statement/year-end-figures-dialog"
import { NewYearDialog } from "@/components/new-year/new-year-dialog"
import { YearEndDialog } from "@/components/statement/year-end-dialog"
import { BookCheckDialog } from "@/components/check/book-check-dialog"
import { SavesDialog } from "@/components/app/saves-dialog"
import { AuditDialog } from "@/components/export/audit-dialog"
import { VatReturnDialog } from "@/components/vat/vat-return-dialog"
import { EntryDialog } from "@/components/entry/entry-dialog"
import { FigureDialog } from "@/components/common/figure-dialog"
import { Overlay } from "@/components/common/overlay"
import { ReceiptViewer } from "@/components/receipt/receipt-viewer"
import { LangRoot, useT } from "@/components/lang-provider"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/toast"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { useCommandCtx } from "@/hooks/use-commands"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"
import { useDirtySince } from "@/hooks/use-dirty-since"
import { useFileDrop, isBookFile, isMediaFile } from "@/hooks/use-file-drop"
import { useReceiptGc } from "@/hooks/use-receipt-gc"
import { useRecurringInvoices } from "@/hooks/use-recurring-invoices"
import { LiveAnnouncer } from "@/components/app/live-announcer"
import { useReceiptHashes } from "@/hooks/use-receipt-hashes"
import { useReceiptText } from "@/hooks/use-receipt-text"
import { useAppShortcuts } from "@/hooks/use-app-shortcuts"
import { CommandPalette, ShortcutSheet } from "@/components/app/command-palette"
import { useAutosave } from "@/hooks/use-autosave"
import { startRecordingHistory } from "@/stores/history-store"
import { usePersistentStorage } from "@/hooks/use-persistent-storage"
import { useServiceWorker } from "@/hooks/use-service-worker"
import { useStorageWarning } from "@/hooks/use-storage-warning"
import {
  openFile,
  pickAndOpenFile,
  restoreFileHandle,
} from "@/lib/commands/io-commands"
import { claimTab } from "@/lib/browser/tab-lock"
import { addToInbox } from "@/lib/commands/inbox-commands"
import { LANDING } from "@/lib/site"
import { syncBookFromStorage, useBookStore } from "@/stores/book-store"

export function AppShell({ children }: { children: React.ReactNode }) {
  const showAccounts = useBookStore((s) => s.showAccounts)
  return (
    <LangRoot showAccounts={showAccounts}>
      <AppShellInner>{children}</AppShellInner>
    </LangRoot>
  )
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const router = useRouter()
  /*
   * §12: one tab at a time holds the bookkeeping. A tab that has to wait takes
   * over by itself when the other one closes, with what that tab last stored.
   */
  const [claimed, setClaimed] = React.useState(false)
  const waiting = useDelayedFlag(hydrated && !claimed)

  React.useEffect(() => {
    if (!hydrated) return
    return claimTab(() => {
      syncBookFromStorage()
      setClaimed(true)
    })
  }, [hydrated])

  useReceiptGc(claimed)
  useReceiptText(claimed)
  useReceiptHashes(claimed)

  // §8.20: the undo stack only follows the tab that holds the bookkeeping.
  React.useEffect(
    () => (claimed ? startRecordingHistory() : undefined),
    [claimed]
  )

  /*
   * §7.5: the link to the opened file lives in IndexedDB, not in the store's
   * localStorage blob, so it is put back by hand once the book has rehydrated.
   * Keyed on the claim alone — a bookkeeping opened later in this session
   * carries its own handle, and re-running here would hand it the last one.
   */
  React.useEffect(() => {
    if (claimed) void restoreFileHandle()
  }, [claimed])

  /*
   * §8.1: with no bookkeeping open, every app route sends the user to the
   * landing page. Done after rehydration, since the prerendered default is
   * "closed" and would otherwise bounce everyone.
   */
  React.useEffect(() => {
    if (claimed && !open) router.replace(LANDING)
  }, [claimed, open, router])

  // Only once it has really had to wait: the claim is normally over at once.
  if (waiting) return <OpenInAnotherTab />
  if (!claimed || !open) return <AppSkeleton />
  return <HydratedShell>{children}</HydratedShell>
}

function OpenInAnotherTab() {
  const t = useT()
  return (
    <div className="grid min-h-svh place-items-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("file.openElsewhere")}</EmptyTitle>
          <EmptyDescription>{t("app.waitingForTab")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

/**
 * The drag-and-drop hint (§8.2). Not blocking: a blocking scrim would swallow
 * the drop itself. Outside the entry dialog it says the receipts go to the
 * inbox (§8.31).
 */
function DropHint({ media }: { media: boolean }) {
  const t = useT()
  return (
    <Overlay blocking={false} className="bg-background/60">
      <div className="rounded-xl border-2 border-dashed border-primary px-8 py-6 text-center">
        <p className="font-heading text-lg font-medium">
          {media ? t("receipt.drop") : t("inbox.dropAnywhereTitle")}
        </p>
        {media ? null : (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("io.dropHere")}
          </p>
        )}
      </div>
    </Overlay>
  )
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

  useBeforeUnload()

  // Stable callbacks: the shortcut listener is rebound whenever they change.
  useAppShortcuts({ onOpenFile: pickFile, onExport: openExportDialog })
  useAutosave()
  useStorageWarning()
  usePersistentStorage()
  useServiceWorker()
  useRecurringInvoices()
  useDirtySince()

  const handleDrop = React.useCallback(
    (
      files: File[],
      handleFor: (file: File) => Promise<FileSystemFileHandle | null>
    ) => {
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
        void handleFor(book).then((handle) => openFile(ctx, book, handle))
        return
      }
      /*
       * Receipts dropped anywhere else wait in the inbox to be booked
       * (§8.31). An archive's inbox is read-only.
       */
      const media = files.filter(isMediaFile)
      if (!media.length) return
      if (state.archiveYear !== null) {
        toast.add({ title: t("io.archiveReadOnly") })
        return
      }
      void addToInbox(ctx, media)
    },
    [ctx, t]
  )

  const dragging = useFileDrop({ onDropFiles: handleDrop })
  const draggingMedia = dragging && dialog.kind === "entry"

  return (
    <TooltipProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.zip,.xml,text/csv,application/zip,application/xml,text/xml"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) void openFile(ctx, file)
          }}
        />

        <ScrollMemory />
        <CommandPalette onOpenFile={pickFile} onExport={openExportDialog} />
        <ShortcutSheet />
        <LiveAnnouncer />
        <AppSidebar />

        <SidebarInset className="min-w-0">
          <AppTopbar onOpenFile={pickFile} onExport={openExportDialog} />
          <ArchiveBanner />
          <DemoBanner />
          <BackupBanner />
          <VatReminderBanner />
          <div className="min-w-0 flex-1 px-4 py-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </SidebarInset>

        {dragging ? <DropHint media={draggingMedia} /> : null}

        <ImportOverlay />

        <EntryDialog
          registerDropTarget={(fn) => {
            pushDropped.current = fn
          }}
        />
        <ReceiptViewer />
        <ExportDialog />
        <RecurringDialog />
        <BankImportDialog />
        <SetupDialog />
        <YearEndDialog />
        <BookCheckDialog />
        <SavesDialog />
        <AuditDialog />
        <YearEndFiguresDialog />
        <Form5DetailsDialog />
        <SplitDialog />
        <DeductionDialog />
        <NewYearDialog />
        <VatReturnDialog />
        <CategoryDialogs />
        <InvoiceDialog />
        <CustomerDialog />
        <PartyViewDialog />
        <FigureDialog />
      </SidebarProvider>
    </TooltipProvider>
  )
}
