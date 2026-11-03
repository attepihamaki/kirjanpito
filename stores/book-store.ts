"use client"

import { create } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"

import { defaultCategories } from "@/lib/domain/accounts"
import type { AssetOpening } from "@/lib/domain/assets"
import type { BankBalance } from "@/lib/domain/bank-balance"
import type { EntryCheck } from "@/lib/domain/entry-checks"
import type { RecurringEntry } from "@/lib/domain/recurring"
import { mergeCategories } from "@/lib/domain/settings-file"
import { assignVouchers, keepVoucher } from "@/lib/domain/voucher"
import {
  DEFAULT_LAYOUT,
  type OverviewWidget,
} from "@/lib/domain/overview-layout"
import type { LoanOpening, YearEnd } from "@/lib/domain/form5-balance"
import type { PageSize, TraderType } from "@/lib/domain/settings-file"
import type { AmountMode, Category, Entry, EntryType } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
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

export type { PageSize }
export type MonthFilter = number // 0 = whole year, 1-12 = that month
export type TypeFilter = "all" | EntryType
/** Entries that need a second look (§8.4), by the checks in `entry-checks.ts`. */
/** "open" is not a check: an unpaid invoice is ordinary (§8.4). */
export type CheckFilter = "all" | "open" | EntryCheck

export interface SortState<K extends string> {
  key: K
  dir: 1 | -1
}

export type LedgerSortKey =
  | "voucher"
  | "date"
  | "type"
  | "description"
  | "category"
  | "net"
  | "vat"
  | "gross"

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

/**
 * Carries the VAT view's month or quarter across a change of filing period,
 * so the view stays on the same part of the year rather than jumping to its
 * start. A year has no index to carry, so from there it follows today again.
 */
function clampVatIndex(
  index: number | null,
  from: VatPeriodKind,
  to: VatPeriodKind
): number | null {
  if (index === null || from === to) return index
  if (to === "year") return null
  return to === "quarter" ? Math.ceil(index / 3) : index * 3 - 2
}

/** What a new entry can be opened with. */
export type EntryPrefill = Partial<
  Pick<
    Entry,
    | "date"
    | "description"
    | "type"
    | "catId"
    | "amount"
    | "vatRate"
    | "amountMode"
    | "settles"
  >
>

export type DialogState =
  | { kind: "none" }
  | {
      kind: "entry"
      mode: "new" | "edit" | "copy"
      entryId?: string
      /** Receipts dropped with no dialog open, attached as the dialog opens. */
      files?: File[]
      /** Fields a new entry starts from, such as a VAT payment's (§6.6). */
      prefill?: EntryPrefill
    }
  | { kind: "viewer"; entryId: string; index: number }
  | { kind: "export" }
  /** Add a month's recurring entries (§8.5). `month` is `"2026-10"`. */
  | { kind: "recurring"; month: string }

export interface BookState {
  // ---- persisted (CLAUDE.md §12) ----
  open: boolean
  entries: Entry[]
  cats: Category[]
  year: number
  dirty: boolean
  /**
   * The file this bookkeeping was last opened from or exported to, **with
   * its extension** (`kirjanpito_2026-10-24.zip`), for display and for the
   * name the download dialog suggests (§7.3). Null until there has been one.
   */
  fileName: string | null
  lastMode: AmountMode
  lastType: EntryType
  ledgerSize: PageSize
  ctSize: PageSize
  /** Desktop sidebar expanded or collapsed to icons (§8.2). */
  sidebarOpen: boolean
  /** How often the user files a VAT return (§6.5). Saved in settings.json. */
  vatPeriod: VatPeriodKind
  /**
   * `"2026-10"`: the month the bookkeeping began (§8.10). No return is owed
   * for a period that ended before it. Null follows the first entry.
   */
  bookStart: string | null
  /** Period key → ISO date the return was marked as filed (§6.5). */
  vatFiled: Record<string, string>
  /**
   * Year (`"2025"`) → ISO date the user marked its material as stored away
   * (§8.12). Saved in settings.json.
   */
  yearsArchived: Record<string, string>
  /** The overview's widgets, in order (§8.12). Normalised where it is read. */
  overviewLayout: OverviewWidget[]
  /** Save to the linked file a moment after each change (§7.5). Opt-in. */
  autosave: boolean
  /** Monthly templates (§8.5). Saved in settings.json. */
  recurring: RecurringEntry[]
  /** Liikkeenharjoittaja or ammatinharjoittaja (§6.3). Saved in settings.json. */
  traderType: TraderType | null
  /** The balance the asset register starts from (§8.8). Saved in settings.json. */
  assetOpening: AssetOpening | null
  /** The bank balance as last read (§8.12). Saved in settings.json. */
  bankBalance: BankBalance | null
  /** The loans outstanding when the book starts (§6.8). Saved in settings.json. */
  loanOpening: LoanOpening | null
  /** Year → what the book cannot supply for Form 5 (§8.8). Saved in settings.json. */
  yearEnd: Record<string, YearEnd>

  // ---- ephemeral ----
  hydrated: boolean
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
   * `AppShell` puts it back.
   */
  fileHandle: FileSystemFileHandle | null
  /**
   * What `fileHandle` held when this bookkeeping was last read or written, so
   * a save can tell whether something else has touched the file since.
   */
  savedAt: number | null
  /** A save is in flight: packing a ZIP of receipts is not instant. */
  saving: boolean
  /**
   * Autosave found something it would have to ask about — no write
   * permission, a file changed outside the app, a file that is not a ZIP —
   * and stopped. A manual save, which may ask, starts it again.
   */
  autosavePaused: boolean
  month: MonthFilter
  ledgerQuery: string
  ledgerType: TypeFilter
  ledgerCat: string
  ledgerCheck: CheckFilter
  /** The column a header click chose, or null for the table's own order. */
  ledgerSort: SortState<LedgerSortKey> | null
  ledgerPage: number
  catQuery: string
  catType: TypeFilter
  catSort: SortState<CatSortKey> | null
  catPage: number
  /**
   * The month or quarter picked in the VAT view (§6.5), or null for the period
   * today falls in. Null rather than a number worked out at startup, because
   * the filing period it is an index of is not known until the store rehydrates.
   */
  vatIndex: number | null
  dialog: DialogState
  /** Receipt ids held by the open entry dialog, protected from GC (§7.4). */
  draftAttachmentIds: string[]
  /**
   * Receipt ids of deleted entries that an undo toast can still bring back,
   * protected from GC until the toast is gone (§8.11).
   */
  undoAttachmentIds: string[]
  /**
   * Bumped whenever a different bookkeeping takes over: new, closed or
   * opened from a file. An undo checks it, so it never restores entries
   * into a book they did not come from.
   */
  bookEpoch: number
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
    /**
     * What the file's `settings.json` carried. A plain CSV has none: its
     * filed marks start empty and everything else stays as it was.
     */
    settings?: {
      vatPeriod?: VatPeriodKind
      bookStart?: string | null
      vatFiled?: Record<string, string>
      yearsArchived?: Record<string, string>
      recurring?: RecurringEntry[]
      traderType?: TraderType | null
      assetOpening?: AssetOpening | null
      bankBalance?: BankBalance | null
      loanOpening?: LoanOpening | null
      yearEnd?: Record<string, YearEnd>
      overviewLayout?: OverviewWidget[]
      autosave?: boolean
      ledgerSize?: PageSize
      ctSize?: PageSize
    }
  }): void
  upsertEntry(entry: Entry): void
  /** Add several new entries at once, numbered after the book's own (§4). */
  addEntries(entries: readonly Entry[]): void
  removeEntry(id: string): void
  /** Remove several entries at once (§8.4). */
  removeEntries(ids: readonly string[]): void
  /**
   * Replace entries by id. An id no longer in the book is skipped, so an
   * undo cannot bring back an entry deleted since.
   */
  updateEntries(updated: readonly Entry[]): void
  /**
   * Set voucher numbers by entry id (§4). A number another entry of the year
   * already holds goes to the entry earlier in the book, and the other one
   * takes the next free number.
   */
  setVouchers(numbers: ReadonlyMap<string, number>): void
  clearEntries(): void
  /** Put deleted entries back. Ids already present are skipped. */
  restoreEntries(entries: readonly Entry[]): void
  holdUndoAttachments(ids: readonly string[]): void
  releaseUndoAttachments(ids: readonly string[]): void
  setYear(year: number): void
  /**
   * Record a write (§7.5). `dirty` is true when the book changed while the
   * file was being written, so what is on disk is already behind.
   */
  markSaved(next: {
    fileName: string | null
    fileHandle?: FileSystemFileHandle | null
    savedAt?: number | null
    dirty?: boolean
  }): void
  /** Drop the link to the file without touching the bookkeeping (§7.5). */
  forgetFileHandle(): void
  setSidebarOpen(open: boolean): void
  setImporting(importing: boolean): void
  setSaving(saving: boolean): void
  setLastEntryDefaults(next: { mode: AmountMode; type: EntryType }): void
  setVatPeriod(kind: VatPeriodKind): void
  /** `"2026-10"`, or null to follow the first entry. */
  setBookStart(month: string | null): void
  /** Mark a period as filed on `date`, or clear the mark with null. */
  setVatFiled(key: string, date: string | null): void
  /** Mark a closed year as stored away on `date`, or clear it with null. */
  setYearArchived(year: number, date: string | null): void
  setOverviewLayout(layout: OverviewWidget[]): void
  setAutosave(on: boolean): void
  setAutosavePaused(paused: boolean): void
  upsertRecurring(template: RecurringEntry): void
  removeRecurring(id: string): void
  setTraderType(traderType: TraderType | null): void
  setLoanOpening(loanOpening: LoanOpening | null): void
  setYearEnd(year: number, values: YearEnd): void
  setAssetOpening(opening: AssetOpening | null): void
  setBankBalance(balance: BankBalance | null): void

  upsertCategory(category: Category): void
  removeCategory(id: string): void
  setCategories(cats: Category[]): void
  resetCategories(): void
  setCatFormName(name: string): void

  setMonth(month: MonthFilter): void
  setLedgerQuery(q: string): void
  setLedgerType(type: TypeFilter): void
  setLedgerCat(id: string): void
  setLedgerCheck(filter: CheckFilter): void
  toggleLedgerSort(key: LedgerSortKey): void
  setLedgerPage(page: number): void
  setLedgerSize(size: PageSize): void
  clearLedgerFilters(): void

  setCatQuery(q: string): void
  setCatType(type: TypeFilter): void
  toggleCatSort(key: CatSortKey): void
  setCatPage(page: number): void
  setCatSize(size: PageSize): void

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
    vatPeriod: "month",
    bookStart: null,
    vatFiled: {},
    yearsArchived: {},
    overviewLayout: DEFAULT_LAYOUT.map((w) => ({ ...w })),
    autosave: false,
    recurring: [],
    traderType: null,
    assetOpening: null,
    bankBalance: null,
    loanOpening: null,
    yearEnd: {},

    hydrated: false,
    importing: false,
    fileHandle: null,
    savedAt: null,
    saving: false,
    autosavePaused: false,
    month: 0,
    ledgerQuery: "",
    ledgerType: "all",
    ledgerCat: "all",
    ledgerCheck: "all",
    ledgerSort: null,
    ledgerPage: 1,
    catQuery: "",
    catType: "all",
    catSort: null,
    catPage: 1,
    vatIndex: null,
    dialog: { kind: "none" },
    draftAttachmentIds: [],
    undoAttachmentIds: [],
    bookEpoch: 0,
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
  | "savedAt"
  | "lastMode"
  | "lastType"
  | "open"
  | "ledgerSize"
  | "ctSize"
  | "sidebarOpen"
  | "vatPeriod"
  | "bookStart"
  | "vatFiled"
  | "yearsArchived"
  | "overviewLayout"
  | "autosave"
  | "recurring"
  | "traderType"
  | "assetOpening"
  | "bankBalance"
  | "loanOpening"
  | "yearEnd"
>

/**
 * What was last written, to skip a write that would change nothing. The store
 * calls `setItem` on every state change, a keystroke in a search box included,
 * and most of those touch nothing that is persisted. Store actions replace
 * these fields rather than mutate them, so comparing identities is enough.
 */
let lastWritten: PersistedBook | null = null

function unchanged(next: PersistedBook): boolean {
  const last = lastWritten
  if (!last) return false
  return (Object.keys(next) as (keyof PersistedBook)[]).every(
    (key) => next[key] === last[key]
  )
}

/** Set when a write fails: from then on memory is newer than storage. */
let storageBehind = false
const storageBehindListeners = new Set<() => void>()

function setStorageBehind(next: boolean): void {
  if (next === storageBehind) return
  storageBehind = next
  for (const listener of storageBehindListeners) listener()
}

/**
 * Whether the last write to localStorage failed, so a reload would bring
 * back an older book than the one on screen. For `useSyncExternalStore`.
 */
export function isStorageBehind(): boolean {
  return storageBehind
}

export function subscribeStorageBehind(listener: () => void): () => void {
  storageBehindListeners.add(listener)
  return () => storageBehindListeners.delete(listener)
}

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
      // A failed write has to be retried even if the state went back.
      if (!storageBehind && unchanged(value.state)) return
      const hasBook = value.state.open || value.state.entries.length > 0
      if (!hasBook && localStorage.getItem(name) === null) return
      localStorage.setItem(name, JSON.stringify(value))
      lastWritten = value.state
      setStorageBehind(false)
    } catch {
      /*
       * Storage unavailable or full. The session keeps working in memory,
       * and useStorageWarning tells the user that only a file keeps it.
       */
      setStorageBehind(true)
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
  ledgerCheck: "all" as CheckFilter,
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
          // Custom categories and changed rates belong to the old file (§7.6).
          cats: defaultCategories(),
          year,
          dirty: false,
          /*
           * The filing period and the layout carry over as the user's habits;
           * the start month and filed marks belong to the bookkeeping.
           */
          bookStart: null,
          vatFiled: {},
          yearsArchived: {},
          recurring: [],
          traderType: null,
          assetOpening: null,
          bankBalance: null,
          loanOpening: null,
          yearEnd: {},
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        }),

      closeBook: () =>
        set({
          ...clearedFilters,
          ...unlinked,
          open: false,
          entries: [],
          cats: defaultCategories(),
          dirty: false,
          bookStart: null,
          vatFiled: {},
          yearsArchived: {},
          recurring: [],
          traderType: null,
          assetOpening: null,
          bankBalance: null,
          loanOpening: null,
          yearEnd: {},
          dialog: { kind: "none" },
          draftAttachmentIds: [],
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        }),

      replaceBook: (next) => {
        const s = next.settings ?? {}
        const vatPeriod = s.vatPeriod ?? get().vatPeriod
        set({
          ...clearedFilters,
          open: true,
          entries: [...assignVouchers(next.entries)],
          cats: next.cats,
          fileName: next.fileName,
          fileHandle: next.fileHandle,
          savedAt: next.savedAt,
          year: next.year,
          dirty: next.dirty,
          vatPeriod,
          vatIndex: clampVatIndex(get().vatIndex, get().vatPeriod, vatPeriod),
          bookStart: s.bookStart ?? null,
          vatFiled: s.vatFiled ?? {},
          yearsArchived: s.yearsArchived ?? {},
          recurring: s.recurring ?? [],
          traderType: s.traderType ?? null,
          assetOpening: s.assetOpening ?? null,
          bankBalance: s.bankBalance ?? null,
          loanOpening: s.loanOpening ?? null,
          yearEnd: s.yearEnd ?? {},
          overviewLayout: s.overviewLayout ?? get().overviewLayout,
          autosave: s.autosave ?? get().autosave,
          autosavePaused: false,
          ledgerSize: s.ledgerSize ?? get().ledgerSize,
          ctSize: s.ctSize ?? get().ctSize,
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        })
      },

      upsertEntry: (entry) => {
        const entries = [...get().entries]
        const i = entries.findIndex((e) => e.id === entry.id)
        if (i >= 0) entries[i] = keepVoucher(entry, entries[i])
        else entries.push(entry)
        set({
          entries: [...assignVouchers(entries)],
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      addEntries: (added) =>
        set({
          entries: [...assignVouchers([...get().entries, ...added])],
          dirty: true,
          gcTick: get().gcTick + 1,
        }),

      removeEntry: (id) =>
        set({
          entries: get().entries.filter((e) => e.id !== id),
          dirty: true,
          gcTick: get().gcTick + 1,
        }),

      removeEntries: (ids) => {
        const gone = new Set(ids)
        set({
          entries: get().entries.filter((e) => !gone.has(e.id)),
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      updateEntries: (updated) => {
        const byId = new Map(updated.map((e) => [e.id, e]))
        const entries = get().entries.map((e) => {
          const next = byId.get(e.id)
          return next ? keepVoucher(next, e) : e
        })
        set({
          entries: [...assignVouchers(entries)],
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      setVouchers: (numbers) => {
        const entries = get().entries.map((e) => {
          const voucher = numbers.get(e.id)
          return voucher === undefined ? e : { ...e, voucher }
        })
        set({ entries: [...assignVouchers(entries)], dirty: true })
      },

      clearEntries: () =>
        set({
          entries: [],
          dirty: true,
          ledgerPage: 1,
          gcTick: get().gcTick + 1,
        }),

      restoreEntries: (restored) => {
        const present = new Set(get().entries.map((e) => e.id))
        const back = restored.filter((e) => !present.has(e.id))
        if (back.length === 0) return
        /*
         * Restored entries go first, so they keep their numbers: a new entry
         * made in the meantime may have taken the newest one (§4).
         */
        set({
          entries: [...assignVouchers([...back, ...get().entries])],
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },
      holdUndoAttachments: (ids) =>
        set({ undoAttachmentIds: [...get().undoAttachmentIds, ...ids] }),
      releaseUndoAttachments: (ids) => {
        const gone = new Set(ids)
        set({
          undoAttachmentIds: get().undoAttachmentIds.filter(
            (id) => !gone.has(id)
          ),
          gcTick: get().gcTick + 1,
        })
      },

      setYear: (year) => set({ year, ledgerPage: 1 }),
      markSaved: ({ fileName, fileHandle, savedAt, dirty = false }) =>
        set({
          dirty,
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
       * These live in the file's settings.json, so changing one leaves
       * the file behind and marks the book dirty, as an entry edit does. The
       * VAT view shows the filing period, the period the user reports in.
       */
      setVatPeriod: (vatPeriod) =>
        set({
          vatPeriod,
          vatIndex: clampVatIndex(get().vatIndex, get().vatPeriod, vatPeriod),
          dirty: true,
        }),
      setBookStart: (bookStart) => set({ bookStart, dirty: true }),
      setVatFiled: (key, date) => {
        const vatFiled = { ...get().vatFiled }
        if (date) vatFiled[key] = date
        else delete vatFiled[key]
        set({ vatFiled, dirty: true })
      },
      setYearArchived: (year, date) => {
        const yearsArchived = { ...get().yearsArchived }
        if (date) yearsArchived[String(year)] = date
        else delete yearsArchived[String(year)]
        set({ yearsArchived, dirty: true })
      },
      setOverviewLayout: (overviewLayout) =>
        set({ overviewLayout, dirty: true }),
      upsertRecurring: (template) => {
        const recurring = [...get().recurring]
        const i = recurring.findIndex((r) => r.id === template.id)
        if (i >= 0) recurring[i] = template
        else recurring.push(template)
        set({ recurring, dirty: true })
      },
      removeRecurring: (id) =>
        set({
          recurring: get().recurring.filter((r) => r.id !== id),
          dirty: true,
        }),
      setTraderType: (traderType) => set({ traderType, dirty: true }),
      setAssetOpening: (assetOpening) => set({ assetOpening, dirty: true }),
      setBankBalance: (bankBalance) => set({ bankBalance, dirty: true }),
      setLoanOpening: (loanOpening) => set({ loanOpening, dirty: true }),
      setYearEnd: (year, values) =>
        set((s) => ({
          yearEnd: { ...s.yearEnd, [year]: values },
          dirty: true,
        })),
      /*
       * A preference, like the language: it travels in settings.json but
       * turning it on or off does not change the bookkeeping.
       */
      setAutosave: (autosave) => set({ autosave, autosavePaused: false }),
      setAutosavePaused: (autosavePaused) => set({ autosavePaused }),

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
        // Keep custom categories still in use (§8.10).
        const used = new Set([
          ...get().entries.map((e) => e.catId),
          ...get().recurring.map((r) => r.catId),
        ])
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
      setLedgerCheck: (ledgerCheck) => set({ ledgerCheck, ledgerPage: 1 }),
      toggleLedgerSort: (key) =>
        set({ ledgerSort: nextSort(get().ledgerSort, key), ledgerPage: 1 }),
      setLedgerPage: (ledgerPage) => set({ ledgerPage }),
      setLedgerSize: (ledgerSize) => set({ ledgerSize, ledgerPage: 1 }),
      clearLedgerFilters: () =>
        set({
          ledgerQuery: "",
          ledgerType: "all",
          ledgerCat: "all",
          ledgerCheck: "all",
          ledgerPage: 1,
        }),

      setCatQuery: (catQuery) => set({ catQuery, catPage: 1 }),
      setCatType: (catType) => set({ catType, catPage: 1 }),
      toggleCatSort: (key) =>
        set({ catSort: nextSort(get().catSort, key), catPage: 1 }),
      setCatPage: (catPage) => set({ catPage }),
      setCatSize: (ctSize) => set({ ctSize, catPage: 1 }),

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
      version: 8,
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
        savedAt: s.savedAt,
        lastMode: s.lastMode,
        lastType: s.lastType,
        open: s.open,
        ledgerSize: s.ledgerSize,
        ctSize: s.ctSize,
        sidebarOpen: s.sidebarOpen,
        vatPeriod: s.vatPeriod,
        bookStart: s.bookStart,
        vatFiled: s.vatFiled,
        yearsArchived: s.yearsArchived,
        overviewLayout: s.overviewLayout,
        autosave: s.autosave,
        recurring: s.recurring,
        traderType: s.traderType,
        assetOpening: s.assetOpening,
        bankBalance: s.bankBalance,
        loanOpening: s.loanOpening,
        yearEnd: s.yearEnd,
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
        // Entries stored before voucher numbers get theirs in date order (§4).
        if (Array.isArray(blob.entries)) {
          blob.entries = assignVouchers(blob.entries as Entry[])
        }
        // A stored list may predate a default category (§5).
        if (Array.isArray(blob.cats)) {
          blob.cats = mergeCategories(blob.cats as Category[])
        }
        return blob as unknown as PersistedBook
      },
    }
  )
)

/**
 * Pick up what another tab wrote before this one took over the bookkeeping
 * (§12). Skipped when this tab's own last write failed, since storage then
 * holds an older book than memory does.
 */
export function syncBookFromStorage(): void {
  if (!storageBehind) void useBookStore.persist.rehydrate()
}
