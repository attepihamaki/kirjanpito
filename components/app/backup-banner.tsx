"use client"

import { HardDriveDownloadIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useCanSaveToFile, useSaveBook } from "@/hooks/use-save-book"
import { useToday } from "@/hooks/use-today"
import { backupReminder } from "@/lib/domain/backup-reminder"
import { addDays } from "@/lib/domain/dates"
import { useBookStore } from "@/stores/book-store"

/**
 * Shown on every page of the app when work has gone unsaved for days (§8.33):
 * a week with a file on disk, two days without one. "Tallenna" saves the way
 * the file menu does; "Muistuta huomenna" hides it until tomorrow.
 */
export function BackupBanner() {
  const f = useFormatters()
  const today = useToday()
  const save = useSaveBook()
  const canSave = useCanSaveToFile()
  const open = useBookStore((s) => s.open)
  const demo = useBookStore((s) => s.demo)
  const archived = useBookStore((s) => s.archiveYear !== null)
  const dirty = useBookStore((s) => s.dirty)
  const dirtySince = useBookStore((s) => s.dirtySince)
  const hasFile = useBookStore((s) => s.fileName !== null)
  const snoozed = useBookStore((s) => s.backupSnoozed)
  const reminder = backupReminder(
    { open, demo, archived, dirty, dirtySince, hasFile, snoozed },
    today
  )
  if (!reminder) return null

  const keep = () => {
    const s = useBookStore.getState()
    if (canSave) save()
    else s.openDialog({ kind: "export" })
  }

  return (
    <div
      role="status"
      className="print-hidden flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted px-4 py-2 text-sm lg:px-6"
    >
      <HardDriveDownloadIcon className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">
        {f.t(reminder.hasFile ? "file.backupDays" : "file.backupNoFile", {
          n: reminder.days,
        })}
      </span>
      <span className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={keep}>
          {f.t(canSave ? "file.backupSave" : "file.backupDownload")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            useBookStore.getState().snoozeBackup(addDays(today, 1))
          }
        >
          {f.t("file.backupLater")}
        </Button>
      </span>
    </div>
  )
}
