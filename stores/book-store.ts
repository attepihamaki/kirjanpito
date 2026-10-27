"use client"

import { create } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"

import { defaultCategories } from "@/lib/domain/accounts"
import type { AmountMode, Category, Entry, EntryType } from "@/lib/domain/types"
import { LANG_STORAGE_KEY, writeLang } from "@/stores/lang-store"

/**
 * The localStorage key holding the persisted slice below. Exported so the
 * landing page can test for a first visit without hard-coding the name twice.
 *
 * It carries no version suffix: `persist` writes its `version` into the stored
 * value and owns `migrate` below, which can transform old data. A future break
 * not worth migrating renames the key to `bookkeeping.v2`.
 */
export const BOOK_STORAGE_KEY = "bookkeeping"

export type PageSize = 10 | 25 | 50 | 100
export type MonthFilter = number // 0 = whole year, 1-12 = that month
export type TypeFilter = "all" | EntryType
export type VatMode = "month" | "quarter" | "year"

export interface SortState<K extends string> {
  key: K
  dir: 1 | -1
}

export type LedgerSortKey =
  "date" | "type" | "description" | "category" | "net" | "vat" | "gross"

export type CatSortKey = "enabled" | "side" | "account" | "name" | "vatRate"

/**
 * The order a table falls back to while no column is chosen — a `null` sort
 * state (§8.4). The sorting itself lives with the rows, so these are read
 * where the list is built, not where a header is clicked.
 */
export const LEDGER_SORT_DEFAULT: SortState<LedgerSortKey> = {
  key: "date",
  dir: 1,
}
export const CAT_SORT_DEFAULT: SortState<CatSortKey> = {
  key: "account",
  dir: 1,
}

/**
 * A column header cycles ascending → descending → no column chosen, so every
 * sort can be undone. The third state is `null` rather than the default order
 * spelled out: the column that order follows would otherwise never leave its
 * two directions, since returning to the default *is* that column ascending.
 * With `null`, every header reaches ⇅ and the rows fall back to the table's
 * own order.
 */
function nextSort<K extends string>(
  current: SortState<K> | null,
  key: K
): SortState<K> | null {
  if (current?.key !== key) return { key, dir: 1 }
  if (current.dir === 1) return { key, dir: -1 }
  return null
}

export type DialogState =
  | { kind: "none" }
  | {
      kind: "entry"
      mode: "new" | "edit" | "copy"
      entryId?: string
      /** Receipts dropped with no dialog open, attached as the dialog opens. */
      files?: File[]
    }
  | { kind: "viewer"; entryId: string; index: number }
  | { kind: "export" }

export interface BookState {
  // ---- persisted (CLAUDE.md §12) ----
  open: boolean
  entries: Entry[]
  cats: Category[]
  year: number
  dirty: boolean
  /**
   * The file this bookkeeping was last opened from or exported to, **with
   * its extension** (`kirjanpito_2026-10-24.zip`), for display only (§7.3).
   * Null until there has been one. The export dialog deliberately does not
   * seed its default from this.
   */
  fileName: string | null
  lastMode: AmountMode
  lastType: EntryType
  ledgerSize: PageSize
  ctSize: PageSize
  /** Desktop sidebar expanded or collapsed to icons (§8.2). */
  sidebarOpen: boolean

  // ---- ephemeral ----
  hydrated: boolean
  storageAvailable: boolean
  /**
   * A file is being read. Opening a plain CSV is over in milliseconds, but a
   * ZIP has to be unpacked, decoded and written to IndexedDB receipt by
   * receipt, which takes seconds and shows progress (§8.2). The flag also
   * guards re-entry: a second file dropped mid-import is ignored rather than
   * interleaving two `replaceBook` calls.
   */
  importing: boolean
  /**
   * The file this bookkeeping can be written back to (§7.5), or null when it
   * can't be — no File System Access API, or the file arrived through an
   * `<input>` or a drop, neither of which yields a handle. Never persisted to
   * localStorage: a handle is not JSON. It lives in IndexedDB instead and
   * `StoreHydrator` puts it back.
   */
  fileHandle: FileSystemFileHandle | null
  /**
   * What `fileHandle` held when this bookkeeping was last read or written, so
   * a save can tell whether something else has touched the file since.
   */
  savedAt: number | null
  /** A save is in flight: packing a ZIP of receipts is not instant. */
  saving: boolean
  month: MonthFilter
  ledgerQuery: string
  ledgerType: TypeFilter
  ledgerCat: string
  /** The column a header click chose, or null for the table's own order. */
  ledgerSort: SortState<LedgerSortKey> | null
  ledgerPage: number
  catQuery: string
  catType: TypeFilter
  catSort: SortState<CatSortKey> | null
  catPage: number
  vatMode: VatMode
  vatIndex: number
  dialog: DialogState
  /** Receipt ids held by the open entry dialog, protected from GC (§7.4). */
  draftAttachmentIds: string[]
  /** Bumped by every §7.4 trigger; the GC hook watches it. */
  gcTick: number
  /** The settings page's half-filled category name, for the §8.11 guard. */
  catFormName: string
}

export interface BookActions {
  setHydrated(partial: Partial<BookState>): void
  newBook(year: number): void
  closeBook(): void
  replaceBook(next: {
    entries: Entry[]
    cats: Category[]
    fileName: string | null
    year: number
    dirty: boolean
    fileHandle: FileSystemFileHandle | null
    savedAt: number | null
  }): void
  upsertEntry(entry: Entry): void
  removeEntry(id: string): void
  clearEntries(): void
  setYear(year: number): void
  setFileName(name: string | null): void
  /** Clear the dirty flag: the bookkeeping now exists in a file (§7.5). */
  markSaved(next: {
    fileName: string | null
    fileHandle?: FileSystemFileHandle | null
    savedAt?: number | null
  }): void
  /** Drop the link to the file without touching the bookkeeping (§7.5). */
  forgetFileHandle(): void
  setSidebarOpen(open: boolean): void
  setImporting(importing: boolean): void
  setSaving(saving: boolean): void
  setLastEntryDefaults(next: { mode: AmountMode; type: EntryType }): void

  upsertCategory(category: Category): void
  removeCategory(id: string): void
  setCategories(cats: Category[]): void
  resetCategories(): void
  setCatFormName(name: string): void

  setMonth(month: MonthFilter): void
  setLedgerQuery(q: string): void
  setLedgerType(type: TypeFilter): void
  setLedgerCat(id: string): void
  toggleLedgerSort(key: LedgerSortKey): void
  setLedgerPage(page: number): void
  setLedgerSize(size: PageSize): void
  clearLedgerFilters(): void

  setCatQuery(q: string): void
  setCatType(type: TypeFilter): void
  toggleCatSort(key: CatSortKey): void
  setCatPage(page: number): void
  setCatSize(size: PageSize): void

  setVatMode(mode: VatMode): void
  setVatIndex(index: number): void

  openDialog(dialog: DialogState): void
  closeDialog(): void
  setDraftAttachmentIds(ids: string[]): void
  requestGc(): void
}

export type BookStore = BookState & BookActions

const CURRENT_YEAR = new Date().getFullYear()

function initialState(): BookState {
  return {
    open: false,
    entries: [],
    cats: defaultCategories(),
    year: CURRENT_YEAR,
    dirty: false,
    fileName: null,
    lastMode: "gross",
    lastType: "expense",
    ledgerSize: 10,
    ctSize: 25,
    sidebarOpen: true,

    hydrated: false,
    storageAvailable: true,
    importing: false,
    fileHandle: null,
    savedAt: null,
    saving: false,
    month: 0,
    ledgerQuery: "",
    ledgerType: "all",
    ledgerCat: "all",
    ledgerSort: null,
    ledgerPage: 1,
    catQuery: "",
    catType: "all",
    catSort: null,
    catPage: 1,
    vatMode: "month",
    vatIndex: new Date().getMonth() + 1,
    dialog: { kind: "none" },
    draftAttachmentIds: [],
    gcTick: 0,
    catFormName: "",
  }
}

/** The slice written to `BOOK_STORAGE_KEY` (§12). */
type PersistedBook = Pick<
  BookState,
  | "entries"
  | "cats"
  | "year"
  | "dirty"
  | "fileName"
  | "lastMode"
  | "lastType"
  | "open"
  | "ledgerSize"
  | "ctSize"
  | "sidebarOpen"
>

/**
 * localStorage, with one rule: **only a bookkeeping creates the key.**
 *
 * The landing page and the 404 rehydrate this store to read the open file's
 * name and status, and rehydration is itself a state change, so without that
 * rule a visitor who only read the landing page would come away with the whole
 * default blob stored under their name. Once the key exists it is kept up to
 * date as usual, closed file included, so the page sizes and the sidebar state
 * survive a close.
 *
 * Every access is wrapped: storage can be absent, full or blocked (§12).
 */
const bookStorage: PersistStorage<PersistedBook> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      const hasBook = value.state.open || value.state.entries.length > 0
      if (!hasBook && localStorage.getItem(name) === null) return
      localStorage.setItem(name, JSON.stringify(value))
    } catch {
      // Storage unavailable or full; the session keeps working in memory.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // Nothing to do: there is no copy to remove.
    }
  },
}

/**
 * No file behind this bookkeeping any more. Closing or starting fresh must
 * drop the handle as well as the name, or the next save would write the new
 * bookkeeping over the old file.
 */
const unlinked = {
  fileName: null,
  fileHandle: null,
  savedAt: null,
}

/** Reset the filters that would otherwise survive a file switch (§8.11). */
const clearedFilters = {
  month: 0,
  ledgerQuery: "",
  ledgerType: "all" as TypeFilter,
  ledgerCat: "all",
  ledgerPage: 1,
  catQuery: "",
  catPage: 1,
  catFormName: "",
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setHydrated: (partial) => set({ ...partial, hydrated: true }),

      newBook: (year) =>
        set({
          ...clearedFilters,
          ...unlinked,
          open: true,
          entries: [],
          year,
          dirty: false,
          gcTick: get().gcTick + 1,
        }),

      closeBook: () =>
        set({
          ...clearedFilters,
          ...unlinked,
          open: false,
          entries: [],
          dirty: false,
          dialog: { kind: "none" },
          draftAttachmentIds: [],
          gcTick: get().gcTick + 1,
        }),

      replaceBook: (next) =>
        set({
          ...clearedFilters,
          open: true,
          entries: next.entries,
          cats: next.cats,
          fileName: next.fileName,
          fileHandle: next.fileHandle,
          savedAt: next.savedAt,
          year: next.year,
          dirty: next.dirty,
          gcTick: get().gcTick + 1,
        }),

      upsertEntry: (entry) => {
        const entries = [...get().entries]
        const i = entries.findIndex((e) => e.id === entry.id)
        if (i >= 0) entries[i] = entry
        else entries.push(entry)
        set({ entries, dirty: true, gcTick: get().gcTick + 1 })
      },

      removeEntry: (id) =>
        set({
          entries: get().entries.filter((e) => e.id !== id),
          dirty: true,
          gcTick: get().gcTick + 1,
        }),

      clearEntries: () =>
        set({
          entries: [],
          dirty: true,
          ledgerPage: 1,
          gcTick: get().gcTick + 1,
        }),

      setYear: (year) => set({ year, ledgerPage: 1 }),
      setFileName: (fileName) => set({ fileName }),
      markSaved: ({ fileName, fileHandle, savedAt }) =>
        set({
          dirty: false,
          fileName,
          // Downloading a copy leaves the linked file where it was.
          ...(fileHandle !== undefined ? { fileHandle } : {}),
          ...(savedAt !== undefined ? { savedAt } : {}),
        }),
      forgetFileHandle: () => set({ fileHandle: null, savedAt: null }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setImporting: (importing) => set({ importing }),
      setSaving: (saving) => set({ saving }),
      setLastEntryDefaults: ({ mode, type }) =>
        set({ lastMode: mode, lastType: type }),

      /*
       * Category edits mark the book dirty: category names are written into
       * the exported CSV, so an exported file would otherwise go stale.
       */
      upsertCategory: (category) => {
        const cats = [...get().cats]
        const i = cats.findIndex((c) => c.id === category.id)
        if (i >= 0) cats[i] = category
        else cats.push(category)
        set({ cats, dirty: true })
      },
      removeCategory: (id) =>
        set({ cats: get().cats.filter((c) => c.id !== id), dirty: true }),
      setCategories: (cats) => set({ cats, dirty: true }),
      resetCategories: () => {
        // Keep custom categories that entries still reference (§8.10).
        const used = new Set(get().entries.map((e) => e.catId))
        const keep = get().cats.filter((c) => c.custom && used.has(c.id))
        set({
          cats: [...defaultCategories(), ...keep],
          dirty: true,
          catPage: 1,
        })
      },
      setCatFormName: (catFormName) => set({ catFormName }),

      setMonth: (month) => set({ month, ledgerPage: 1 }),
      setLedgerQuery: (ledgerQuery) => set({ ledgerQuery, ledgerPage: 1 }),
      setLedgerType: (ledgerType) => set({ ledgerType, ledgerPage: 1 }),
      setLedgerCat: (ledgerCat) => set({ ledgerCat, ledgerPage: 1 }),
      toggleLedgerSort: (key) =>
        set({ ledgerSort: nextSort(get().ledgerSort, key), ledgerPage: 1 }),
      setLedgerPage: (ledgerPage) => set({ ledgerPage }),
      setLedgerSize: (ledgerSize) => set({ ledgerSize, ledgerPage: 1 }),
      clearLedgerFilters: () =>
        set({
          ledgerQuery: "",
          ledgerType: "all",
          ledgerCat: "all",
          ledgerPage: 1,
        }),

      setCatQuery: (catQuery) => set({ catQuery, catPage: 1 }),
      setCatType: (catType) => set({ catType, catPage: 1 }),
      toggleCatSort: (key) =>
        set({ catSort: nextSort(get().catSort, key), catPage: 1 }),
      setCatPage: (catPage) => set({ catPage }),
      setCatSize: (ctSize) => set({ ctSize, catPage: 1 }),

      setVatMode: (vatMode) =>
        set({
          vatMode,
          /*
           * Clamp the index into the new mode's range rather than resetting
           * it, so switching modes stays inside the selected year.
           */
          vatIndex:
            vatMode === "quarter"
              ? Math.min(Math.max(1, Math.ceil(get().vatIndex / 3)), 4)
              : vatMode === "month"
                ? Math.min(Math.max(1, get().vatIndex), 12)
                : get().vatIndex,
        }),
      setVatIndex: (vatIndex) => set({ vatIndex }),

      openDialog: (dialog) => set({ dialog }),
      closeDialog: () =>
        set({
          dialog: { kind: "none" },
          draftAttachmentIds: [],
          gcTick: get().gcTick + 1,
        }),
      setDraftAttachmentIds: (draftAttachmentIds) =>
        set({ draftAttachmentIds }),
      requestGc: () => set({ gcTick: get().gcTick + 1 }),
    }),
    {
      name: BOOK_STORAGE_KEY,
      version: 2,
      storage: bookStorage,
      /*
       * Prerender must not touch localStorage; StoreHydrator rehydrates after
       * mount so the first client render matches the server HTML.
       */
      skipHydration: true,
      partialize: (s): PersistedBook => ({
        entries: s.entries,
        cats: s.cats,
        year: s.year,
        dirty: s.dirty,
        fileName: s.fileName,
        lastMode: s.lastMode,
        lastType: s.lastType,
        open: s.open,
        ledgerSize: s.ledgerSize,
        ctSize: s.ctSize,
        sidebarOpen: s.sidebarOpen,
      }),
      migrate: (persisted) => {
        const blob = (persisted ?? {}) as Record<string, unknown>
        /*
         * Move the two app-level preferences out of this blob and into a key
         * of their own, seeding only a key that is still empty — the separate
         * key is the newer truth. `theme` belongs to next-themes, whose
         * pre-paint script reads it before any of our JS runs.
         */
        if (typeof blob.theme === "string") {
          try {
            if (!localStorage.getItem("theme")) {
              localStorage.setItem("theme", blob.theme)
            }
          } catch {
            // Storage unavailable; the theme falls back to system.
          }
          delete blob.theme
        }
        if (blob.lang === "fi" || blob.lang === "en") {
          try {
            if (!localStorage.getItem(LANG_STORAGE_KEY)) writeLang(blob.lang)
          } catch {
            // Storage unavailable; the language falls back to Finnish.
          }
          delete blob.lang
        }
        return blob as unknown as PersistedBook
      },
    }
  )
)
