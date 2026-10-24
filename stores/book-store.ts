"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { defaultCategories } from "@/lib/domain/accounts"
import type {
  AmountMode,
  Category,
  Entry,
  EntryType,
  Lang,
} from "@/lib/domain/types"

/**
 * The localStorage key holding the persisted slice below.
 *
 * Exported so the landing page can test for a first visit without hard-coding
 * the name a second time. The prototype-era key was `kirjanpito.v1`; nothing
 * migrates from it, so a browser that still holds one starts empty.
 *
 * Deliberately carries no version suffix: `persist` already writes its
 * `version` into the stored value and owns `migrate` below, which can actually
 * transform old data — a version in the key could only orphan it. A future
 * break that is not worth migrating renames the key to `bookkeeping.v2` then.
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
  "date" | "description" | "category" | "net" | "vat" | "gross"

export type CatSortKey = "enabled" | "side" | "account" | "name" | "vatRate"

export type DialogState =
  | { kind: "none" }
  | { kind: "entry"; mode: "new" | "edit" | "copy"; entryId?: string }
  | { kind: "viewer"; entryId: string; index: number }
  | { kind: "export" }

export interface BookState {
  // ---- persisted (CLAUDE.md §12) ----
  open: boolean
  entries: Entry[]
  cats: Category[]
  year: number
  dirty: boolean
  fileName: string | null
  lastMode: AmountMode
  lastType: EntryType
  lang: Lang
  ledgerSize: PageSize
  ctSize: PageSize

  // ---- ephemeral ----
  hydrated: boolean
  storageAvailable: boolean
  month: MonthFilter
  ledgerQuery: string
  ledgerType: TypeFilter
  ledgerCat: string
  ledgerSort: SortState<LedgerSortKey>
  ledgerPage: number
  catQuery: string
  catType: TypeFilter
  catSort: SortState<CatSortKey>
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
  }): void
  upsertEntry(entry: Entry): void
  removeEntry(id: string): void
  clearEntries(): void
  setYear(year: number): void
  setFileName(name: string | null): void
  markExported(fileName: string | null): void
  setLang(lang: Lang): void
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
    lang: "fi",
    ledgerSize: 10,
    ctSize: 25,

    hydrated: false,
    storageAvailable: true,
    month: 0,
    ledgerQuery: "",
    ledgerType: "all",
    ledgerCat: "all",
    ledgerSort: { key: "date", dir: 1 },
    ledgerPage: 1,
    catQuery: "",
    catType: "all",
    catSort: { key: "account", dir: 1 },
    catPage: 1,
    vatMode: "month",
    vatIndex: new Date().getMonth() + 1,
    dialog: { kind: "none" },
    draftAttachmentIds: [],
    gcTick: 0,
    catFormName: "",
  }
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
          open: true,
          entries: [],
          year,
          dirty: false,
          fileName: null,
          gcTick: get().gcTick + 1,
        }),

      closeBook: () =>
        set({
          ...clearedFilters,
          open: false,
          entries: [],
          dirty: false,
          fileName: null,
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
      markExported: (fileName) => set({ dirty: false, fileName }),
      setLang: (lang) => set({ lang }),
      setLastEntryDefaults: ({ mode, type }) =>
        set({ lastMode: mode, lastType: type }),

      // Category edits mark the book dirty: category names are written into
      // the exported CSV, so an exported file would otherwise go stale.
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
      toggleLedgerSort: (key) => {
        const current = get().ledgerSort
        set({
          ledgerSort:
            current.key === key
              ? { key, dir: current.dir === 1 ? -1 : 1 }
              : { key, dir: 1 },
          ledgerPage: 1,
        })
      },
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
      toggleCatSort: (key) => {
        const current = get().catSort
        set({
          catSort:
            current.key === key
              ? { key, dir: current.dir === 1 ? -1 : 1 }
              : { key, dir: 1 },
          catPage: 1,
        })
      },
      setCatPage: (catPage) => set({ catPage }),
      setCatSize: (ctSize) => set({ ctSize, catPage: 1 }),

      setVatMode: (vatMode) =>
        set({
          vatMode,
          // Clamp when switching into quarter mode (the prototype reset this
          // from today's date, which could land outside the selected year).
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
      version: 1,
      // Prerender must not touch localStorage; StoreHydrator rehydrates
      // after mount so the first client render matches the server HTML.
      skipHydration: true,
      partialize: (s) => ({
        entries: s.entries,
        cats: s.cats,
        year: s.year,
        dirty: s.dirty,
        fileName: s.fileName,
        lastMode: s.lastMode,
        lastType: s.lastType,
        lang: s.lang,
        open: s.open,
        ledgerSize: s.ledgerSize,
        ctSize: s.ctSize,
      }),
      migrate: (persisted) => {
        const blob = (persisted ?? {}) as Record<string, unknown>
        // The prototype kept `theme` in this blob. next-themes owns it now —
        // its pre-paint script reads its own key before any of our JS runs,
        // and two sources of truth would drift.
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
        return blob
      },
    }
  )
)
