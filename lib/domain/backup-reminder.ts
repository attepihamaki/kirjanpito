import { daysBetween, todayIso } from "@/lib/domain/dates"

/**
 * When to remind the user that their latest work is only in the browser
 * (§8.33). The browser is a working buffer, not the record (§1): storage can
 * be cleared by the browser, by a cleanup tool or by the user, and the file is
 * the copy that survives that.
 */

/** Days of unsaved work before the reminder, when the book has a file on disk. */
export const BACKUP_DAYS_WITH_FILE = 7

/** The same for a book never written to any file, whose only copy is the browser. */
export const BACKUP_DAYS_NO_FILE = 2

export interface BackupState {
  open: boolean
  demo: boolean
  /** An archive book is read-only and has nothing to save (§8.19). */
  archived: boolean
  dirty: boolean
  dirtySince: number | null
  /** The book has been opened from, saved to or downloaded as a file. */
  hasFile: boolean
  /** ISO day the reminder is hidden until, or null. */
  snoozed: string | null
}

export interface BackupReminder {
  /** Calendar days since the work stopped being saved. */
  days: number
  /** Whether there is a file on disk at all. */
  hasFile: boolean
}

/**
 * The reminder to show on `today`, or null for none. Days are counted by the
 * calendar on the device's clock, so the banner changes only at midnight.
 */
export function backupReminder(
  s: BackupState,
  today: string
): BackupReminder | null {
  if (!s.open || s.demo || s.archived || !s.dirty || s.dirtySince === null) {
    return null
  }
  if (s.snoozed !== null && today < s.snoozed) return null
  const days = daysBetween(todayIso(new Date(s.dirtySince)), today)
  const limit = s.hasFile ? BACKUP_DAYS_WITH_FILE : BACKUP_DAYS_NO_FILE
  return days >= limit ? { days, hasFile: s.hasFile } : null
}
