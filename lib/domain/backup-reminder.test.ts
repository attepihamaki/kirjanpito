import { describe, expect, it } from "vitest"

import {
  backupReminder,
  BACKUP_DAYS_NO_FILE,
  BACKUP_DAYS_WITH_FILE,
  type BackupState,
} from "@/lib/domain/backup-reminder"

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date(2026, 10, 10, 12).getTime()
const TODAY = "2026-11-10"

const base: BackupState = {
  open: true,
  demo: false,
  archived: false,
  dirty: true,
  dirtySince: NOW - 10 * DAY,
  hasFile: true,
  snoozed: null,
}

describe("backupReminder", () => {
  it("reminds after a week of unsaved work on a book with a file", () => {
    expect(backupReminder(base, TODAY)).toEqual({
      days: 10,
      hasFile: true,
    })
    expect(
      backupReminder(
        { ...base, dirtySince: NOW - (BACKUP_DAYS_WITH_FILE - 1) * DAY },
        TODAY
      )
    ).toBeNull()
  })

  it("reminds sooner when no file was ever written", () => {
    const s = {
      ...base,
      hasFile: false,
      dirtySince: NOW - BACKUP_DAYS_NO_FILE * DAY,
    }
    expect(backupReminder(s, TODAY)).toEqual({
      days: BACKUP_DAYS_NO_FILE,
      hasFile: false,
    })
  })

  it("stays quiet for a saved, demo, archived or closed book", () => {
    expect(backupReminder({ ...base, dirty: false }, TODAY)).toBeNull()
    expect(backupReminder({ ...base, demo: true }, TODAY)).toBeNull()
    expect(backupReminder({ ...base, archived: true }, TODAY)).toBeNull()
    expect(backupReminder({ ...base, open: false }, TODAY)).toBeNull()
  })

  it("stays quiet until the snooze day", () => {
    expect(backupReminder({ ...base, snoozed: "2026-11-11" }, TODAY)).toBeNull()
    expect(backupReminder({ ...base, snoozed: TODAY }, TODAY)).not.toBeNull()
  })
})
