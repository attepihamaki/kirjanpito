"use client"

import { useFormatters, useT } from "@/components/lang-provider"
import { useCanSaveToFile } from "@/hooks/use-save-book"
import { useStorageBehind } from "@/hooks/use-storage-warning"
import { useToday } from "@/hooks/use-today"
import { todayIso } from "@/lib/domain/dates"
import { clock } from "@/lib/i18n/clock"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/**
 * The one wording of the save status (§8.2), so the dot's label and the file
 * menu's accessible name can never drift apart.
 *
 * It says "saved", not "exported", because both ways of keeping the work end
 * in a file. Which file is what `dirty` encodes: a download clears it only
 * when there is no linked file left to go stale (§7.5).
 */
export function useFileStatusText() {
  const t = useT()
  const dirty = useBookStore((s) => s.dirty)
  return dirty ? t("file.dirty") : t("file.clean")
}

/**
 * The amber / green dot alone. The menu trigger shows it only while the book is
 * dirty, has no room for the label and carries the wording in its accessible
 * name instead.
 */
export function StatusDot({ className }: { className?: string }) {
  const dirty = useBookStore((s) => s.dirty)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        dirty ? "bg-warning" : "bg-income",
        className
      )}
    />
  )
}

/**
 * Whether autosave is on and running, on and paused, or off (§7.5). Off is
 * also what a browser that cannot write to a file always reports.
 */
function useAutosaveState(): "off" | "on" | "retrying" | "paused" {
  const autosave = useBookStore((s) => s.autosave)
  const paused = useBookStore((s) => s.autosavePaused)
  const failures = useBookStore((s) => s.autosaveFailures)
  const linked = useBookStore((s) => s.fileHandle !== null)
  const canSave = useCanSaveToFile()
  if (!autosave || !canSave) return "off"
  if (paused || !linked) return "paused"
  return failures > 0 ? "retrying" : "on"
}

const AUTOSAVE_TEXT = {
  on: "file.autosaveOn",
  retrying: "file.autosaveRetrying",
  paused: "file.autosavePaused",
} as const

/** One line under the save status in the file menu, when autosave is on. */
export function AutosaveNote() {
  const t = useT()
  const state = useAutosaveState()
  if (state === "off") return null
  return (
    <p className="text-xs text-muted-foreground">{t(AUTOSAVE_TEXT[state])}</p>
  )
}

/**
 * When the linked file was last written (§7.5): its own modification time,
 * kept in `savedAt`, so it is also what the file said when it was opened. It
 * answers whether the file on disk is current, which the dot alone cannot say
 * once a save has failed or been skipped. A downloaded copy has no linked file
 * to date, so the line is absent.
 */
export function SavedAtNote() {
  const f = useFormatters()
  const savedAt = useBookStore((s) => s.savedAt)
  const linked = useBookStore((s) => s.fileHandle !== null)
  const today = useToday()
  if (savedAt === null || !linked) return null
  const at = new Date(savedAt)
  const day = todayIso(at)
  const t = clock(f, at)
  return (
    <p className="text-xs text-muted-foreground">
      {day === today
        ? f.t("file.writtenToday", { t })
        : f.t("file.writtenDay", { d: f.date(day), t })}
    </p>
  )
}

/**
 * "Tallennettu 14.32" in the top bar (§8.2): the time this session last saved
 * or downloaded. It is absent while there are unsaved changes, where the dot
 * on the file button speaks instead, and before the first save. The text hides
 * below the `sm` width, where the bar has no room and the dot is enough.
 */
export function SavedClock() {
  const f = useFormatters()
  const lastSavedAt = useBookStore((s) => s.lastSavedAt)
  const dirty = useBookStore((s) => s.dirty)
  if (lastSavedAt === null || dirty) return null
  return (
    <span
      role="status"
      className="tabular hidden text-xs whitespace-nowrap text-muted-foreground sm:inline"
    >
      {f.t("file.savedAt", { t: clock(f, new Date(lastSavedAt)) })}
    </span>
  )
}

/** One line under the save status when the browser could not store the work. */
export function StorageNote() {
  const t = useT()
  const behind = useStorageBehind()
  if (!behind) return null
  return (
    <p className="text-xs text-muted-foreground">{t("file.storageNote")}</p>
  )
}

/** The status dot with its label (§8.2). */
export function FileStatus({ className }: { className?: string }) {
  const text = useFileStatusText()

  return (
    <div
      role="status"
      aria-label={text}
      className={cn("flex items-center gap-2 text-xs", className)}
    >
      <StatusDot />
      <span aria-hidden="true" className="truncate text-muted-foreground">
        {text}
      </span>
    </div>
  )
}
