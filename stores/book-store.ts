"use client"

import {
  normalizeHiddenColumns,
  toggleLedgerColumn,
  type OptionalLedgerColumn,
} from "@/lib/domain/ledger-columns"
import { create, type StateCreator } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"

import { defaultCategories } from "@/lib/domain/accounts"
import type { AssetOpening } from "@/lib/domain/assets"
import type { BankBalance } from "@/lib/domain/bank-balance"
import {
  DEFAULT_INVOICE_SETTINGS,
  type Customer,
  type Invoice,
  type InvoiceSettings,
} from "@/lib/domain/invoice"
import { NO_PAY_MONTHS, type PayMonths } from "@/lib/domain/tax-calendar"
import type { EntryCheck } from "@/lib/domain/entry-checks"
import type { CategoryRule } from "@/lib/domain/category-rules"
import type { RecurringEntry } from "@/lib/domain/recurring"
import { mergeCategories } from "@/lib/domain/settings-file"
import { assignVouchers, keepVoucher } from "@/lib/domain/voucher"
import {
  moveEuPurchasesToCategories,
  syncEuPurchase,
} from "@/lib/domain/eu-purchase-category"
import { uid } from "@/lib/domain/id"
import {
  DEFAULT_LAYOUT,
  type OverviewWidget,
} from "@/lib/domain/overview-layout"
import {
  capChangeLog,
  entryChanges,
  relinkChangeLog,
  type ChangeRecord,
} from "@/lib/domain/change-log"
import type { FigureRow } from "@/lib/domain/figure-vouchers"
import type { LoanOpening, YearEnd } from "@/lib/domain/form5-balance"
import type { PageSize } from "@/lib/domain/settings-file"
import { shareReceipts, sharePayment } from "@/lib/domain/split"
import { indexCategories } from "@/lib/domain/types"
import type {
  AmountMode,
  Category,
  Cents,
  Entry,
  EntryType,
  Lang,
} from "@/lib/domain/types"
import type { TraderType } from "@/lib/domain/open-items"
import { filterPeriod } from "@/lib/domain/period"
import { vatReport } from "@/lib/domain/vat"
import { applyHiddenFeatures, type Feature } from "@/lib/domain/features"
import {
  asPeriod,
  periodFromKey,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"
import {
  filingFigures,
  NO_TAX_PAYMENT,
  type TaxPayment,
} from "@/lib/domain/vat-filing"
import type { ArchiveStub } from "@/lib/domain/year-archive"
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
    | "atts"
  >
>

/** Voucher numbers, and each entry's EU status from its category (§6.9). */
function numbered(
  entries: readonly Entry[],
  cats: readonly Category[]
): Entry[] {
  return [...assignVouchers(syncEuPurchase(entries, cats))]
}

/** `after`, with a changed payment or receipt carried across the parts of a split (§8.4, §8.5). */
function shared(
  before: readonly Entry[],
  after: readonly Entry[],
  state: Pick<BookState, "cats" | "form5Filed">
): Entry[] {
  return shareReceipts(
    before,
    sharePayment(before, after, indexCategories(state.cats), state)
  )
}

/**
 * The vouchers behind one figure of a return, listed over whatever dialog or
 * view it was opened from (§8.18). The texts are already in the UI language;
 * the rows are what each voucher added when the figure was clicked.
 */
export interface FigureDrill {
  title: string
  /** The period or year the figure is for. */
  subtitle: string
  /** What the amount column holds: "Veroton", "Vero", "Verollinen". */
  amountLabel: string
  rows: readonly FigureRow[]
  /** The figure as the view or form shows it. */
  figure: Cents
  /** Why the vouchers may not add up to the figure, shown when they differ. */
  differenceNote?: string
}

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
  /** The settings a new bookkeeping is started with (§8.3). */
  | { kind: "setup" }
  /** The selected year's checks, Form 5 values and lock (§8.8). */
  | { kind: "year-end" }
  | { kind: "vat-return" }
  /** Every rule over the whole book (§8.23). */
  | { kind: "check-book" }
  /** The audit package of a range of days (§8.25). */
  | { kind: "audit-package" }
  /** The year-end figures typed in on Varat ja velat (§8.8). */
  | { kind: "year-end-figures" }
  | { kind: "form5-details" }
  /** Carve a part off an entry, as another category or VAT rate (§8.4). */
  | { kind: "split"; entryId: string }
  | { kind: "deduction"; which: "mileage" | "per-diem" | "home-office" }
  /** What carries into `year`, its starting figures and templates (§8.14). */
  | { kind: "new-year"; year: number }
  /** Add a month's recurring entries (§8.5). `month` is `"2026-10"`. */
  | { kind: "recurring"; month: string }
  /** Review a bank statement's rows before booking them (§8.16). */
  | { kind: "bank-import"; text: string; fileName: string }
  /** Write or read an invoice; `null` starts a new draft (§8.27). */
  | { kind: "invoice"; invoiceId: string | null }
  /** Add or change a customer; `null` adds one (§8.27). */
  | { kind: "customer"; customerId: string | null }
  /** Add a custom category (§8.10). */
  | { kind: "category-add" }
  /** Change a custom category's name, line or default VAT (§8.10). */
  | { kind: "category-edit"; id: string }
  /** Choose where a custom category's vouchers move before it goes (§8.10). */
  | { kind: "category-delete"; id: string }

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
  /** Ledger columns the user has hidden (§8.4). */
  ledgerHidden: OptionalLedgerColumn[]
  /** Desktop sidebar expanded or collapsed to icons (§8.2). */
  sidebarOpen: boolean
  /**
   * The language the bookkeeping is written out in (§7.1, §7.2). Saved in
   * settings.json, and unlike the UI language it belongs to the book: a file
   * opened in another browser is saved back in the shape it arrived in.
   */
  exportLang: Lang
  /** The business's own y-tunnus, or null (§8.10). Saved in settings.json. */
  businessId: string | null
  /** The business's own name, or null (§8.10). Saved in settings.json. */
  businessName: string | null
  /** The contact phone written to the VAT file as 042 (§8.7), or null. Saved in settings.json. */
  businessPhone: string | null
  /** How often the user files a VAT return (§6.5). Saved in settings.json. */
  vatPeriod: VatPeriodKind
  /** Which kind of sole trader keeps the book (§6.3). Saved in settings.json. */
  traderType: TraderType
  /** Features the user switched off (§8.26). Saved in settings.json. */
  hiddenFeatures: Feature[]
  /**
   * `"2026-10"`: the month the bookkeeping began (§8.10). No return is owed
   * for a period that ended before it. Null follows the first entry.
   */
  bookStart: string | null
  /** Period key → ISO date the return was marked as filed (§6.5). */
  vatFiled: Record<string, string>
  /**
   * Period key → the return's figures on the day it was marked filed (§6.5).
   * Saved in settings.json.
   */
  vatFiledFigures: Record<string, Record<string, number>>
  /** Where VAT is paid (§8.7). Saved in settings.json. */
  taxPayment: TaxPayment
  /**
   * Year (`"2025"`) → ISO date the user marked its material as stored away
   * (§8.12). Saved in settings.json.
   */
  yearsArchived: Record<string, string>
  /** Year → ISO date its Form 5 was marked as filed (§8.8). Saved in settings.json. */
  form5Filed: Record<string, string>
  /**
   * Year (`"2025"`) → where its entries went when it was archived (§8.19).
   * Saved in settings.json.
   */
  archives: Record<string, ArchiveStub>
  /**
   * The year this book is an archive of, or null for a working book. An
   * archive is read-only: the store refuses every change to the book's data
   * (§8.19). Saved as `archiveOf` in settings.json.
   */
  archiveYear: number | null
  /** The overview's widgets, in order (§8.12). Normalised where it is read. */
  overviewLayout: OverviewWidget[]
  /** Save to the linked file a moment after each change (§7.5). Opt-in. */
  autosave: boolean
  /** The file is written as an AES-encrypted ZIP (§7.8). Saved in settings.json. */
  encrypted: boolean
  /** Monthly templates (§8.5). Saved in settings.json. */
  recurring: RecurringEntry[]
  /** The user's rules for picking a category (§8.17). Saved in settings.json. */
  categoryRules: CategoryRule[]
  /** The balance the asset register starts from (§8.8). Saved in settings.json. */
  assetOpening: AssetOpening | null
  /** The bank balance as last read (§8.12). Saved in settings.json. */
  bankBalance: BankBalance | null
  /** The months YEL and advance tax instalments fall in (§8.22). Saved in settings.json. */
  payMonths: PayMonths
  /** The loans outstanding when the book starts (§6.8). Saved in settings.json. */
  loanOpening: LoanOpening | null
  /** Year → what the book cannot supply for Form 5 (§8.8). Saved in settings.json. */
  yearEnd: Record<string, YearEnd>
  /** The seller details and terms the invoices are written with (§8.27). Saved in settings.json. */
  invoiceSettings: InvoiceSettings
  /** The invoices, drafts and issued (§8.27). Saved in invoices.json. */
  invoices: Invoice[]
  /** The customer register (§8.27). Saved in customers.json. */
  customers: Customer[]
  /** What has happened to the entries, oldest first (§8.11). Saved in settings.json. */
  changeLog: ChangeRecord[]

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
  /**
   * When this session last finished a save or a download, on the device's
   * clock. Unlike `savedAt` it is set by a download too, and it is not the
   * file's own time. Not persisted: a reload has saved nothing yet.
   */
  lastSavedAt: number | null
  /** A save is in flight: packing a ZIP of receipts is not instant. */
  saving: boolean
  /**
   * Autosave found something it would have to ask about — no write
   * permission, a file changed outside the app, a file that is not a ZIP —
   * and stopped. A manual save, which may ask, starts it again.
   */
  autosavePaused: boolean
  /**
   * Writes in a row that autosave could not finish. The wait before the next
   * try doubles with each (`autosaveDelay`), and a count at
   * `AUTOSAVE_MAX_FAILURES` pauses autosave. Any save resets it. Not persisted.
   */
  autosaveFailures: number
  /**
   * The getting-started checklist is up on the overview (§8.15). Set by a new
   * bookkeeping, cleared by dismissing it, finishing it, or any other book
   * taking over. Not persisted: a reload drops it.
   */
  onboarding: boolean
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
  /** The figure whose vouchers are listed, over the dialog (§8.18). Not persisted. */
  figure: FigureDrill | null
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
}

export interface BookActions {
  setHydrated(partial: Partial<BookState>): void
  /** Start an empty bookkeeping, written out in `exportLang` (§7.1). */
  newBook(year: number, exportLang: Lang): void
  /**
   * Apply the settings the setup dialog collected (§8.3), all at once and
   * without marking the book dirty: a brand-new bookkeeping nobody has typed
   * into has nothing unsaved to warn about.
   */
  startBook(settings: {
    exportLang: Lang
    businessName: string | null
    businessId: string | null
    vatPeriod: VatPeriodKind
    traderType: TraderType
    hiddenFeatures: Feature[]
    bookStart: string | null
    autosave: boolean
  }): void
  /** Take the getting-started checklist off the overview (§8.15). */
  dismissOnboarding(): void
  closeBook(): void
  replaceBook(next: {
    entries: Entry[]
    cats: Category[]
    fileName: string | null
    year: number
    dirty: boolean
    fileHandle: FileSystemFileHandle | null
    savedAt: number | null
    /** Whether the archive was encrypted when it was read (§7.8). */
    encrypted?: boolean
    /** The year an archive file holds, or null for a working book (§8.19). */
    archiveYear?: number | null
    /** What the file's `invoices.json` and `customers.json` carried (§7.6). */
    invoices?: Invoice[]
    customers?: Customer[]
    /**
     * What the file's `settings.json` carried. A plain CSV has none: its
     * filed marks start empty and everything else stays as it was.
     */
    settings?: {
      exportLang?: Lang
      businessId?: string | null
      businessName?: string | null
      businessPhone?: string | null
      vatPeriod?: VatPeriodKind
      traderType?: TraderType
      hiddenFeatures?: Feature[]
      bookStart?: string | null
      vatFiled?: Record<string, string>
      vatFiledFigures?: Record<string, Record<string, number>>
      taxPayment?: TaxPayment
      yearsArchived?: Record<string, string>
      form5Filed?: Record<string, string>
      archives?: Record<string, ArchiveStub>
      recurring?: RecurringEntry[]
      categoryRules?: CategoryRule[]
      assetOpening?: AssetOpening | null
      bankBalance?: BankBalance | null
      payMonths?: PayMonths
      loanOpening?: LoanOpening | null
      yearEnd?: Record<string, YearEnd>
      invoiceSettings?: InvoiceSettings
      changeLog?: ChangeRecord[]
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
  /** Put deleted entries back. Ids already present are skipped. */
  restoreEntries(entries: readonly Entry[]): void
  /**
   * Replace the entries and categories with an earlier or later state of the
   * session's history (§8.20). Voucher numbers come back as they were.
   */
  restoreSnapshot(snapshot: {
    entries: readonly Entry[]
    cats: readonly Category[]
  }): void
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
  /**
   * The language the file is written in (§7.1). It changes the bytes a save
   * would produce, so unlike the UI language it marks the book dirty.
   */
  setExportLang(lang: Lang): void
  setVatPeriod(kind: VatPeriodKind): void
  setTraderType(kind: TraderType): void
  setHiddenFeatures(features: Feature[]): void
  /** `"2026-10"`, or null to follow the first entry. */
  setBusinessId(id: string | null): void
  setBusinessName(name: string | null): void
  setBusinessPhone(phone: string | null): void
  setBookStart(month: string | null): void
  /** Mark a period as filed on `date`, or clear the mark with null. */
  setVatFiled(key: string, date: string | null): void
  setTaxPayment(payment: TaxPayment): void
  /** Mark a closed year as stored away on `date`, or clear it with null. */
  setYearArchived(year: number, date: string | null): void
  setForm5Filed(year: number, date: string | null): void
  /**
   * Take an archived year out of the working book (§8.19): drop its entries,
   * record the stub and the mark, and roll the openings forward.
   */
  applyArchive(archive: {
    year: number
    stub: ArchiveStub
    removeIds: readonly string[]
    bookStart: string | null
    assetOpening: AssetOpening | null
    loanOpening: LoanOpening | null
  }): void
  setOverviewLayout(layout: OverviewWidget[]): void
  setAutosave(on: boolean): void
  /** Turn encryption on or off. The file no longer matches, so the book is dirty (§7.8). */
  setEncrypted(on: boolean): void
  setAutosavePaused(paused: boolean): void
  setAutosaveFailures(n: number): void
  upsertRecurring(template: RecurringEntry): void
  removeRecurring(id: string): void
  /** Add a rule at the end, or replace the one with the same id (§8.17). */
  upsertCategoryRule(rule: CategoryRule): void
  removeCategoryRule(id: string): void
  /** Move a rule one place earlier (-1) or later (1). The first match wins. */
  moveCategoryRule(id: string, step: -1 | 1): void
  setLoanOpening(loanOpening: LoanOpening | null): void
  setYearEnd(year: number, values: YearEnd): void
  setAssetOpening(opening: AssetOpening | null): void
  setBankBalance(balance: BankBalance | null): void
  setInvoiceSettings(settings: InvoiceSettings): void
  setInvoices(invoices: Invoice[]): void
  setCustomers(customers: Customer[]): void
  setPayMonths(months: PayMonths): void

  upsertCategory(category: Category): void
  removeCategory(id: string): void
  setCategories(cats: Category[]): void
  resetCategories(): void

  setMonth(month: MonthFilter): void
  setLedgerQuery(q: string): void
  setLedgerType(type: TypeFilter): void
  setLedgerCat(id: string): void
  setLedgerCheck(filter: CheckFilter): void
  toggleLedgerSort(key: LedgerSortKey): void
  setLedgerPage(page: number): void
  setLedgerSize(size: PageSize): void
  /** Show or hide one optional ledger column (§8.4). */
  setLedgerColumn(column: OptionalLedgerColumn, shown: boolean): void
  clearLedgerFilters(): void

  setCatQuery(q: string): void
  setCatType(type: TypeFilter): void
  toggleCatSort(key: CatSortKey): void
  setCatPage(page: number): void
  setCatSize(size: PageSize): void

  setVatIndex(index: number): void

  openDialog(dialog: DialogState): void
  closeDialog(): void
  openFigure(figure: FigureDrill): void
  closeFigure(): void
  setDraftAttachmentIds(ids: string[]): void
  requestGc(): void
}

export type BookStore = BookState & BookActions

function initialState(): BookState {
  return {
    open: false,
    entries: [],
    cats: defaultCategories(),
    year: new Date().getFullYear(),
    dirty: false,
    fileName: null,
    lastMode: "gross",
    lastType: "expense",
    ledgerSize: 10,
    ctSize: 25,
    ledgerHidden: [],
    sidebarOpen: true,
    exportLang: "fi",
    businessId: null,
    businessName: null,
    businessPhone: null,
    vatPeriod: "month",
    traderType: "professional",
    hiddenFeatures: [],
    bookStart: null,
    vatFiled: {},
    vatFiledFigures: {},
    taxPayment: NO_TAX_PAYMENT,
    yearsArchived: {},
    form5Filed: {},
    archives: {},
    archiveYear: null,
    overviewLayout: DEFAULT_LAYOUT.map((w) => ({ ...w })),
    autosave: false,
    encrypted: false,
    recurring: [],
    categoryRules: [],
    assetOpening: null,
    bankBalance: null,
    payMonths: NO_PAY_MONTHS,
    loanOpening: null,
    yearEnd: {},
    invoiceSettings: DEFAULT_INVOICE_SETTINGS,
    invoices: [],
    customers: [],
    changeLog: [],

    hydrated: false,
    importing: false,
    fileHandle: null,
    savedAt: null,
    lastSavedAt: null,
    saving: false,
    autosavePaused: false,
    autosaveFailures: 0,
    onboarding: false,
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
    figure: null,
    draftAttachmentIds: [],
    undoAttachmentIds: [],
    bookEpoch: 0,
    gcTick: 0,
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
  | "ledgerHidden"
  | "ctSize"
  | "sidebarOpen"
  | "exportLang"
  | "businessId"
  | "businessName"
  | "businessPhone"
  | "vatPeriod"
  | "traderType"
  | "hiddenFeatures"
  | "bookStart"
  | "vatFiled"
  | "vatFiledFigures"
  | "taxPayment"
  | "yearsArchived"
  | "form5Filed"
  | "archives"
  | "archiveYear"
  | "overviewLayout"
  | "autosave"
  | "encrypted"
  | "recurring"
  | "categoryRules"
  | "assetOpening"
  | "bankBalance"
  | "payMonths"
  | "loanOpening"
  | "yearEnd"
  | "invoiceSettings"
  | "invoices"
  | "customers"
  | "changeLog"
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
  lastSavedAt: null,
  encrypted: false,
  archiveYear: null,
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
}

/** The new entries and the log with what took them there (§8.11). */
function withLog(
  state: Pick<BookState, "entries" | "changeLog">,
  entries: Entry[],
  kind?: "restore"
): Pick<BookState, "entries" | "changeLog"> {
  const at = new Date().toISOString()
  return {
    entries,
    changeLog: capChangeLog([
      ...state.changeLog,
      ...entryChanges(state.entries, entries, at, kind),
    ]),
  }
}

/** A VAT period or a year marked or unmarked, which locks or unlocks its entries. */
function lockRecord(period: string, date: string | null): ChangeRecord {
  return {
    at: new Date().toISOString(),
    action: date ? "lock" : "unlock",
    period,
  }
}

/**
 * The fields that make up a bookkeeping's data. An archive book (§8.19)
 * refuses any change that touches one of them, so no action has to remember
 * to check. Filters, the selected year and the page state stay free.
 */
const BOOK_DATA_KEYS: readonly (keyof BookState)[] = [
  "entries",
  "cats",
  "dirty",
  "exportLang",
  "businessId",
  "businessName",
  "businessPhone",
  "vatPeriod",
  "traderType",
  "hiddenFeatures",
  "bookStart",
  "vatFiled",
  "vatFiledFigures",
  "taxPayment",
  "yearsArchived",
  "form5Filed",
  "archives",
  "recurring",
  "categoryRules",
  "assetOpening",
  "bankBalance",
  "payMonths",
  "loanOpening",
  "yearEnd",
  "invoiceSettings",
  "invoices",
  "customers",
  "changeLog",
  "encrypted",
  "overviewLayout",
  "autosave",
]

type BookCreator = StateCreator<BookStore, [["zustand/persist", unknown]], []>

/** Wraps `set` so an archive book drops any change to its data (§8.19). */
const readOnlyGuard =
  (creator: BookCreator): BookCreator =>
  (set, get, api) =>
    creator(
      (partial, replace) => {
        const next = typeof partial === "function" ? partial(get()) : partial
        if (
          get().archiveYear !== null &&
          !("archiveYear" in next) &&
          BOOK_DATA_KEYS.some((key) => key in next)
        ) {
          return
        }
        set(next, replace as false | undefined)
      },
      get,
      api
    )

/**
 * The dialogs an archive book may open: the ones that only show. Any other
 * opens nothing, since what it would do is refused anyway.
 */
function readOnlyDialog(dialog: DialogState): boolean {
  switch (dialog.kind) {
    case "none":
    case "viewer":
    case "export":
    case "vat-return":
    case "year-end":
    case "check-book":
    case "audit-package":
      return true
    case "entry":
      return dialog.mode === "edit"
    default:
      return false
  }
}

export const useBookStore = create<BookStore>()(
  persist(
    readOnlyGuard((set, get) => ({
      ...initialState(),

      setHydrated: (partial) => set({ ...partial, hydrated: true }),

      newBook: (year, exportLang) =>
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
           * A new book is born in the language the caller is working in; the
           * setup dialog can still change it before anything is written.
           */
          exportLang,
          /*
           * The filing period and the layout carry over as the user's habits;
           * the business's name and ID, the start month and the filed marks
           * belong to the bookkeeping.
           */
          businessId: null,
          businessName: null,
          businessPhone: null,
          hiddenFeatures: [],
          bookStart: null,
          vatFiled: {},
          vatFiledFigures: {},
          taxPayment: NO_TAX_PAYMENT,
          yearsArchived: {},
          form5Filed: {},
          archives: {},
          recurring: [],
          categoryRules: [],
          assetOpening: null,
          bankBalance: null,
          payMonths: NO_PAY_MONTHS,
          loanOpening: null,
          yearEnd: {},
          invoiceSettings: DEFAULT_INVOICE_SETTINGS,
          invoices: [],
          customers: [],
          changeLog: [],
          onboarding: true,
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        }),

      dismissOnboarding: () => set({ onboarding: false }),

      startBook: (settings) =>
        set((s) => ({
          ...settings,
          cats: applyHiddenFeatures(
            s.cats,
            s.hiddenFeatures,
            settings.hiddenFeatures
          ),
          vatIndex: clampVatIndex(
            get().vatIndex,
            get().vatPeriod,
            settings.vatPeriod
          ),
          autosavePaused: false,
          autosaveFailures: 0,
          lastSavedAt: null,
          dirty: false,
          dialog: { kind: "none" },
          figure: null,
        })),

      closeBook: () =>
        set({
          ...clearedFilters,
          ...unlinked,
          open: false,
          onboarding: false,
          entries: [],
          cats: defaultCategories(),
          dirty: false,
          businessId: null,
          businessName: null,
          businessPhone: null,
          bookStart: null,
          vatFiled: {},
          vatFiledFigures: {},
          taxPayment: NO_TAX_PAYMENT,
          yearsArchived: {},
          form5Filed: {},
          archives: {},
          recurring: [],
          categoryRules: [],
          assetOpening: null,
          bankBalance: null,
          payMonths: NO_PAY_MONTHS,
          loanOpening: null,
          yearEnd: {},
          invoiceSettings: DEFAULT_INVOICE_SETTINGS,
          invoices: [],
          customers: [],
          changeLog: [],
          dialog: { kind: "none" },
          figure: null,
          draftAttachmentIds: [],
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        }),

      replaceBook: (next) => {
        const s = next.settings ?? {}
        const vatPeriod = s.vatPeriod ?? get().vatPeriod
        const book = moveEuPurchasesToCategories(
          {
            entries: next.entries,
            recurring: s.recurring ?? [],
            cats: next.cats,
          },
          uid
        )
        const entries = [
          ...assignVouchers(syncEuPurchase(book.entries, book.cats)),
        ]
        set({
          ...clearedFilters,
          open: true,
          entries,
          cats: book.cats,
          fileName: next.fileName,
          fileHandle: next.fileHandle,
          savedAt: next.savedAt,
          year: next.year,
          dirty: next.dirty,
          encrypted: next.encrypted ?? false,
          /*
           * Book data, so it comes from the file or falls back to the default
           * rather than carrying over from the bookkeeping being replaced.
           */
          exportLang: s.exportLang ?? "fi",
          businessId: s.businessId ?? null,
          businessName: s.businessName ?? null,
          businessPhone: s.businessPhone ?? null,
          vatPeriod,
          vatIndex: clampVatIndex(get().vatIndex, get().vatPeriod, vatPeriod),
          traderType: s.traderType ?? "professional",
          hiddenFeatures: s.hiddenFeatures ?? [],
          bookStart: s.bookStart ?? null,
          vatFiled: s.vatFiled ?? {},
          vatFiledFigures: s.vatFiledFigures ?? {},
          taxPayment: { ...NO_TAX_PAYMENT, ...s.taxPayment },
          yearsArchived: s.yearsArchived ?? {},
          form5Filed: s.form5Filed ?? {},
          archives: s.archives ?? {},
          archiveYear: next.archiveYear ?? null,
          recurring: book.recurring,
          categoryRules: s.categoryRules ?? [],
          assetOpening: s.assetOpening ?? null,
          bankBalance: s.bankBalance ?? null,
          payMonths: { ...NO_PAY_MONTHS, ...s.payMonths },
          loanOpening: s.loanOpening ?? null,
          yearEnd: s.yearEnd ?? {},
          invoiceSettings: s.invoiceSettings ?? DEFAULT_INVOICE_SETTINGS,
          invoices: next.invoices ?? [],
          customers: next.customers ?? [],
          changeLog: s.changeLog
            ? relinkChangeLog(s.changeLog, entries)
            : [{ at: new Date().toISOString(), action: "import" }],
          overviewLayout: s.overviewLayout ?? get().overviewLayout,
          autosave: s.autosave ?? get().autosave,
          autosavePaused: false,
          autosaveFailures: 0,
          lastSavedAt: null,
          onboarding: false,
          ledgerSize: s.ledgerSize ?? get().ledgerSize,
          ctSize: s.ctSize ?? get().ctSize,
          undoAttachmentIds: [],
          bookEpoch: get().bookEpoch + 1,
          gcTick: get().gcTick + 1,
        })
      },

      upsertEntry: (entry) => {
        const before = get().entries
        const entries = [...before]
        const i = entries.findIndex((e) => e.id === entry.id)
        if (i >= 0) entries[i] = keepVoucher(entry, entries[i])
        else entries.push(entry)
        set({
          ...withLog(
            get(),
            numbered(shared(before, entries, get()), get().cats)
          ),
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      addEntries: (added) =>
        set({
          ...withLog(get(), numbered([...get().entries, ...added], get().cats)),
          dirty: true,
          gcTick: get().gcTick + 1,
        }),

      removeEntry: (id) =>
        set({
          ...withLog(
            get(),
            get().entries.filter((e) => e.id !== id)
          ),
          dirty: true,
          gcTick: get().gcTick + 1,
        }),

      removeEntries: (ids) => {
        const gone = new Set(ids)
        set({
          ...withLog(
            get(),
            get().entries.filter((e) => !gone.has(e.id))
          ),
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      updateEntries: (updated) => {
        const byId = new Map(updated.map((e) => [e.id, e]))
        const before = get().entries
        const entries = before.map((e) => {
          const next = byId.get(e.id)
          return next ? keepVoucher(next, e) : e
        })
        set({
          ...withLog(
            get(),
            numbered(shared(before, entries, get()), get().cats)
          ),
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },

      setVouchers: (numbers) => {
        const entries = get().entries.map((e) => {
          const voucher = numbers.get(e.id)
          return voucher === undefined ? e : { ...e, voucher }
        })
        set({
          ...withLog(get(), [...assignVouchers(entries)]),
          dirty: true,
        })
      },

      restoreEntries: (restored) => {
        const present = new Set(get().entries.map((e) => e.id))
        const back = restored.filter((e) => !present.has(e.id))
        if (back.length === 0) return
        /*
         * Restored entries go first, so they keep their numbers: a new entry
         * made in the meantime may have taken the newest one (§4).
         */
        set({
          ...withLog(
            get(),
            numbered([...back, ...get().entries], get().cats),
            "restore"
          ),
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },
      restoreSnapshot: ({ entries, cats }) =>
        set({
          ...withLog(get(), [...entries], "restore"),
          cats: [...cats],
          dirty: true,
          gcTick: get().gcTick + 1,
        }),
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
          autosaveFailures: 0,
          lastSavedAt: Date.now(),
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
      setExportLang: (exportLang) => set({ exportLang, dirty: true }),
      setVatPeriod: (vatPeriod) =>
        set({
          vatPeriod,
          vatIndex: clampVatIndex(get().vatIndex, get().vatPeriod, vatPeriod),
          dirty: true,
        }),
      setTraderType: (traderType) => set({ traderType, dirty: true }),
      setHiddenFeatures: (hiddenFeatures) =>
        set((s) => ({
          hiddenFeatures,
          cats: applyHiddenFeatures(s.cats, s.hiddenFeatures, hiddenFeatures),
          dirty: true,
        })),
      setBusinessId: (businessId) => set({ businessId, dirty: true }),
      setBusinessName: (businessName) => set({ businessName, dirty: true }),
      setBusinessPhone: (businessPhone) => set({ businessPhone, dirty: true }),
      setBookStart: (bookStart) => set({ bookStart, dirty: true }),
      setVatFiled: (key, date) => {
        const vatFiled = { ...get().vatFiled }
        const vatFiledFigures = { ...get().vatFiledFigures }
        if (date) {
          vatFiled[key] = date
          /* The figures are those of the book on the day it is marked. */
          const period = periodFromKey(key)
          if (period) {
            vatFiledFigures[key] = {
              ...filingFigures(
                vatReport(
                  filterPeriod(get().entries, asPeriod(period)),
                  indexCategories(get().cats)
                )
              ),
            }
          }
        } else {
          delete vatFiled[key]
          delete vatFiledFigures[key]
        }
        set({
          vatFiled,
          vatFiledFigures,
          changeLog: [...get().changeLog, lockRecord(key, date)],
          dirty: true,
        })
      },
      setForm5Filed: (year, date) => {
        const form5Filed = { ...get().form5Filed }
        if (date) form5Filed[String(year)] = date
        else delete form5Filed[String(year)]
        set({
          form5Filed,
          changeLog: [...get().changeLog, lockRecord(`form5-${year}`, date)],
          dirty: true,
        })
      },
      applyArchive: ({
        year,
        stub,
        removeIds,
        bookStart,
        assetOpening,
        loanOpening,
      }) => {
        const gone = new Set(removeIds)
        set({
          entries: get().entries.filter((e) => !gone.has(e.id)),
          archives: { ...get().archives, [String(year)]: stub },
          yearsArchived: { ...get().yearsArchived, [String(year)]: stub.on },
          bookStart,
          assetOpening,
          loanOpening,
          changeLog: [...get().changeLog, lockRecord(String(year), stub.on)],
          dirty: true,
          gcTick: get().gcTick + 1,
        })
      },
      setYearArchived: (year, date) => {
        const yearsArchived = { ...get().yearsArchived }
        if (date) yearsArchived[String(year)] = date
        else delete yearsArchived[String(year)]
        set({
          yearsArchived,
          changeLog: [...get().changeLog, lockRecord(String(year), date)],
          dirty: true,
        })
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
      upsertCategoryRule: (rule) => {
        const categoryRules = [...get().categoryRules]
        const i = categoryRules.findIndex((r) => r.id === rule.id)
        if (i >= 0) categoryRules[i] = rule
        else categoryRules.push(rule)
        set({ categoryRules, dirty: true })
      },
      removeCategoryRule: (id) =>
        set({
          categoryRules: get().categoryRules.filter((r) => r.id !== id),
          dirty: true,
        }),
      moveCategoryRule: (id, step) => {
        const categoryRules = [...get().categoryRules]
        const i = categoryRules.findIndex((r) => r.id === id)
        const j = i + step
        if (i < 0 || j < 0 || j >= categoryRules.length) return
        ;[categoryRules[i], categoryRules[j]] = [
          categoryRules[j],
          categoryRules[i],
        ]
        set({ categoryRules, dirty: true })
      },
      setAssetOpening: (assetOpening) => set({ assetOpening, dirty: true }),
      setBankBalance: (bankBalance) => set({ bankBalance, dirty: true }),
      setInvoiceSettings: (invoiceSettings) =>
        set({ invoiceSettings, dirty: true }),
      setInvoices: (invoices) => set({ invoices, dirty: true }),
      setCustomers: (customers) => set({ customers, dirty: true }),
      setPayMonths: (payMonths) => set({ payMonths, dirty: true }),
      setTaxPayment: (taxPayment) => set({ taxPayment, dirty: true }),
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
      setAutosave: (autosave) =>
        set({ autosave, autosavePaused: false, autosaveFailures: 0 }),
      setEncrypted: (encrypted) =>
        set({ encrypted, dirty: true, autosavePaused: false }),
      setAutosavePaused: (autosavePaused) =>
        set({
          autosavePaused,
          ...(autosavePaused ? { autosaveFailures: 0 } : {}),
        }),
      setAutosaveFailures: (autosaveFailures) => set({ autosaveFailures }),

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
        set((s) => ({
          cats: s.cats.filter((c) => c.id !== id),
          // The ledger's filter must not keep pointing at a category that is gone.
          ledgerCat: s.ledgerCat === id ? "all" : s.ledgerCat,
          dirty: true,
        })),
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

      setMonth: (month) => set({ month, ledgerPage: 1 }),
      setLedgerQuery: (ledgerQuery) => set({ ledgerQuery, ledgerPage: 1 }),
      setLedgerType: (ledgerType) => set({ ledgerType, ledgerPage: 1 }),
      setLedgerCat: (ledgerCat) => set({ ledgerCat, ledgerPage: 1 }),
      setLedgerCheck: (ledgerCheck) => set({ ledgerCheck, ledgerPage: 1 }),
      toggleLedgerSort: (key) =>
        set({ ledgerSort: nextSort(get().ledgerSort, key), ledgerPage: 1 }),
      setLedgerPage: (ledgerPage) => set({ ledgerPage }),
      setLedgerSize: (ledgerSize) => set({ ledgerSize, ledgerPage: 1 }),
      setLedgerColumn: (column, shown) =>
        set({
          ledgerHidden: toggleLedgerColumn(get().ledgerHidden, column, shown),
        }),
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

      openDialog: (dialog) => {
        if (get().archiveYear !== null && !readOnlyDialog(dialog)) return
        set({ dialog, figure: null })
      },
      openFigure: (figure) => set({ figure }),
      closeFigure: () => set({ figure: null }),
      closeDialog: () =>
        set({
          dialog: { kind: "none" },
          figure: null,
          draftAttachmentIds: [],
          gcTick: get().gcTick + 1,
        }),
      setDraftAttachmentIds: (draftAttachmentIds) =>
        set({ draftAttachmentIds }),
      requestGc: () => set({ gcTick: get().gcTick + 1 }),
    })),
    {
      name: BOOK_STORAGE_KEY,
      version: 11,
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
        ledgerHidden: s.ledgerHidden,
        ctSize: s.ctSize,
        sidebarOpen: s.sidebarOpen,
        exportLang: s.exportLang,
        businessId: s.businessId,
        businessName: s.businessName,
        businessPhone: s.businessPhone,
        vatPeriod: s.vatPeriod,
        traderType: s.traderType,
        hiddenFeatures: s.hiddenFeatures,
        bookStart: s.bookStart,
        vatFiled: s.vatFiled,
        vatFiledFigures: s.vatFiledFigures,
        taxPayment: s.taxPayment,
        yearsArchived: s.yearsArchived,
        form5Filed: s.form5Filed,
        archives: s.archives,
        archiveYear: s.archiveYear,
        overviewLayout: s.overviewLayout,
        autosave: s.autosave,
        encrypted: s.encrypted,
        recurring: s.recurring,
        categoryRules: s.categoryRules,
        assetOpening: s.assetOpening,
        bankBalance: s.bankBalance,
        payMonths: s.payMonths,
        loanOpening: s.loanOpening,
        yearEnd: s.yearEnd,
        invoiceSettings: s.invoiceSettings,
        invoices: s.invoices,
        customers: s.customers,
        changeLog: s.changeLog,
      }),
      /*
       * The default merge is shallow, so a stored `payMonths` from before the
       * advance tax fields would replace the whole object and leave them
       * undefined.
       */
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PersistedBook>
        return {
          ...current,
          ...stored,
          ledgerHidden: normalizeHiddenColumns(stored.ledgerHidden),
          payMonths: { ...NO_PAY_MONTHS, ...stored.payMonths },
          taxPayment: { ...NO_TAX_PAYMENT, ...stored.taxPayment },
        }
      },
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
        // A stored list may predate a default category or its current name (§5).
        if (Array.isArray(blob.cats)) {
          blob.cats = mergeCategories(blob.cats as Category[])
        }
        // An EU purchase marked on the entry moves to an EU category (§6.9).
        if (Array.isArray(blob.entries) && Array.isArray(blob.cats)) {
          const book = moveEuPurchasesToCategories(
            {
              entries: blob.entries as Entry[],
              recurring: Array.isArray(blob.recurring)
                ? (blob.recurring as RecurringEntry[])
                : [],
              cats: blob.cats as Category[],
            },
            uid
          )
          blob.entries = syncEuPurchase(book.entries, book.cats)
          blob.recurring = book.recurring
          blob.cats = book.cats
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
